# Design Document

## Overview

The Movie Ticket Booking Platform is an enterprise-grade, full-stack web application built with a separated frontend (Next.js 14) and dedicated backend service (Express/Fastify), TypeScript, PostgreSQL, and Redis. The architecture follows a monorepo approach with strict separation between frontend UI, backend API service, database layer, caching layer, and shared types. The system implements a three-tier architecture with presentation (Next.js React components), business logic (dedicated Express/Fastify service), and data persistence (PostgreSQL with Prisma ORM + Redis for caching and rate limiting).

The platform handles high-concurrency seat bookings through database transactions with optimistic locking, Redis-based rate limiting, and transactional lock validation. It implements JWT-based authentication with role-based access control, integrates with Stripe for payment processing with webhook idempotency guarantees, and includes comprehensive observability (structured logging, request tracing, metrics, error tracking). The UI is built with Tailwind CSS and ShadCN UI components, supporting both dark and light themes with responsive layouts and WCAG AA accessibility compliance.

**Key Enterprise Features:**
- Separated backend service for horizontal scaling and long-running transactions
- Redis layer for caching, rate limiting, and session management
- Decimal precision for all financial calculations
- Webhook event log for exactly-once payment processing
- Structured logging with request tracing (Pino + Sentry)
- Composite and partial indexes for query optimization
- Lock validation within transactions (no cron dependency)
- Bot protection and IP-based throttling

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend]
        State[Zustand State Management]
    end
    
    subgraph "Load Balancer"
        LB[Nginx/ALB]
    end
    
    subgraph "Backend Service Layer"
        API1[API Service Instance 1]
        API2[API Service Instance 2]
        API3[API Service Instance N]
    end
    
    subgraph "Caching Layer"
        Redis[(Redis)]
    end
    
    subgraph "Service Layer"
        MovieSvc[Movie Service]
        BookingSvc[Booking Service]
        TheaterSvc[Theater Service]
        PaymentSvc[Payment Service]
        LockSvc[Seat Lock Service]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma ORM]
        DBPrimary[(PostgreSQL Primary)]
        DBReplica[(PostgreSQL Read Replica)]
    end
    
    subgraph "External Services"
        Stripe[Stripe API]
        Storage[S3/CloudFlare R2]
    end
    
    subgraph "Observability"
        Sentry[Sentry Error Tracking]
        Metrics[Prometheus/Datadog]
        Logs[Structured Logs]
    end
    
    UI --> State
    UI --> LB
    LB --> API1
    LB --> API2
    LB --> API3
    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    API1 --> MovieSvc
    API1 --> BookingSvc
    API1 --> TheaterSvc
    API1 --> PaymentSvc
    BookingSvc --> LockSvc
    MovieSvc --> Prisma
    BookingSvc --> Prisma
    TheaterSvc --> Prisma
    PaymentSvc --> Stripe
    LockSvc --> Prisma
    Prisma --> DBPrimary
    Prisma --> DBReplica
    MovieSvc --> Storage
    API1 --> Sentry
    API1 --> Metrics
    API1 --> Logs
```

### Technology Stack

**Frontend:**
- Next.js 14 with App Router (frontend only, no API routes)
- TypeScript for type safety
- Tailwind CSS for utility-first styling
- ShadCN UI for pre-built accessible components (WCAG AA compliant)
- Zustand for lightweight state management
- React Hook Form with Zod for form validation
- Framer Motion for animations

**Backend:**
- Express.js or Fastify for dedicated API service
- TypeScript for type safety
- Prisma ORM for database access
- PostgreSQL for relational data storage (with read replicas)
- Redis for caching, rate limiting, and session management
- JWT for stateless authentication
- bcrypt for password hashing
- Pino for structured logging
- Helmet for security headers

**Infrastructure:**
- Docker for containerization
- docker-compose for local development
- Nginx or AWS ALB for load balancing
- Redis Cluster for high availability
- PostgreSQL with streaming replication
- Sentry for error tracking
- Prometheus or Datadog for metrics
- CloudFlare or AWS S3 for static assets

**DevOps:**
- Vercel for frontend deployment
- AWS ECS/Fargate or Railway for backend service
- AWS RDS or Railway for PostgreSQL with automated backups
- AWS ElastiCache or Upstash for Redis
- GitHub Actions for CI/CD

### Deployment Architecture

```mermaid
graph TB
    Users[Users] --> CDN[CloudFlare CDN]
    CDN --> Vercel[Vercel - Next.js Frontend]
    Vercel --> ALB[AWS ALB / Load Balancer]
    ALB --> API1[API Service 1]
    ALB --> API2[API Service 2]
    ALB --> API3[API Service N]
    API1 --> RedisCluster[Redis Cluster]
    API2 --> RedisCluster
    API3 --> RedisCluster
    API1 --> DBPrimary[PostgreSQL Primary]
    API2 --> DBPrimary
    API3 --> DBPrimary
    API1 --> DBReplica[PostgreSQL Read Replica]
    API2 --> DBReplica
    API3 --> DBReplica
    DBPrimary --> Backup[Automated Backups]
    API1 --> Stripe[Stripe API]
    API1 --> Sentry[Sentry]
    API1 --> Metrics[Metrics Service]
