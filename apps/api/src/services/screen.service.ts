import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { Decimal } from '@prisma/client/runtime/library';

interface SeatConfig {
  rowLabel: string;
  seatNumber: number;
  seatType: 'REGULAR' | 'PREMIUM' | 'RECLINER';
  price: string; // Decimal as string
}

interface CreateScreenData {
  name: string;
  theaterId: string;
  ownerId: string; // For ownership validation
  seats: SeatConfig[]; // Fully explicit layout
}

interface UpdateScreenData {
  name?: string;
  // NO layout updates allowed
}

export class ScreenService {
  // ENTERPRISE: Configuration constants
  private readonly MAX_SEATS_PER_SCREEN = 1000;
  private readonly MIN_PRICE = 0;
  private readonly MAX_PRICE = 9999.99;

  /**
   * ENTERPRISE: Validate seat configuration
   * Enforces: row label format, seat number, price range
   */
  private validateSeatConfig(seat: SeatConfig, index: number): void {
    // Row label validation: 1-3 uppercase alphanumeric characters
    if (!/^[A-Z0-9]{1,3}$/.test(seat.rowLabel)) {
      throw new Error(
        `Invalid row label at seat ${index + 1}: "${seat.rowLabel}". Must be 1-3 uppercase alphanumeric characters.`
      );
    }

    // Seat number validation
    if (seat.seatNumber < 1 || seat.seatNumber > 999) {
      throw new Error(`Invalid seat number at seat ${index + 1}: ${seat.seatNumber}. Must be between 1 and 999.`);
    }

    // Price validation: must be valid decimal string
    const priceRegex = /^\d+\.\d{2}$/;
    if (!priceRegex.test(seat.price)) {
      throw new Error(
        `Invalid price format at seat ${index + 1}: "${seat.price}". Must be in format XX.XX (e.g., "10.00")`
      );
    }

    // Convert to number for range validation
    const priceNum = parseFloat(seat.price);
    if (isNaN(priceNum)) {
      throw new Error(`Invalid price at seat ${index + 1}: "${seat.price}"`);
    }

    if (priceNum < this.MIN_PRICE) {
      throw new Error(
        `Price at seat ${index + 1} must be >= ${this.MIN_PRICE.toFixed(2)}. Got: ${seat.price}`
      );
    }

    if (priceNum > this.MAX_PRICE) {
      throw new Error(
        `Price at seat ${index + 1} must be <= ${this.MAX_PRICE.toFixed(2)}. Got: ${seat.price}`
      );
    }
  }

  /**
   * ENTERPRISE: Create screen with explicit seat layout
   * Invariants enforced:
   * - Theater must be APPROVED
   * - Owner must own theater
   * - No duplicate seats in layout
   * - Capacity derived from seat count
   * - Max seats per screen enforced
   * - Price and row label validation
   * - Atomic transaction
   */
  async createScreen(data: CreateScreenData) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify theater exists, is approved, and owned by user
      const theater = await tx.theater.findUnique({
        where: { id: data.theaterId },
      });

      if (!theater) {
        throw new Error('Theater not found');
      }

      if (theater.ownerId !== data.ownerId) {
        throw new Error('Theater not found'); // 404, not 403
      }

      if (theater.status !== 'APPROVED') {
        throw new Error('Theater must be approved before adding screens');
      }

      // 2. Check for duplicate screen name within theater
      const existing = await tx.screen.findUnique({
        where: {
          theaterId_name: {
            theaterId: data.theaterId,
            name: data.name,
          },
        },
      });

      if (existing) {
        throw new Error('Screen name already exists in this theater');
      }

      // 3. ENTERPRISE: Volume guard - prevent DOS
      if (data.seats.length > this.MAX_SEATS_PER_SCREEN) {
        throw new Error(
          `Screen cannot have more than ${this.MAX_SEATS_PER_SCREEN} seats. Got: ${data.seats.length}`
        );
      }

      // 4. ENTERPRISE: Validate each seat configuration
      data.seats.forEach((seat, index) => {
        this.validateSeatConfig(seat, index);
      });

