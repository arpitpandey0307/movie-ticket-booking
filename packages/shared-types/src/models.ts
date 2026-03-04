import { Role, TheaterStatus, SeatType, SeatStatus, BookingStatus, PaymentStatus, VerificationType } from './enums';

// User model
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  emailVerified: boolean;
  accountLockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Movie model
export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl?: string;
  duration: number;
  language: string;
  releaseDate: Date;
  rating?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Genre model
export interface Genre {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

// Theater model
export interface Theater {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ownerId: string;
  status: TheaterStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Screen model
export interface Screen {
  id: string;
  name: string;
  theaterId: string;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

// Seat model
export interface Seat {
  id: string;
  screenId: string;
  rowLabel: string;
  seatNumber: number;
  seatType: SeatType;
  price: string; // Decimal as string for precision
  createdAt: Date;
}

// Showtime model
export interface Showtime {
  id: string;
  movieId: string;
  screenId: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ShowtimeSeat model
export interface ShowtimeSeat {
  id: string;
  showtimeId: string;
  seatId: string;
  status: SeatStatus;
  createdAt: Date;
  updatedAt: Date;
}

// SeatLock model
export interface SeatLock {
  id: string;
  showtimeSeatId: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Booking model
export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  showtimeId: string;
  totalAmount: string; // Decimal as string for precision
  status: BookingStatus;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// BookingSeat model
export interface BookingSeat {
  id: string;
  bookingId: string;
  showtimeSeatId: string;
  price: string; // Decimal as string for precision
}

// Payment model
export interface Payment {
  id: string;
  stripePaymentIntentId: string;
  amount: string; // Decimal as string for precision
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// WebhookEvent model (for idempotency)
export interface WebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  processed: boolean;
  payload: any;
  processingError?: string;
  createdAt: Date;
  processedAt?: Date;
}

// EmailVerification model
export interface EmailVerification {
  id: string;
  userId: string;
  otpHash: string;
  type: VerificationType;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}