```

**Scaling Strategy:**
- Frontend: Auto-scaled via Vercel edge network
- Backend: Horizontal scaling with 2-10 instances based on load
- Database: Primary for writes, read replicas for queries
- Redis: Cluster mode with 3+ nodes for high availability
- Target: 10,000 concurrent users, 1000 bookings/minute

## Components and Interfaces

### Frontend Components

**Authentication Components:**
- `LoginForm`: Email/password login with validation
- `SignupForm`: User registration with role selection
- `AuthProvider`: Context provider for authentication state
- `ProtectedRoute`: HOC for route protection based on roles

**Admin Components:**
- `AdminDashboard`: Analytics overview with charts
- `MovieManagement`: CRUD interface for movies
- `MovieForm`: Form for adding/editing movies with poster upload
- `GenreManagement`: CRUD interface for genres
- `TheaterApproval`: List of pending theater approvals
- `AnalyticsChart`: Revenue and occupancy visualization

**Theater Owner Components:**
- `TheaterManagement`: List and CRUD for theaters
- `TheaterForm`: Form for adding/editing theaters
- `ScreenManagement`: CRUD interface for screens within a theater
- `SeatLayoutBuilder`: Interactive grid builder for seat configuration
- `ShowtimeManagement`: CRUD interface for showtimes
- `ShowtimeForm`: Form for creating showtimes with conflict detection

**User Components:**
- `MovieGrid`: Responsive grid of movie cards
- `MovieCard`: Individual movie display with poster and details
- `MovieFilters`: Filter controls for city, language, genre
- `TheaterList`: List of theaters showing selected movie
- `ShowtimeSelector`: Time slot selection interface
- `SeatMap`: Interactive seat selection grid
- `SeatLegend`: Color-coded legend for seat statuses
- `BookingSummary`: Sticky panel showing selected seats and total
- `PaymentForm`: Stripe payment integration
- `BookingConfirmation`: Success page with booking details
- `BookingHistory`: List of user's past and upcoming bookings

**Shared Components:**
- `Navbar`: Navigation with role-based menu items
- `ThemeToggle`: Dark/light mode switcher
- `LoadingSkeleton`: Placeholder for loading states
- `Toast`: Notification system for feedback
- `ErrorBoundary`: Error handling wrapper

### Backend API Routes

**Authentication Routes:**
- `POST /api/auth/signup`: User registration
- `POST /api/auth/login`: User login
- `POST /api/auth/logout`: User logout
- `GET /api/auth/me`: Get current user profile

**Movie Routes:**
- `GET /api/movies`: List all movies with filters
- `GET /api/movies/:id`: Get movie details
- `POST /api/movies`: Create movie (Admin only)
- `PUT /api/movies/:id`: Update movie (Admin only)
- `DELETE /api/movies/:id`: Delete movie (Admin only)
- `POST /api/movies/:id/poster`: Upload movie poster (Admin only)

**Genre Routes:**
- `GET /api/genres`: List all genres
- `POST /api/genres`: Create genre (Admin only)
- `PUT /api/genres/:id`: Update genre (Admin only)
- `DELETE /api/genres/:id`: Delete genre (Admin only)

**Theater Routes:**
- `GET /api/theaters`: List theaters with filters
- `GET /api/theaters/:id`: Get theater details
- `POST /api/theaters`: Create theater (Theater Owner only)
- `PUT /api/theaters/:id`: Update theater (Theater Owner only)
- `DELETE /api/theaters/:id`: Delete theater (Theater Owner only)
- `POST /api/theaters/:id/approve`: Approve theater (Admin only)

**Screen Routes:**
- `GET /api/theaters/:theaterId/screens`: List screens in theater
- `GET /api/screens/:id`: Get screen details with seat layout
- `POST /api/theaters/:theaterId/screens`: Create screen (Theater Owner only)
- `PUT /api/screens/:id`: Update screen (Theater Owner only)
- `DELETE /api/screens/:id`: Delete screen (Theater Owner only)

**Showtime Routes:**
- `GET /api/showtimes`: List showtimes with filters
- `GET /api/showtimes/:id`: Get showtime details
- `POST /api/showtimes`: Create showtime (Theater Owner only)
- `PUT /api/showtimes/:id`: Update showtime (Theater Owner only)
- `DELETE /api/showtimes/:id`: Delete showtime (Theater Owner only)
- `GET /api/showtimes/:id/seats`: Get seat availability for showtime

**Booking Routes:**
- `POST /api/bookings/lock-seats`: Lock seats for user session
- `POST /api/bookings`: Create booking after payment
- `GET /api/bookings`: Get user's booking history
- `GET /api/bookings/:id`: Get booking details

**Payment Routes:**
- `POST /api/payments/create-intent`: Create Stripe payment intent
- `POST /api/payments/webhook`: Handle Stripe webhook events

**Admin Routes:**
- `GET /api/admin/analytics`: Get dashboard analytics

### Service Layer Interfaces

```typescript
interface IMovieService {
  createMovie(data: CreateMovieDTO): Promise<Movie>;
  updateMovie(id: string, data: UpdateMovieDTO): Promise<Movie>;
  deleteMovie(id: string): Promise<void>;
  getMovies(filters: MovieFilters): Promise<Movie[]>;
  getMovieById(id: string): Promise<Movie>;
  uploadPoster(id: string, file: File): Promise<string>;
}

interface ITheaterService {
  createTheater(data: CreateTheaterDTO, ownerId: string): Promise<Theater>;
  updateTheater(id: string, data: UpdateTheaterDTO): Promise<Theater>;
  deleteTheater(id: string): Promise<void>;
  getTheaters(filters: TheaterFilters): Promise<Theater[]>;
  approveTheater(id: string): Promise<Theater>;
}

interface IScreenService {
  createScreen(theaterId: string, data: CreateScreenDTO): Promise<Screen>;
  updateScreen(id: string, data: UpdateScreenDTO): Promise<Screen>;
  deleteScreen(id: string): Promise<void>;
  createSeats(screenId: string, layout: SeatLayout): Promise<Seat[]>;
}

interface IShowtimeService {
  createShowtime(data: CreateShowtimeDTO): Promise<Showtime>;
  updateShowtime(id: string, data: UpdateShowtimeDTO): Promise<Showtime>;
  deleteShowtime(id: string): Promise<void>;
  getShowtimes(filters: ShowtimeFilters): Promise<Showtime[]>;
  checkConflicts(screenId: string, startTime: Date, duration: number): Promise<boolean>;
}

interface ISeatLockService {
  lockSeats(showtimeId: string, seatIds: string[], userId: string): Promise<SeatLock[]>;
  releaseSeats(lockIds: string[]): Promise<void>;
  releaseExpiredLocks(): Promise<void>;
  validateLocks(lockIds: string[], userId: string): Promise<boolean>;
}

interface IBookingService {
  createBooking(data: CreateBookingDTO, paymentId: string): Promise<Booking>;
  getBookings(userId: string): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking>;
}