      // 5. ENTERPRISE: Validate seat layout for duplicates
      const seen = new Set<string>();
      for (const seat of data.seats) {
        const key = `${seat.rowLabel}-${seat.seatNumber}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate seat: ${seat.rowLabel}${seat.seatNumber}`);
        }
        seen.add(key);
      }

      // 6. ENTERPRISE: Derive capacity from seat count (never trust client)
      const capacity = data.seats.length;

      if (capacity === 0) {
        throw new Error('Screen must have at least one seat');
      }

      // 7. Create screen
      const screen = await tx.screen.create({
        data: {
          name: data.name,
          theaterId: data.theaterId,
          capacity, // Derived, not from client
        },
      });

      // 8. Create seats atomically with validated data
      await tx.seat.createMany({
        data: data.seats.map((seat) => ({
          screenId: screen.id,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
          price: seat.price, // Validated format, Prisma handles Decimal conversion
        })),
      });

      logger.info(
        {
          screenId: screen.id,
          theaterId: data.theaterId,
          capacity,
          seatCount: data.seats.length,
        },
        'Screen created with seats'
      );

      return screen;
    });
  }

  /**
   * ENTERPRISE: Update screen (name only)
   * Invariant: Cannot modify layout if showtimes exist
   */
  async updateScreen(id: string, ownerId: string, data: UpdateScreenData) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify screen exists and ownership
      const screen = await tx.screen.findUnique({
        where: { id },
        include: { theater: true },
      });

      if (!screen || screen.theater.ownerId !== ownerId) {
        throw new Error('Screen not found'); // 404, not 403
      }

      // 2. ENTERPRISE: Block ANY modification if showtimes exist
      // Check showtimes, NOT bookings
      const showtimeCount = await tx.showtime.count({
        where: { screenId: id },
      });

      if (showtimeCount > 0) {
        throw new Error('Cannot modify screen after showtimes exist');
      }

      // 3. Update only name (no layout changes)
      const updated = await tx.screen.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
        },
      });

      logger.info({ screenId: id }, 'Screen updated');
      return updated;
    });
  }

  /**
   * ENTERPRISE: Delete screen
   * Invariant: Cannot delete if showtimes exist
   */
  async deleteScreen(id: string, ownerId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify screen exists and ownership
      const screen = await tx.screen.findUnique({
        where: { id },
        include: { theater: true },
      });

      if (!screen || screen.theater.ownerId !== ownerId) {
        throw new Error('Screen not found'); // 404, not 403
      }

      // 2. ENTERPRISE: Block deletion if showtimes exist
      const showtimeCount = await tx.showtime.count({
        where: { screenId: id },
      });

      if (showtimeCount > 0) {
        throw new Error('Cannot delete screen with existing showtimes');
      }

      // 3. Delete screen (seats cascade automatically)
      await tx.screen.delete({
        where: { id },
      });

      logger.info({ screenId: id, theaterId: screen.theaterId }, 'Screen deleted');
    });
  }

  /**
   * Get screen by ID with seats
   */
  async getScreenById(id: string) {
    const screen = await prisma.screen.findUnique({
      where: { id },
      include: {
        theater: {
          select: {
            id: true,
            name: true,
            city: true,
            ownerId: true,
            status: true,
          },
        },
        seats: {
          orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
        },
      },
    });

    if (!screen) {
      throw new Error('Screen not found');
    }

    return screen;
  }

  /**
   * Get screens by theater
   * ENTERPRISE: Owner-scoped
   */
  async getScreensByTheater(
    theaterId: string,
    userRole?: 'ADMIN' | 'THEATER_OWNER' | 'USER',
    currentUserId?: string
  ) {
    // Verify theater access
    const theater = await prisma.theater.findUnique({
      where: { id: theaterId },
    });

    if (!theater) {
      throw new Error('Theater not found');
    }

    // ENTERPRISE: Access control
    if (userRole === 'USER' && theater.status !== 'APPROVED') {
      throw new Error('Theater not found'); // Don't leak unapproved theaters
    }

    if (userRole === 'THEATER_OWNER' && theater.ownerId !== currentUserId) {
      throw new Error('Theater not found'); // Don't leak other owners' theaters
    }

    const screens = await prisma.screen.findMany({
      where: { theaterId },
      include: {
        seats: {
          orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
        },
        _count: {
          select: {
            showtimes: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return screens;
  }
}

export default new ScreenService();
