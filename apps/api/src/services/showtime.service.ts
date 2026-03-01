import prisma from '../lib/prisma';
import logger from '../lib/logger';

interface CreateShowtimeData {
  movieId: string;
  screenId: string;
  startTime: string; // ISO 8601 string from client
  ownerId: string; // From JWT
}

export class ShowtimeService {
  // ENTERPRISE: Configuration constants
  private readonly BUFFER_MS = 15 * 60 * 1000; // 15 minutes cleaning buffer

  /**
   * ENTERPRISE: Create showtime with atomic conflict detection and seat initialization
   * 
   * Invariants enforced:
   * - Theater must be APPROVED
   * - Owner must own theater
   * - Screen must belong to theater
   * - No scheduling conflicts (with buffer)
   * - Minimum future window (configurable)
   * - Atomic seat materialization
   * - All operations in transaction
   */
  async createShowtime(data: CreateShowtimeData) {
    // STEP 1: Parse & Normalize Time
    const startTime = new Date(data.startTime);
    if (isNaN(startTime.getTime())) {
      throw new Error('Invalid start time format');
    }

    // STEP 2: Minimum Future Constraint (Config-Based)
    const now = new Date();
    const minFutureMs = parseInt(process.env.MIN_SHOWTIME_FUTURE_MINUTES || '60') * 60 * 1000;

    if (startTime.getTime() <= now.getTime() + minFutureMs) {
      const minMinutes = minFutureMs / 60000;
      throw new Error(`Showtime must be at least ${minMinutes} minutes in the future`);
    }

    // STEP 3: Begin Transaction (SERIALIZABLE for conflict prevention)
    return await prisma.$transaction(async (tx) => {
      // STEP 4: Validate Ownership Chain (In Transaction)
      
      // 4a. Fetch screen
      const screen = await tx.screen.findUnique({
        where: { id: data.screenId },
        include: { theater: true },
      });

      if (!screen) {
        throw new Error('Screen not found');
      }

      // 4b. Validate theater
      const theater = screen.theater;

      if (theater.status !== 'APPROVED') {
        throw new Error('Theater must be approved to create showtimes');
      }

      if (theater.ownerId !== data.ownerId) {
        throw new Error('Screen not found'); // 404, not 403
      }

      // 4c. Fetch movie
      const movie = await tx.movie.findUnique({
        where: { id: data.movieId },
      });

      if (!movie) {
        throw new Error('Movie not found');
      }

      // 4d. Derive endTime from movie duration
      const endTime = new Date(startTime.getTime() + movie.duration * 60 * 1000);

      // STEP 5: Conflict Detection (Atomic)
      const newEndWithBuffer = new Date(endTime.getTime() + this.BUFFER_MS);

      const conflict = await tx.showtime.findFirst({
        where: {
          screenId: data.screenId,
          startTime: { lt: newEndWithBuffer },
          endTime: { gt: startTime },
        },
      });

      if (conflict) {
        throw new Error(
          `Showtime conflicts with existing schedule. Buffer time: ${this.BUFFER_MS / 60000} minutes`
        );
      }

      // STEP 6: Create Showtime
      const showtime = await tx.showtime.create({
        data: {
          movieId: data.movieId,
          screenId: data.screenId,
          startTime,
          endTime,
        },
      });

      // STEP 7: Seat Materialization
      const seats = await tx.seat.findMany({
        where: { screenId: data.screenId },
      });

      if (seats.length === 0) {
        throw new Error('Screen has no seats configured');
      }

      const result = await tx.showtimeSeat.createMany({
        data: seats.map((seat) => ({
          showtimeId: showtime.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        })),
      });

      // STEP 8: Verify Seat Initialization
      if (result.count !== seats.length) {
        throw new Error(
          `Seat initialization mismatch: expected ${seats.length}, got ${result.count}`
        );
      }

      logger.info(
        {
          showtimeId: showtime.id,
          movieId: data.movieId,
          screenId: data.screenId,
          startTime,
          endTime,
          seatCount: result.count,
        },
        'Showtime created with seats initialized'
      );

      // STEP 9: Return Created Showtime
      return showtime;
    }, {
      isolationLevel: 'Serializable', // ENTERPRISE: Prevent concurrent scheduling conflicts
    });
  }