interface IPaymentService {
  createPaymentIntent(amount: number, metadata: PaymentMetadata): Promise<PaymentIntent>;
  handleWebhook(event: StripeEvent): Promise<void>;
  confirmPayment(paymentIntentId: string): Promise<Payment>;
}

interface IAuthService {
  signup(data: SignupDTO): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  verifyToken(token: string): Promise<User>;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}
```

## Data Models

### Database Schema

```prisma
// User model
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  firstName     String
  lastName      String
  phone         String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  theaters      Theater[]
  bookings      Booking[]
  seatLocks     SeatLock[]
  
  @@index([email])
}

enum Role {
  ADMIN
  THEATER_OWNER
  USER
}

// Movie model
model Movie {
  id            String    @id @default(uuid())
  title         String
  description   String    @db.Text
  posterUrl     String?
  duration      Int       // in minutes
  language      String
  releaseDate   DateTime
  rating        String?   // PG, PG-13, R, etc.
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  genres        MovieGenre[]
  showtimes     Showtime[]
  
  @@index([language])
  @@index([releaseDate])
}

// Genre model
model Genre {
  id            String    @id @default(uuid())
  name          String    @unique
  slug          String    @unique
  createdAt     DateTime  @default(now())
  
  movies        MovieGenre[]
}

// Junction table for Movie-Genre many-to-many
model MovieGenre {
  movieId       String
  genreId       String
  
  movie         Movie     @relation(fields: [movieId], references: [id], onDelete: Cascade)
  genre         Genre     @relation(fields: [genreId], references: [id], onDelete: Cascade)
  
  @@id([movieId, genreId])
  @@index([movieId])
  @@index([genreId])
}

// Theater model
model Theater {
  id            String    @id @default(uuid())
  name          String
  address       String
  city          String
  state         String
  zipCode       String
  ownerId       String
  status        TheaterStatus @default(PENDING)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  owner         User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  screens       Screen[]
  
  @@index([city])
  @@index([ownerId])
  @@index([status])
}

enum TheaterStatus {
  PENDING
  APPROVED
  REJECTED
}

// Screen model
model Screen {
  id            String    @id @default(uuid())
  name          String
  theaterId     String
  capacity      Int
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  theater       Theater   @relation(fields: [theaterId], references: [id], onDelete: Cascade)
  seats         Seat[]
  showtimes     Showtime[]
  
  @@unique([theaterId, name])
  @@index([theaterId])
}

// Seat model - CRITICAL: Use Decimal for price, not Float
model Seat {
  id            String    @id @default(uuid())
  screenId      String
  rowLabel      String    // A, B, C, etc.
  seatNumber    Int       // 1, 2, 3, etc.
  seatType      SeatType  @default(REGULAR)
  price         Decimal   @db.Decimal(10, 2)  // ENTERPRISE: Decimal for money
  createdAt     DateTime  @default(now())
  
  screen        Screen    @relation(fields: [screenId], references: [id], onDelete: Cascade)
  showtimeSeats ShowtimeSeat[]
  
  @@unique([screenId, rowLabel, seatNumber])
  @@index([screenId])
}

enum SeatType {
  REGULAR
  PREMIUM
  RECLINER
}

// Showtime model
model Showtime {
  id            String    @id @default(uuid())
  movieId       String
  screenId      String
  startTime     DateTime
  endTime       DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  movie         Movie     @relation(fields: [movieId], references: [id], onDelete: Cascade)
  screen        Screen    @relation(fields: [screenId], references: [id], onDelete: Cascade)
  showtimeSeats ShowtimeSeat[]
  bookings      Booking[]
  
  @@index([movieId])
  @@index([screenId])
  @@index([startTime])
}

