// Enums matching Prisma schema

export enum Role {
  ADMIN = 'ADMIN',
  THEATER_OWNER = 'THEATER_OWNER',
  USER = 'USER',
}

export enum TheaterStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum SeatType {
  REGULAR = 'REGULAR',
  PREMIUM = 'PREMIUM',
  RECLINER = 'RECLINER',
}

// ENTERPRISE: Only AVAILABLE and BOOKED (no LOCKED status)
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