  /**
   * ENTERPRISE: Delete showtime (hard delete with booking protection)
   * 
   * Invariants enforced:
   * - Owner must own theater
   * - Cannot delete if bookings exist
   * - DB Restrict provides safety net
   */
  async deleteShowtime(id: string, ownerId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify showtime exists and ownership
      const showtime = await tx.showtime.findUnique({
        where: { id },
        include: {
          screen: {
            include: {
              theater: true,
            },
          },
        },
      });

      if (!showtime || showtime.screen.theater.ownerId !== ownerId) {
        throw new Error('Showtime not found'); // 404, not 403
      }

      // 2. Explicit booking check (clearer error than DB Restrict)
      const bookingCount = await tx.booking.count({
        where: { showtimeId: id },
      });

      if (bookingCount > 0) {
        throw new Error('Cannot delete showtime with existing bookings');
      }

      // 3. Hard delete (ShowtimeSeat cascades automatically)
      await tx.showtime.delete({
        where: { id },
      });

      logger.info(
        {
          showtimeId: id,
          screenId: showtime.screenId,
          movieId: showtime.movieId,
        },
        'Showtime deleted'
      );
    }, {
      isolationLevel: 'Serializable', // ENTERPRISE: Consistent deletion semantics
    });
  }

  /**
   * Get showtime by ID with full details
   */
  async getShowtimeById(id: string) {
    const showtime = await prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
        screen: {
          include: {
            theater: true,
          },
        },
        showtimeSeats: {
          include: {
            seat: true,
            seatLocks: {
              where: {
                expiresAt: { gt: new Date() },
              },
            },
          },
          orderBy: [
            { seat: { rowLabel: 'asc' } },
            { seat: { seatNumber: 'asc' } },
          ],
        },
      },
    });

    if (!showtime) {
      throw new Error('Showtime not found');
    }

    return showtime;
  }

  /**
   * Get showtimes with filters
   * ENTERPRISE: Owner-scoped for THEATER_OWNER
   */
  async getShowtimes(filters: {
    movieId?: string;
    theaterId?: string;
    screenId?: string;
    city?: string;
    date?: Date;
    userRole?: 'ADMIN' | 'THEATER_OWNER' | 'USER';
    currentUserId?: string;
  } = {}) {
    const where: any = {};

    if (filters.movieId) {
      where.movieId = filters.movieId;
    }

    if (filters.screenId) {
      where.screenId = filters.screenId;
    }

    // Theater filtering
    if (filters.theaterId || filters.city || filters.userRole) {
      where.screen = {
        ...(filters.screenId && { id: filters.screenId }),
        theater: {
          ...(filters.theaterId && { id: filters.theaterId }),
          ...(filters.city && { city: filters.city }),
          // ENTERPRISE: Role-based filtering - USER sees APPROVED only
          ...(filters.userRole === 'USER' && { status: 'APPROVED' }),
          ...(filters.userRole === 'THEATER_OWNER' && {
            ownerId: filters.currentUserId,
          }),
        },
      };
    }
    
    // ENTERPRISE: Explicit APPROVED filter for public queries (defense in depth)
    if (filters.userRole === 'USER' && !where.screen) {
      where.screen = {
        theater: {
          status: 'APPROVED',
        },
      };
    }

    // Date filtering (showtimes on specific date)
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const showtimes = await prisma.showtime.findMany({
      where,
      include: {
        movie: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
        screen: {
          include: {
            theater: true,
          },
        },
        _count: {
          select: {
            showtimeSeats: {
              where: {
                status: 'AVAILABLE',
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return showtimes;
  }

  /**
   * Get public showtimes grouped by movie
   * ENTERPRISE: Public endpoint - APPROVED theaters only, future showtimes only
   */
  async getPublicShowtimes() {
    const now = new Date();

    const showtimes = await prisma.showtime.findMany({
      where: {
        startTime: { gte: now },
        screen: {
          theater: {
            status: 'APPROVED',
          },
        },
      },
      include: {
        movie: true,
        screen: {
          include: {
            theater: true,
          },
        },
        _count: {
          select: {
            showtimeSeats: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Group by movie
    const grouped = Object.values(
      showtimes.reduce((acc: any, showtime) => {
        const movieId = showtime.movie.id;

        if (!acc[movieId]) {
          acc[movieId] = {
            movie: {
              id: showtime.movie.id,
              title: showtime.movie.title,
              duration: showtime.movie.duration,
              posterUrl: showtime.movie.posterUrl,
            },
            showtimes: [],
          };
        }

        acc[movieId].showtimes.push({
          id: showtime.id,
          startTime: showtime.startTime,
          theaterName: showtime.screen.theater.name,
          screenName: showtime.screen.name,
          availableSeats: showtime._count.showtimeSeats,
        });

        return acc;
      }, {})
    );

    return grouped;
  }
}

export default new ShowtimeService();