// ShowtimeSeat model - ENTERPRISE: Removed LOCKED status, only AVAILABLE/BOOKED
// Lock existence determines temporary reservation
model ShowtimeSeat {
  id            String    @id @default(uuid())
  showtimeId    String
  seatId        String
  status        SeatStatus @default(AVAILABLE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  showtime      Showtime  @relation(fields: [showtimeId], references: [id], onDelete: Cascade)
  seat          Seat      @relation(fields: [seatId], references: [id], onDelete: Cascade)
  seatLocks     SeatLock[]
  bookingSeats  BookingSeat[]
  
  @@unique([showtimeId, seatId])
  @@index([showtimeId])
  @@index([seatId])
  @@index([status])
  @@index([showtimeId, status])  // ENTERPRISE: Composite index for availability queries
}

// ENTERPRISE: Only two states - AVAILABLE or BOOKED
// Lock existence (SeatLock table) determines temporary reservation
enum SeatStatus {
  AVAILABLE
  BOOKED
}

// SeatLock model - temporary seat reservations
// ENTERPRISE: Lock existence = seat is temporarily reserved
model SeatLock {
  id            String    @id @default(uuid())
  showtimeSeatId String
  userId        String
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  
  showtimeSeat  ShowtimeSeat @relation(fields: [showtimeSeatId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([showtimeSeatId])  // ENTERPRISE: Only one lock per seat
  @@index([showtimeSeatId])
  @@index([userId])
  @@index([expiresAt])
  // ENTERPRISE: Partial index for active locks only (PostgreSQL)
  // CREATE INDEX idx_active_locks ON "SeatLock"("showtimeSeatId") WHERE "expiresAt" > NOW();
}

// Booking model - CRITICAL: Use Decimal for totalAmount
model Booking {
  id            String    @id @default(uuid())
  bookingCode   String    @unique
  userId        String
  showtimeId    String
  totalAmount   Decimal   @db.Decimal(10, 2)  // ENTERPRISE: Decimal for money
  status        BookingStatus @default(PENDING)
  paymentId     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  showtime      Showtime  @relation(fields: [showtimeId], references: [id], onDelete: Cascade)
  payment       Payment?  @relation(fields: [paymentId], references: [id])
  bookingSeats  BookingSeat[]
  
  @@index([userId])
  @@index([showtimeId])
  @@index([bookingCode])
  @@index([status])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

// BookingSeat model - CRITICAL: Use Decimal for price
model BookingSeat {
  id            String    @id @default(uuid())
  bookingId     String
  showtimeSeatId String
  price         Decimal   @db.Decimal(10, 2)  // ENTERPRISE: Decimal for money
  
  booking       Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  showtimeSeat  ShowtimeSeat @relation(fields: [showtimeSeatId], references: [id], onDelete: Cascade)
  
  @@unique([bookingId, showtimeSeatId])
  @@index([bookingId])
  @@index([showtimeSeatId])
}

// Payment model - CRITICAL: Use Decimal for amount
model Payment {
  id            String    @id @default(uuid())
  stripePaymentIntentId String @unique
  amount        Decimal   @db.Decimal(10, 2)  // ENTERPRISE: Decimal for money
  currency      String    @default("usd")
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  bookings      Booking[]
  
  @@index([stripePaymentIntentId])
  @@index([status])
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  CANCELLED
}

// ENTERPRISE: Webhook event log for idempotency
// Ensures exactly-once processing of Stripe webhooks
model WebhookEvent {
  id                String    @id @default(uuid())
  stripeEventId     String    @unique  // Stripe event ID for idempotency
  eventType         String
  processed         Boolean   @default(false)
  payload           Json
  processingError   String?
  createdAt         DateTime  @default(now())
  processedAt       DateTime?
  
  @@index([stripeEventId])
  @@index([processed])
  @@index([createdAt])
}
```

### Key Data Transfer Objects (DTOs)

```typescript
// Authentication DTOs
interface SignupDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

interface LoginDTO {
  email: string;
  password: string;
}

interface AuthResponse {
  user: UserDTO;
  token: string;
}

// Movie DTOs
interface CreateMovieDTO {
  title: string;
  description: string;
  duration: number;
  language: string;
  releaseDate: Date;
  rating?: string;
  genreIds: string[];
}

interface MovieFilters {
  city?: string;
  language?: string;
  genreId?: string;
  search?: string;
}

// Theater DTOs
interface CreateTheaterDTO {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

// Screen DTOs
interface CreateScreenDTO {
  name: string;
  seatLayout: SeatLayout;
}

interface SeatLayout {
  rows: number;
  seatsPerRow: number;
  seatConfig: SeatConfig[];
}

interface SeatConfig {
  rowLabel: string;
  seatNumber: number;
  seatType: SeatType;
  price: number;
}

// Showtime DTOs
interface CreateShowtimeDTO {
  movieId: string;
  screenId: string;
  startTime: Date;
}

interface ShowtimeFilters {
  movieId?: string;
  theaterId?: string;
  city?: string;
  date?: Date;
}

// Booking DTOs
interface LockSeatsDTO {
  showtimeId: string;
  seatIds: string[];
}

interface CreateBookingDTO {
  showtimeId: string;
  seatLockIds: string[];
}

interface PaymentMetadata {
  userId: string;
  showtimeId: string;
  seatLockIds: string[];
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**ENTERPRISE NOTE**: We focus on 12 critical properties that cover high-risk domain logic: concurrency, locking, booking, payment, and revenue calculation. These are the areas where bugs cause the most damage. UI properties (theme toggles, display formatting) are tested with unit tests, not property-based tests.

### Critical Concurrency Properties

**Property 1: Concurrent seat lock prevention**
*For any* seat, when multiple users attempt to lock it simultaneously, only one lock should succeed due to unique constraint on showtimeSeatId
**Validates: Requirements 14.1**
**Risk Level: CRITICAL** - Double booking prevention

**Property 2: Lock expiration validation in transactions**
*For any* seat lock query within a transaction, only locks with expiresAt > NOW() should be considered active
**Validates: Requirements 9.3, 14.2**
**Risk Level: CRITICAL** - Prevents expired lock usage

**Property 3: Lock to booking atomic conversion**
*For any* successful payment, all associated seat locks should be deleted and seats marked as BOOKED within a single transaction
**Validates: Requirements 9.4, 11.3, 11.4**
**Risk Level: CRITICAL** - Payment consistency

### Critical Financial Properties

**Property 4: Decimal precision for money**
*For any* financial calculation (booking total, seat price, payment amount), the result should use Decimal type with exactly 2 decimal places
**Validates: Requirements 10.2, 11.1**
**Risk Level: CRITICAL** - Financial accuracy

**Property 5: Revenue calculation accuracy**
*For any* set of confirmed bookings, the total revenue should equal the sum of all booking totalAmount values using Decimal arithmetic
**Validates: Requirements 3.4**
**Risk Level: HIGH** - Business metrics

**Property 6: Payment intent amount matching**
*For any* payment initiation, the Stripe payment intent amount (in cents) should equal the booking totalAmount * 100
**Validates: Requirements 11.1**
**Risk Level: CRITICAL** - Payment accuracy

### Critical Booking Properties

**Property 7: Booking ID uniqueness**
*For any* two bookings created at any time, their bookingCode values should be different
**Validates: Requirements 12.1**
**Risk Level: HIGH** - Booking identification

**Property 8: Seat availability count accuracy**
*For any* showtime, the available seat count should equal the number of ShowtimeSeat records with status=AVAILABLE and no active locks (expiresAt > NOW())
**Validates: Requirements 7.4**
**Risk Level: HIGH** - User experience

### Critical Idempotency Properties

**Property 9: Webhook idempotency**
*For any* Stripe webhook event ID, processing it multiple times should result in exactly one booking creation
**Validates: Requirements 11.3**
**Risk Level: CRITICAL** - Prevents duplicate bookings

**Property 10: Seat lock uniqueness**
*For any* ShowtimeSeat, at most one active SeatLock (expiresAt > NOW()) should exist at any time
**Validates: Requirements 9.2**
**Risk Level: CRITICAL** - Lock exclusivity

### Critical Business Logic Properties

**Property 11: Showtime conflict detection**
*For any* screen and two showtimes, if their time ranges overlap (start1 < end2 AND start2 < end1), creating the second showtime should fail
**Validates: Requirements 5.2**
**Risk Level: HIGH** - Theater operations

**Property 12: Failed payment lock release**
*For any* failed payment, all associated seat locks should be deleted and seats should remain AVAILABLE
**Validates: Requirements 11.5**
**Risk Level: HIGH** - Resource cleanup

### Properties Covered by Unit Tests (Not Property-Based)

The following are tested with standard unit tests, not property-based tests:
- Password hashing (Property 1 from original)
- JWT token generation and validation (Properties 2-4)
- Movie CRUD operations (Properties 5-9)
- Theater approval (Property 10)
- Screen and seat management (Properties 14-18)
- Showtime validation (Properties 19-23)
- Movie filtering (Properties 24-28)
- UI display properties (Properties 29-32, 33-36, 44, 50-56)
- Theme persistence (Properties 61-62)
- Security (Properties 63-66)
- API responses (Properties 70-72)

**Rationale**: These are either deterministic operations (CRUD), UI concerns (display formatting), or low-risk logic that doesn't benefit from randomized testing. Property-based testing is expensive to write and maintain - we focus it on the highest-risk areas where concurrency, money, and state consistency matter most.

## Error Handling

### Error Categories

**Authentication Errors:**
- Invalid credentials (401)
- Expired token (401)
- Insufficient permissions (403)
- Missing token (401)

**Validation Errors:**
- Invalid input format (400)
- Missing required fields (400)
- Constraint violations (400)
- Business rule violations (400)

**Resource Errors:**
- Resource not found (404)
- Resource already exists (409)
- Resource conflict (409)

**Booking Errors:**
- Seat already booked (409)
- Seat lock expired (409)
- Invalid seat selection (400)
- Payment failed (402)

**Server Errors:**
- Database connection failure (500)
- External service failure (503)
- Unexpected errors (500)

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

### Error Handling Strategy

1. **Client-Side Validation**: Use Zod schemas with React Hook Form for immediate feedback
2. **API Validation**: Validate all inputs at API boundaries before processing
3. **Database Constraints**: Rely on database constraints for data integrity
4. **Transaction Rollback**: Use database transactions for multi-step operations
5. **Graceful Degradation**: Provide fallback UI states for errors
6. **Error Logging**: Log all errors to server with context for debugging
7. **User Feedback**: Display user-friendly error messages via toast notifications

### Critical Error Scenarios

**ENTERPRISE: Concurrent Booking Conflict with Optimistic Locking**
```typescript
// ENTERPRISE PATTERN: Lock validation within transaction
// Do NOT rely on separate seat status updates
async function lockSeats(showtimeId: string, seatIds: string[], userId: string) {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    
    // Check seat availability and existing locks in single query
    const seats = await tx.showtimeSeat.findMany({
      where: {
        id: { in: seatIds },
        showtimeId,
        status: 'AVAILABLE'  // Only AVAILABLE or BOOKED, no LOCKED state
      },
      include: {
        seatLocks: {
          where: {
            expiresAt: { gt: now }  // CRITICAL: Validate expiration in query
          }
        }
      }
    });
    
    // Validate all seats are available and not locked
    if (seats.length !== seatIds.length) {
      throw new ConflictError('Some seats are no longer available');
    }
    
    const lockedSeats = seats.filter(s => s.seatLocks.length > 0);
    if (lockedSeats.length > 0) {
      throw new ConflictError('Some seats are already locked');
    }
    
    // Create locks with unique constraint (prevents race conditions)
    try {
      const locks = await tx.seatLock.createMany({
        data: seatIds.map(seatId => ({
          showtimeSeatId: seatId,
          userId,
          expiresAt
        }))
      });
      
      return locks;
    } catch (error) {
      if (error.code === 'P2002') {  // Unique constraint violation
        throw new ConflictError('Seat lock conflict - another user locked these seats');
      }
      throw error;
    }
  });
}
```

**ENTERPRISE: Payment Webhook with Idempotency**
```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  return await prisma.$transaction(async (tx) => {
    // Check if event already processed (idempotency)
    const existingEvent = await tx.webhookEvent.findUnique({
      where: { stripeEventId: event.id }
    });
    
    if (existingEvent) {
      if (existingEvent.processed) {
        // Already processed, return success (idempotent)
        return { success: true, duplicate: true };
      }
      // Event exists but failed processing, retry
    } else {
      // Create event record
      await tx.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: event.data.object,
          processed: false
        }
      });
    }
    
    // Process payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;
      
      // Create booking and update seat status atomically
      const booking = await tx.booking.create({
        data: {
          bookingCode: generateBookingCode(),
          userId: metadata.userId,
          showtimeId: metadata.showtimeId,
          totalAmount: new Decimal(paymentIntent.amount).div(100), // Convert cents to dollars
          status: 'CONFIRMED',
          payment: {
            create: {
              stripePaymentIntentId: paymentIntent.id,
              amount: new Decimal(paymentIntent.amount).div(100),
              currency: paymentIntent.currency,
              status: 'SUCCEEDED'
            }
          }
        }
      });
      
      // Delete locks and update seat status to BOOKED
      const lockIds = JSON.parse(metadata.seatLockIds);
      await tx.seatLock.deleteMany({
        where: { id: { in: lockIds } }
      });
      
      await tx.showtimeSeat.updateMany({
        where: {
          seatLocks: {
            some: { id: { in: lockIds } }
          }
        },
        data: { status: 'BOOKED' }
      });
      
      // Mark event as processed
      await tx.webhookEvent.update({
        where: { stripeEventId: event.id },
        data: { 
          processed: true,
          processedAt: new Date()
        }
      });
      
      return { success: true, booking };
    }
  });
}
```

**ENTERPRISE: Seat Lock Expiration (Optional Cleanup)**
```typescript
// IMPORTANT: This is OPTIONAL optimization, not required for correctness
// Lock validation happens in transactions via expiresAt > NOW() checks
async function cleanupExpiredLocks() {
  const now = new Date();
  
  // Delete expired locks and mark seats as available
  await prisma.$transaction(async (tx) => {
    const expiredLocks = await tx.seatLock.findMany({
      where: { expiresAt: { lte: now } },
      include: { showtimeSeat: true }
    });
    
    if (expiredLocks.length === 0) return;
    
    // Delete expired locks
    await tx.seatLock.deleteMany({
      where: { expiresAt: { lte: now } }
    });
    
    // Note: Seats remain AVAILABLE (never set to LOCKED)
    // Lock existence determines temporary reservation
  });
}
```

## Redis Caching Strategy

### Redis Use Cases

**1. Rate Limiting**
```typescript
// IP-based rate limiting for authentication endpoints
async function checkRateLimit(ip: string, endpoint: string): Promise<boolean> {
  const key = `ratelimit:${endpoint}:${ip}`;
  const limit = 5; // 5 requests
  const window = 60; // per 60 seconds
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return current <= limit;
}

// User-based rate limiting for booking operations
async function checkBookingRateLimit(userId: string): Promise<boolean> {
  const key = `booking:ratelimit:${userId}`;
  const limit = 10; // 10 booking attempts
  const window = 300; // per 5 minutes
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return current <= limit;
}
```

**2. Seat Availability Caching**
```typescript
// Cache seat availability for showtimes (short TTL)
async function getCachedSeatAvailability(showtimeId: string) {
  const cacheKey = `seats:${showtimeId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const seats = await prisma.showtimeSeat.findMany({
    where: { showtimeId },
    include: {
      seat: true,
      seatLocks: {
        where: { expiresAt: { gt: new Date() } }
      }
    }
  });
  
  // Cache for 30 seconds (balance between freshness and performance)
  await redis.setex(cacheKey, 30, JSON.stringify(seats));
  
  return seats;
}

// Invalidate cache on booking or lock
async function invalidateSeatCache(showtimeId: string) {
  await redis.del(`seats:${showtimeId}`);
}
```

**3. Session Management**
```typescript
// Store user session data
async function createSession(userId: string, sessionData: any) {
  const sessionId = generateSessionId();
  const key = `session:${sessionId}`;
  
  await redis.setex(key, 3600, JSON.stringify({
    userId,
    ...sessionData,
    createdAt: new Date()
  }));
  
  return sessionId;
}
```

**4. Idempotency Keys**
```typescript
// Prevent duplicate payment processing
async function checkIdempotencyKey(key: string): Promise<boolean> {
  const exists = await redis.exists(`idempotency:${key}`);
  if (exists) {
    return false; // Already processed
  }
  
  // Set with 24 hour expiration
  await redis.setex(`idempotency:${key}`, 86400, '1');
  return true;
}
```

**5. Movie and Genre Caching**
```typescript
// Cache static content with longer TTL
async function getCachedMovies() {
  const cacheKey = 'movies:all';
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const movies = await prisma.movie.findMany({
    include: { genres: { include: { genre: true } } }
  });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(movies));
  
  return movies;
}
```

### Redis Configuration

**Connection:**
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});
```

**Cluster Mode (Production):**
```typescript
const redis = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD
  }
});
```

## Observability and Monitoring

### Structured Logging with Pino

**Logger Setup:**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

export default logger;
```

**Request Logging Middleware:**
```typescript
import { v4 as uuidv4 } from 'uuid';

function requestLogger(req, res, next) {
  const requestId = uuidv4();
  req.id = requestId;
  
  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  }, 'Incoming request');
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    }, 'Request completed');
  });
  
  next();
}
```

**Error Logging:**
```typescript
function errorLogger(err, req, res, next) {
  logger.error({
    requestId: req.id,
    err,
    method: req.method,
    url: req.url,
    userId: req.user?.id
  }, 'Request error');
  
  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      requestId: req.id,
      endpoint: req.url
    },
    user: req.user ? {
      id: req.user.id,
      email: req.user.email
    } : undefined
  });
  
  next(err);
}
```

### Sentry Integration

**Setup:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app })
  ]
});

// Request handler must be first
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler must be last
app.use(Sentry.Handlers.errorHandler());
```

