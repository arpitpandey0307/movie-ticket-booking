import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { TheaterStatus } from '@prisma/client';

interface CreateTheaterData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ownerId: string;
}

interface CreateScreenData {
  name: string;
  theaterId: string;
  capacity: number;
  seatLayout: {
    rows: number;
    seatsPerRow: number;
    seatConfig: Array<{
      rowLabel: string;
      seatNumber: number;
      seatType: 'REGULAR' | 'PREMIUM' | 'RECLINER';
      price: string; // Decimal as string
    }>;
  };
}

export class TheaterService {
  async createTheater(data: CreateTheaterData) {
    // Verify owner exists and has correct role
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerId },
    });

    if (!owner || owner.role !== 'THEATER_OWNER') {
      throw new Error('Invalid theater owner');
    }

    const theater = await prisma.theater.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        ownerId: data.ownerId,
        status: 'PENDING', // Requires admin approval
      },
    });

    logger.info({ theaterId: theater.id, ownerId: data.ownerId }, 'Theater created');
    return theater;
  }

  async updateTheater(id: string, ownerId: string, data: Partial<CreateTheaterData>) {
    // Verify ownership
    const theater = await prisma.theater.findUnique({
      where: { id },
    });

    // ENTERPRISE: Return 404 for non-existent OR non-owned theaters
    // Never leak existence of resources you don't own
    if (!theater || theater.ownerId !== ownerId) {
      throw new Error('Theater not found');
    }

    const updated = await prisma.theater.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.zipCode && { zipCode: data.zipCode }),
      },
    });

    logger.info({ theaterId: id }, 'Theater updated');
    return updated;
  }

  async deleteTheater(id: string, ownerId: string) {
    // Verify ownership
    const theater = await prisma.theater.findUnique({
      where: { id },
    });

    // ENTERPRISE: Return 404 for non-existent OR non-owned theaters
    // Never leak existence of resources you don't own
    if (!theater || theater.ownerId !== ownerId) {
      throw new Error('Theater not found');
    }

    await prisma.theater.delete({
      where: { id },
    });

    logger.info({ theaterId: id }, 'Theater deleted');
  }

  async approveTheater(id: string, adminId: string) {
    // ENTERPRISE: Atomic transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // Verify theater exists
      const theater = await tx.theater.findUnique({
        where: { id },
      });

      if (!theater) {
        throw new Error('Theater not found');
      }

      // Verify status is PENDING (prevent re-approval)
      if (theater.status !== 'PENDING') {
        throw new Error(`Cannot approve theater with status: ${theater.status}`);
      }

      const updated = await tx.theater.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      logger.info(
        { 
          theaterId: id, 
          adminId, 
          previousStatus: theater.status,
          newStatus: 'APPROVED',
          theaterName: theater.name,
          ownerId: theater.ownerId
        }, 
        'Theater approved by admin'
      );
      
      return updated;
    });
  }

  async rejectTheater(id: string, adminId: string, reason?: string) {
    // ENTERPRISE: Atomic transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // Verify theater exists
      const theater = await tx.theater.findUnique({
        where: { id },
      });

      if (!theater) {
        throw new Error('Theater not found');
      }

      // Verify status is PENDING
      if (theater.status !== 'PENDING') {
        throw new Error(`Cannot reject theater with status: ${theater.status}`);
      }

      const updated = await tx.theater.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      logger.info(
        { 
          theaterId: id, 
          adminId, 
          previousStatus: theater.status,
          newStatus: 'REJECTED',
          theaterName: theater.name,
          ownerId: theater.ownerId,
          reason
        }, 
        'Theater rejected by admin'
      );
      
      return updated;
    });
  }

  async getTheaters(
    filters: { 
      city?: string; 
      status?: TheaterStatus; 
      requestedOwnerId?: string; // From query param - untrusted
      currentUserId?: string;     // From JWT - trusted
      userRole?: 'ADMIN' | 'THEATER_OWNER' | 'USER';
    } = {}
  ) {
    const where: any = {};

    if (filters.city) {
      where.city = filters.city;
    }

    // Role-based status filtering
    if (filters.status) {
      where.status = filters.status;
    } else if (filters.userRole === 'USER') {
      // Public users only see APPROVED theaters
      where.status = 'APPROVED';
    }
    // ADMIN and THEATER_OWNER can see all statuses if no filter specified

    // ENTERPRISE: Owner scoping enforcement
    // CRITICAL: Never trust requestedOwnerId from client
    if (filters.userRole === 'THEATER_OWNER') {
      // Theater owners can ONLY see their own theaters
      where.ownerId = filters.currentUserId;
    } else if (filters.userRole === 'ADMIN' && filters.requestedOwnerId) {
      // Admins can filter by any owner
      where.ownerId = filters.requestedOwnerId;
    }
    // USER role: no owner filtering (sees all APPROVED theaters)

    return prisma.theater.findMany({
      where,
      include: {
        screens: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { city: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getTheaterById(id: string, userRole?: 'ADMIN' | 'THEATER_OWNER' | 'USER', currentUserId?: string) {
    const theater = await prisma.theater.findUnique({
      where: { id },
      include: {
        screens: {
          include: {
            seats: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!theater) {
      throw new Error('Theater not found');
    }

    // ENTERPRISE: Status-based access control
    // Public users (USER role) can only see APPROVED theaters
    if (userRole === 'USER' && theater.status !== 'APPROVED') {
      // Return 404 to avoid leaking existence of unapproved theaters
      throw new Error('Theater not found');
    }

    // Theater owners can see their own theaters regardless of status
    if (userRole === 'THEATER_OWNER' && theater.ownerId !== currentUserId) {
      // Return 404 to avoid leaking existence of other owners' theaters
      throw new Error('Theater not found');
    }

    // Admins can see all theaters

    return theater;
  }

  // Screen management
  async createScreen(data: CreateScreenData) {
    // Verify theater exists and is approved
    const theater = await prisma.theater.findUnique({
      where: { id: data.theaterId },
    });

    if (!theater) {
      throw new Error('Theater not found');
    }

    if (theater.status !== 'APPROVED') {
      throw new Error('Theater must be approved before adding screens');
    }

    // Check for duplicate screen name within theater
    const existing = await prisma.screen.findUnique({
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

    // Create screen and seats in transaction
    const screen = await prisma.$transaction(async (tx) => {
      const newScreen = await tx.screen.create({
        data: {
          name: data.name,
          theaterId: data.theaterId,
          capacity: data.capacity,
        },
      });

      // Generate seats from layout
      const seats = data.seatLayout.seatConfig.map((config) => ({
        screenId: newScreen.id,
        rowLabel: config.rowLabel,
        seatNumber: config.seatNumber,
        seatType: config.seatType,
        price: config.price,
      }));

      await tx.seat.createMany({
        data: seats,
      });

      return newScreen;
    });

    logger.info({ screenId: screen.id, theaterId: data.theaterId }, 'Screen created with seats');
    return screen;
  }

  async getScreenById(id: string) {
    const screen = await prisma.screen.findUnique({
      where: { id },
      include: {
        theater: true,
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

  async deleteScreen(id: string, ownerId: string) {
    // Verify ownership through theater
    const screen = await prisma.screen.findUnique({
      where: { id },
      include: { theater: true },
    });

    if (!screen) {
      throw new Error('Screen not found');
    }

    if (screen.theater.ownerId !== ownerId) {
      throw new Error('Unauthorized: Not theater owner');
    }

    // Check if screen has any showtimes
    const showtimeCount = await prisma.showtime.count({
      where: { screenId: id },
    });

    if (showtimeCount > 0) {
      throw new Error('Cannot delete screen with existing showtimes');
    }

    await prisma.screen.delete({
      where: { id },
    });

    logger.info({ screenId: id }, 'Screen deleted');
  }
}

export default new TheaterService();
