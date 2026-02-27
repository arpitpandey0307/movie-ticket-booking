import { Role, SeatType } from './enums';

// Authentication DTOs
export interface SignupDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

// Movie DTOs
export interface CreateMovieDTO {
  title: string;
  description: string;
  duration: number;
  language: string;
  releaseDate: Date;
  rating?: string;
  genreIds: string[];
}

export interface UpdateMovieDTO {
  title?: string;
  description?: string;
  duration?: number;
  language?: string;
  releaseDate?: Date;
  rating?: string;
  genreIds?: string[];
}

export interface MovieFilters {
  city?: string;
  language?: string;
  genreId?: string;
  search?: string;
}

// Theater DTOs
export interface CreateTheaterDTO {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  timezone: string; // IANA timezone (e.g., "America/New_York")
}

export interface UpdateTheaterDTO {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timezone?: string;
}

export interface TheaterFilters {
  city?: string;
  status?: string;
  ownerId?: string;
}

// Screen DTOs
export interface CreateScreenDTO {
  name: string;
  seats: SeatConfig[]; // Fully explicit layout
}

export interface UpdateScreenDTO {
  name?: string;
  // NO layout updates allowed after creation
}

export interface SeatConfig {
  rowLabel: string;    // "A", "B", "C"
  seatNumber: number;  // 1, 2, 3
  seatType: SeatType;
  price: string;       // Decimal as string
}

// Showtime DTOs
export interface CreateShowtimeDTO {
  movieId: string;
  screenId: string;
  startTime: Date;
}

export interface UpdateShowtimeDTO {
  startTime?: Date;
}

export interface ShowtimeFilters {
  movieId?: string;
  theaterId?: string;
  city?: string;
  date?: Date;
}

// Booking DTOs
export interface LockSeatsDTO {
  showtimeId: string;
  seatIds: string[];
}

export interface CreateBookingDTO {
  showtimeId: string;
  seatLockIds: string[];
}

export interface PaymentMetadata {
  userId: string;
  showtimeId: string;
  seatLockIds: string[];
}

// API Response DTOs
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Analytics DTOs
export interface AnalyticsDTO {
  totalBookings: number;
  totalRevenue: string; // Decimal as string
  averageOccupancyRate: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