### Metrics and Health Checks

**Prometheus Metrics:**
```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const bookingCounter = new promClient.Counter({
  name: 'bookings_total',
  help: 'Total number of bookings',
  labelNames: ['status']
});

const seatLockGauge = new promClient.Gauge({
  name: 'active_seat_locks',
  help: 'Number of active seat locks'
});

const bookingDuration = new promClient.Histogram({
  name: 'booking_duration_seconds',
  help: 'Booking operation duration',
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(bookingCounter);
register.registerMetric(seatLockGauge);
register.registerMetric(bookingDuration);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**Health Check Endpoint:**
```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown'
    }
  };
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }
  
  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'unhealthy';
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Key Metrics to Track

**Business Metrics:**
- Bookings per minute
- Revenue per hour
- Average booking value
- Conversion rate (views to bookings)
- Failed payment rate

**Technical Metrics:**
- API response time (p50, p95, p99)
- Database query duration
- Redis hit rate
- Seat lock conflicts per minute
- Webhook processing time
- Error rate by endpoint

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Database connections
- Redis connections
- Request queue depth

## Testing Strategy

### Unit Testing

**Framework**: Jest with TypeScript support

**Coverage Areas:**
- Service layer functions (movie, theater, booking, payment services)
- Utility functions (password hashing, JWT generation, validation)
- Data transformation functions
- Business logic calculations (pricing, occupancy, availability)

