import { z } from 'zod';
import { Role } from '@prisma/client';

// Auth validators
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Movie validators
export const createMovieSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  duration: z.number().positive('Duration must be positive'),
  language: z.string().min(1, 'Language is required'),
  releaseDate: z.string().datetime(),
  rating: z.string().optional(),
  genreIds: z.array(z.string().uuid()).min(1, 'At least one genre is required'),
});

// Theater validators
export const createTheaterSchema = z.object({
  name: z.string().min(1, 'Theater name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code'),
  timezone: z.string().min(1, 'Timezone is required (e.g., "America/New_York")'),
});

export const updateTheaterSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  timezone: z.string().min(1).optional(),
});

export const getTheatersQuerySchema = z.object({
  city: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  ownerId: z.string().uuid().optional(),
});

export const approveTheaterSchema = z.object({
  // No body params - ID from route param
});

export const rejectTheaterSchema = z.object({
  reason: z.string().optional(),
});

// Showtime validators
export const createShowtimeSchema = z.object({
  movieId: z.string().uuid('Invalid movie ID'),
  screenId: z.string().uuid('Invalid screen ID'),
  startTime: z.string().datetime(),
});

// Screen validators
export const seatConfigSchema = z.object({
  rowLabel: z
    .string()
    .min(1, 'Row label is required')
    .max(3, 'Row label must be 1-3 characters')
    .regex(/^[A-Z0-9]+$/, 'Row label must be uppercase alphanumeric only'),
  seatNumber: z.number().int().min(1).max(999, 'Seat number must be between 1 and 999'),
  seatType: z.enum(['REGULAR', 'PREMIUM', 'RECLINER']),
  price: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Price must be in format XX.XX (e.g., "10.00")')
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 9999.99;
    }, 'Price must be between 0.00 and 9999.99'),
});

export const createScreenSchema = z.object({
  name: z.string().min(1, 'Screen name is required'),
  seats: z
    .array(seatConfigSchema)
    .min(1, 'At least one seat is required')
    .max(1000, 'Screen cannot have more than 1000 seats'),
});

export const updateScreenSchema = z.object({
  name: z.string().min(1).optional(),
});

// Booking validators
export const lockSeatsSchema = z.object({
  showtimeId: z.string().uuid('Invalid showtime ID'),
  seatIds: z.array(z.string().uuid()).min(1, 'At least one seat is required'),
});
