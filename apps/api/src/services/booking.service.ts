import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { withRetry } from '../utils/retry';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateBookingData {
  userId: string;
  showtimeId: string;
  showtimeSeatIds: string[];
}

export class BookingService {
  /**
   * ENTERPRISE: Create booking with locked seats
   * 
   * Creates PENDING booking. Confirmation happens via payment webhook.
   * Does NOT modify seat status or delete locks.
   */
  async createBooking(data: CreateBookingData) {
    const { userId, showtimeId, showtimeSeatIds } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate showtime exists
      const showtime = await tx.showtime.findUnique({
        where: { id: showtimeId },
        include: {
          screen: {
            include: {
              theater: true,
            },
          },
        },
      });

      if (!showtime) {
        throw new Error('Showtime not found');
      }

      // 2. Validate theater is approved
      if (showtime.screen.theater.status !== 'APPROVED') {
        throw new Error('Theater not approved');
      }

      // 3. Fetch seats with locks
      const seats = await tx.showtimeSeat.findMany({
        where: {
          id: { in: showtimeSeatIds },
          showtimeId,
        },
        include: {
          seat: true,
          seatLocks: true,
        },
      });

      if (seats.length !== showtimeSeatIds.length) {
        throw new Error('One or more seats not found');
      }

      // 4. Validate all seats are AVAILABLE
      for (const seat of seats) {
        if (seat.status === 'BOOKED') {
          throw new Error('One or more seats already booked');
        }
      }

      // 5. Validate locks exist and belong to user
      const now = new Date();
      for (const seat of seats) {
        const lock = seat.seatLocks[0];

        if (!lock) {
          throw new Error('Lock missing for seat');
        }

        if (lock.expiresAt <= now) {
          throw new Error('Lock expired');
        }

        if (lock.userId !== userId) {
          throw new Error('Lock ownership mismatch');
        }
      }

      // 6. Calculate total amount
      const totalAmount = seats.reduce(
        (sum, seat) => sum.add(seat.seat.price),
        new Decimal(0)
      );

      // 7. Generate unique booking code
      const bookingCode = this.generateBookingCode();

      // 8. Create booking (PENDING status)
      const booking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          showtimeId,
          totalAmount,
          status: 'PENDING',
        },
      });

      // 9. Create booking seats
      await tx.bookingSeat.createMany({
        data: seats.map((seat) => ({
          bookingId: booking.id,
          showtimeSeatId: seat.id,
          price: seat.seat.price,
        })),
      });

      logger.info(
        {
          bookingId: booking.id,
          bookingCode,
          userId,
          showtimeId,
          seatCount: seats.length,
          totalAmount: totalAmount.toString(),
        },
        'Booking created (pending payment)'
      );

      return booking;
    });
  }

  /**
   * ENTERPRISE: Confirm booking after payment success
   * 
   * Called by payment webhook. Atomic operation:
   * - Validates locks still valid
   * - Updates seat status to BOOKED
   * - Deletes locks
   * - Confirms booking
   * 
   * CRITICAL: No nested transactions. This is a top-level transaction.
   */
  async confirmBooking(bookingId: string, userId: string) {
    return await withRetry(
      () => this.confirmBookingInternal(bookingId, userId),
      {
        operation: 'confirmBooking',
        userId,
        metadata: { bookingId },
      }
    );
  }

  /**
   * ENTERPRISE: Internal booking confirmation with SERIALIZABLE isolation
   */
  private async confirmBookingInternal(bookingId: string, userId: string) {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Fetch booking with seats
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            bookingSeats: true,
          },
        });

        if (!booking) {
          throw new Error('Booking not found');
        }

        if (booking.userId !== userId) {
          throw new Error('Booking not found'); // 404, not 403
        }

        if (booking.status === 'CONFIRMED') {
          // Idempotent: already confirmed
          return booking;
        }

        if (booking.status === 'CANCELLED') {
          throw new Error('Booking already cancelled');
        }

        const showtimeSeatIds = booking.bookingSeats.map((bs) => bs.showtimeSeatId);

        // 2. ENTERPRISE: Batch fetch all locks
        const locks = await tx.seatLock.findMany({
          where: {
            showtimeSeatId: { in: showtimeSeatIds },
          },
        });

        // 3. ENTERPRISE: Validate lock count
        if (locks.length !== showtimeSeatIds.length) {
          throw new Error('Lock missing for one or more seats');
        }

        // 4. ENTERPRISE: Validate set equality (not just count)
        const lockSeatIds = new Set(locks.map((l) => l.showtimeSeatId));
        for (const seatId of showtimeSeatIds) {
          if (!lockSeatIds.has(seatId)) {
            throw new Error('Lock missing for seat');
          }
        }

        // 5. ENTERPRISE: Validate ownership and expiration
        const now = new Date();
        for (const lock of locks) {
          if (lock.expiresAt <= now) {
            throw new Error('Lock expired before confirmation');
          }
          if (lock.userId !== userId) {
            throw new Error('Lock ownership mismatch');
          }
        }

        // 6. ENTERPRISE: Conditional update with defense in depth
        const updateResult = await tx.showtimeSeat.updateMany({
          where: {
            id: { in: showtimeSeatIds },
            status: 'AVAILABLE', // CRITICAL: Only update if still available
          },
          data: {
            status: 'BOOKED',
          },
        });

        // 7. ENTERPRISE: Verify all seats were updated
        if (updateResult.count !== showtimeSeatIds.length) {
          throw new Error('One or more seats already booked during confirmation');
        }

        // 8. ENTERPRISE: Batch delete locks
        await tx.seatLock.deleteMany({
          where: {
            showtimeSeatId: { in: showtimeSeatIds },
          },
        });

        // 9. ENTERPRISE: Conditional booking confirmation (webhook idempotency)
        const confirmedBooking = await tx.booking.updateMany({
          where: {
            id: bookingId,
            status: 'PENDING', // CRITICAL: Only confirm if still pending
          },
          data: { status: 'CONFIRMED' },
        });

        // Verify booking was updated (idempotency check)
        if (confirmedBooking.count === 0) {
          // Already confirmed by previous webhook - idempotent
          const existing = await tx.booking.findUnique({ where: { id: bookingId } });
          if (existing?.status === 'CONFIRMED') {
            logger.info({ bookingId, userId }, 'Booking already confirmed (idempotent)');
            return existing;
          }
          throw new Error('Booking status invalid for confirmation');
        }

        // Fetch confirmed booking
        const finalBooking = await tx.booking.findUnique({ where: { id: bookingId } });

        logger.info(
          {
            bookingId,
            bookingCode: booking.bookingCode,
            userId,
            seatCount: showtimeSeatIds.length,
          },
          'Booking confirmed successfully'
        );

        return finalBooking!;
      },
      {
        isolationLevel: 'Serializable', // MANDATORY
      }
    );
  }

  /**
   * ENTERPRISE: Cancel booking
   * 
   * Releases locks if booking is still PENDING.
   * Cannot cancel CONFIRMED bookings.
   */
  async cancelBooking(bookingId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          bookingSeats: true,
        },
      });

      if (!booking || booking.userId !== userId) {
        throw new Error('Booking not found');
      }

      if (booking.status === 'CONFIRMED') {
        throw new Error('Cannot cancel confirmed booking');
      }

      if (booking.status === 'CANCELLED') {
        // Idempotent
        return booking;
      }

      // Delete locks if they exist
      const showtimeSeatIds = booking.bookingSeats.map((bs) => bs.showtimeSeatId);
      await tx.seatLock.deleteMany({
        where: {
          showtimeSeatId: { in: showtimeSeatIds },
        },
      });

      // Cancel booking
      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      logger.info(
        {
          bookingId,
          userId,
        },
        'Booking cancelled'
      );

      return cancelledBooking;
    });
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        showtime: {
          include: {
            movie: true,
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
    });

    if (!booking || booking.userId !== userId) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        bookingSeats: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        showtime: {
          include: {
            movie: true,
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings;
  }

  /**
   * Generate unique booking code
   */
  private generateBookingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default new BookingService();