**Example Unit Tests:**
- Test password hashing produces different hashes for same password
- Test JWT token contains correct user data
- Test price calculation for mixed seat types
- Test occupancy rate calculation with various booking scenarios
- Test seat lock expiration logic
- Test booking code generation uniqueness

### Property-Based Testing

**Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**: Each property test should run a minimum of 100 iterations

**Test Annotation Format**: Each property-based test must include a comment with:
```typescript
// Feature: movie-ticket-booking-platform, Property {number}: {property_text}
```

**Property Test Coverage:**

**Authentication Properties (1-4):**
- Generate random valid credentials and verify password hashing
- Generate random users and verify JWT generation and validation
- Generate random roles and endpoints to verify access control

**Movie Management Properties (5-9):**
- Generate random movie data and verify CRUD operations
- Generate random genre associations and verify relationships
- Test cascade deletion with random showtime data

**Analytics Properties (10-13):**
- Generate random booking sets and verify count/revenue calculations
- Generate random showtime occupancy scenarios and verify rate calculation

**Theater Management Properties (14-18):**
- Generate random theater and screen configurations
- Generate random seat layouts and verify grid creation
- Test uniqueness constraints with random duplicate attempts

**Showtime Properties (19-23):**
- Generate random showtime data and test validation
- Generate overlapping time ranges and verify conflict detection
- Test booking restrictions with random booking scenarios

