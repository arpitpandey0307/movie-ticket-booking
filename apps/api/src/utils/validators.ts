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
});

// Showtime validators
export const createShowtimeSchema = z.object({
  movieId: z.string().uuid('Invalid movie ID'),
  screenId: z.string().uuid('Invalid screen ID'),
  startTime: z.string().datetime(),
});

// Booking validators
export const lockSeatsSchema = z.object({
  showtimeId: z.string().uuid('Invalid showtime ID'),
  seatIds: z.array(z.string().uuid()).min(1, 'At least one seat is required'),
});