**Filtering Properties (24-28):**
- Generate random movie datasets with various attributes
- Test filter combinations with random criteria

**Seat Selection Properties (33-36):**
- Generate random seat selections and verify cart operations
- Test selection prevention with random booked seats

**Seat Locking Properties (37-41):**
- Generate random seat lock scenarios
- Test concurrent lock attempts with multiple users
- Test expiration with various time scenarios

**Booking Properties (42-56):**
- Generate random booking scenarios
- Test price calculations with random seat combinations
- Test sorting and categorization with random dates

**Concurrency Properties (57-60):**
- Simulate concurrent operations with random timing
- Test transaction isolation with random conflicts

**Security Properties (63-66):**
- Generate random malicious inputs and verify sanitization
- Test rate limiting with random request patterns

**API Properties (70-72):**
- Generate random valid and invalid requests
- Verify response formats and status codes

### Integration Testing

**Framework**: Jest with Supertest for API testing

**Test Scenarios:**
- Complete booking flow from movie selection to payment
- User registration and authentication flow
- Admin movie management workflow
- Theater owner theater and showtime creation
- Concurrent seat booking by multiple users
- Payment webhook processing
- Seat lock expiration and cleanup

### End-to-End Testing

**Framework**: Playwright or Cypress

**Critical User Journeys:**
- User browses movies, selects showtime, books seats, completes payment
- Admin adds movie and approves theater
- Theater owner creates theater, adds screens, creates showtimes
- User views booking history and confirmation

### Testing Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Database Cleanup**: Use transactions or cleanup hooks to reset database state
3. **Mock External Services**: Mock Stripe API calls in tests
4. **Test Data Factories**: Create reusable factories for generating test data
5. **Seed Data**: Maintain consistent seed data for development and testing
6. **CI/CD Integration**: Run all tests in continuous integration pipeline
7. **Coverage Targets**: Aim for 80%+ code coverage on service layer

## Deployment Strategy

### Development Environment

**Local Setup:**
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Seed database
npm run seed

# Start development server
npm run dev
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: movie_booking
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/movie_booking
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Production Deployment

**Frontend (Vercel):**
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Enable automatic deployments on main branch
4. Configure custom domain

**Backend & Database (Railway/Render):**
1. Create PostgreSQL database instance
2. Deploy Next.js application
3. Configure environment variables
4. Set up automatic deployments
5. Configure health checks

**Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production

# File Storage (optional)
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Database Migrations

**Development:**
```bash
npx prisma migrate dev --name migration_name
```

**Production:**
```bash
npx prisma migrate deploy
```

### Monitoring and Logging

**Application Monitoring:**
- Use Vercel Analytics for frontend performance
- Implement error tracking with Sentry
- Set up uptime monitoring with UptimeRobot

**Database Monitoring:**
- Monitor query performance
- Set up automated backups
- Configure connection pooling

**Logging Strategy:**
- Log all errors with stack traces
- Log authentication attempts
- Log payment transactions
- Log seat booking conflicts
- Use structured logging (JSON format)

### Security Considerations

**Production Checklist:**
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Enable CSRF protection
- [ ] Sanitize all inputs
- [ ] Use parameterized queries
- [ ] Keep dependencies updated
- [ ] Configure security headers
- [ ] Implement audit logging

### Performance Optimization

**Database:**
- Create indexes on foreign keys
- Implement connection pooling
- Use read replicas for heavy read operations
- Optimize N+1 queries with proper joins

**Frontend:**
- Enable Next.js image optimization
- Implement code splitting
- Use React.lazy for route-based splitting
- Enable compression
- Configure CDN for static assets

**Caching:**
- Cache movie listings (5 minutes)
- Cache genre lists (1 hour)
- Cache theater listings by city (10 minutes)
- Implement Redis for session storage (optional)

### Backup and Recovery

**Database Backups:**
- Automated daily backups
- Point-in-time recovery enabled
- Backup retention: 30 days
- Test restore procedures monthly

**Disaster Recovery:**
- Document recovery procedures
- Maintain infrastructure as code
- Keep environment variable backups
- Test failover scenarios

## Design System

### Color Palette

**Light Mode:**
- Primary: Indigo 600 (#4F46E5)
- Primary Hover: Indigo 700 (#4338CA)
- Accent: Purple 600 (#9333EA)
- Accent Hover: Purple 700 (#7E22CE)
- Background: White (#FFFFFF)
- Surface: Gray 50 (#F9FAFB)
- Text Primary: Gray 900 (#111827)
- Text Secondary: Gray 600 (#4B5563)
- Border: Gray 200 (#E5E7EB)
- Success: Green 600 (#16A34A)
- Error: Red 600 (#DC2626)
- Warning: Yellow 600 (#CA8A04)

**Dark Mode:**
- Primary: Indigo 500 (#6366F1)
- Primary Hover: Indigo 400 (#818CF8)
- Accent: Purple 500 (#A855F7)
- Accent Hover: Purple 400 (#C084FC)
- Background: Gray 900 (#111827)
- Surface: Gray 800 (#1F2937)
- Text Primary: Gray 50 (#F9FAFB)
- Text Secondary: Gray 400 (#9CA3AF)
- Border: Gray 700 (#374151)
- Success: Green 500 (#22C55E)
- Error: Red 500 (#EF4444)
- Warning: Yellow 500 (#EAB308)

### Typography Scale

- Heading 1: 2.5rem (40px) - Bold
- Heading 2: 2rem (32px) - Bold
- Heading 3: 1.5rem (24px) - Semibold
- Heading 4: 1.25rem (20px) - Semibold
- Body Large: 1.125rem (18px) - Regular
- Body: 1rem (16px) - Regular
- Body Small: 0.875rem (14px) - Regular
- Caption: 0.75rem (12px) - Regular

### Spacing System

Based on 8px grid:
- xs: 4px (0.5rem)
- sm: 8px (1rem)
- md: 16px (2rem)
- lg: 24px (3rem)
- xl: 32px (4rem)
- 2xl: 48px (6rem)
- 3xl: 64px (8rem)

### Component Specifications

**Button Hierarchy:**
- Primary: Indigo background, white text, used for main actions
- Secondary: Indigo outline, indigo text, used for secondary actions
- Tertiary: Transparent background, indigo text, used for tertiary actions
- Danger: Red background, white text, used for destructive actions

**Seat Status Colors:**
- Available: Green 500 (#22C55E)
- Selected: Yellow 500 (#EAB308)
- Booked: Red 500 (#EF4444)
- Locked (by others): Gray 400 (#9CA3AF)

**Loading States:**
- Skeleton: Animated gradient from gray-200 to gray-300 (light mode)
- Spinner: Indigo 600 rotating circle
- Progress Bar: Indigo 600 with gray-200 background

**Animations:**
- Transition Duration: 150ms for micro-interactions, 300ms for page transitions
- Easing: ease-in-out for most animations
- Hover Scale: 1.02 for cards, 1.05 for buttons
- Toast Slide: slide-in from top with fade

### Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Large Desktop: > 1280px

### Accessibility

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Focus indicators: 2px indigo ring on all interactive elements
- Keyboard navigation: Full support with logical tab order
- Screen reader support: Proper ARIA labels and roles
- Touch targets: Minimum 44x44px for mobile

## File Structure

**ENTERPRISE: Monorepo with Separated Frontend and Backend**

```
movie-ticket-booking-platform/
├── .kiro/
│   └── specs/
│       └── movie-ticket-booking-platform/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── apps/
│   ├── web/                          # Next.js Frontend (Vercel)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── signup/
│   │   │   │   ├── (admin)/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── movies/
│   │   │   │   │   ├── genres/
│   │   │   │   │   └── theaters/
│   │   │   │   ├── (theater-owner)/
│   │   │   │   │   ├── theaters/
│   │   │   │   │   ├── screens/
│   │   │   │   │   └── showtimes/
│   │   │   │   ├── (user)/
│   │   │   │   │   ├── movies/
│   │   │   │   │   ├── booking/
│   │   │   │   │   └── history/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── auth/
│   │   │   │   ├── admin/
│   │   │   │   ├── theater-owner/
│   │   │   │   ├── user/
│   │   │   │   ├── shared/
│   │   │   │   └── ui/              # ShadCN components
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts    # API client for backend
│   │   │   │   └── utils.ts
│   │   │   ├── store/
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── booking.store.ts
│   │   │   │   └── theme.store.ts
│   │   │   └── hooks/
│   │   │       ├── useAuth.ts
│   │   │       ├── useBooking.ts
│   │   │       └── useTheme.ts
│   │   ├── public/
│   │   ├── .env.local
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                          # Express/Fastify Backend (Railway/ECS)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── movies.routes.ts
│       │   │   ├── genres.routes.ts
│       │   │   ├── theaters.routes.ts
│       │   │   ├── screens.routes.ts
│       │   │   ├── showtimes.routes.ts
│       │   │   ├── bookings.routes.ts
│       │   │   ├── payments.routes.ts
│       │   │   └── admin.routes.ts
│       │   ├── services/
│       │   │   ├── movie.service.ts
│       │   │   ├── theater.service.ts
│       │   │   ├── showtime.service.ts
│       │   │   ├── booking.service.ts
│       │   │   ├── seat-lock.service.ts
│       │   │   ├── payment.service.ts
│       │   │   └── auth.service.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── rate-limit.middleware.ts
│       │   │   ├── validation.middleware.ts
│       │   │   ├── error.middleware.ts
│       │   │   └── logger.middleware.ts
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── redis.ts
│       │   │   ├── stripe.ts
│       │   │   ├── logger.ts         # Pino logger
│       │   │   └── sentry.ts
│       │   ├── utils/
│       │   │   ├── jwt.ts
│       │   │   ├── password.ts
│       │   │   └── validators.ts
│       │   ├── types/
│       │   │   ├── models.ts
│       │   │   ├── dtos.ts
│       │   │   └── api.ts
│       │   ├── app.ts                # Express/Fastify app setup
│       │   └── server.ts             # Server entry point
│       ├── .env
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/                 # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── models.ts
│   │   │   ├── dtos.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── prisma/                       # Shared Prisma schema
│       ├── schema.prisma
│       ├── migrations/
│       ├── seed.ts
│       └── package.json
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── middleware/
│   ├── property/                     # 12 critical property tests
│   │   ├── concurrency.test.ts
│   │   ├── financial.test.ts
│   │   ├── booking.test.ts
│   │   └── idempotency.test.ts
│   ├── integration/
│   │   ├── booking-flow.test.ts
│   │   ├── payment-webhook.test.ts
│   │   └── auth-flow.test.ts
│   └── e2e/
│       ├── user-journey.spec.ts
│       ├── admin-workflow.spec.ts
│       └── theater-owner.spec.ts
│
├── docker-compose.yml
├── .gitignore
├── package.json                      # Root package.json for monorepo
├── turbo.json                        # Turborepo config (optional)
└── README.md
```

**Key Architectural Decisions:**

1. **Separated Apps**: Frontend (Next.js) and Backend (Express/Fastify) are completely separate applications
2. **Shared Packages**: Common types and Prisma schema are shared via packages
3. **Independent Deployment**: Frontend deploys to Vercel, backend to Railway/ECS
4. **Monorepo Benefits**: Shared code, unified testing, single repository
5. **Clear Boundaries**: No API routes in Next.js, all business logic in backend service
