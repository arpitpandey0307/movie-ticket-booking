# Implementation Plan - Enterprise Architecture

**IMPORTANT**: This task list reflects the enterprise-grade architecture with separated backend service, Redis, and streamlined property tests (12 critical properties only).

## Phase 0: Infrastructure Setup

- [ ] 1. Initialize monorepo structure
  - Create monorepo with apps/ and packages/ directories
  - Set up package.json with workspaces
  - Install Turborepo or npm workspaces for monorepo management
  - Create apps/web/ for Next.js frontend
  - Create apps/api/ for Express/Fastify backend
  - Create packages/shared-types/ for shared TypeScript types
  - Create packages/prisma/ for shared database schema
  - _Requirements: 21.1, 21.5_

- [ ] 2. Set up frontend (Next.js)
  - Initialize Next.js 14 with App Router in apps/web/
  - Install TypeScript, Tailwind CSS, ShadCN UI
  - Install Zustand, React Hook Form, Zod, Framer Motion
  - Set up ESLint and Prettier
  - Create folder structure (app/, components/, lib/, store/, hooks/)
  - Configure environment variables
  - _Requirements: 21.1_

- [ ] 3. Set up backend service (Express/Fastify)
  - Initialize Express or Fastify in apps/api/
  - Install TypeScript, Prisma Client, bcrypt, jsonwebtoken
  - Install Pino for structured logging
  - Install Helmet for security headers
  - Create folder structure (routes/, services/, middleware/, lib/, utils/, types/)
  - Configure environment variables
  - _Requirements: 21.1_

- [ ] 4. Set up Prisma with enterprise schema
  - Create Prisma schema in packages/prisma/
  - Define all models with Decimal types for money (NOT Float)
  - Remove LOCKED from SeatStatus enum (only AVAILABLE, BOOKED)
  - Add WebhookEvent model for idempotency
  - Add unique constraint on SeatLock.showtimeSeatId
  - Add composite index on ShowtimeSeat (showtimeId, status)
  - Configure relationships and cascade rules
  - _Requirements: 20.1, 20.2, 20.4_

- [ ] 5. Set up Redis
  - Install ioredis in backend service
  - Configure Redis connection with retry strategy
  - Create Redis client utility in apps/api/src/lib/redis.ts
  - Set up Redis for rate limiting, caching, sessions
  - Document Redis cluster configuration for production
  - _Requirements: 18.4_

- [ ] 6. Set up observability stack
  - Install and configure Pino for structured logging
  - Install and configure Sentry for error tracking
  - Install prom-client for Prometheus metrics
  - Create logger middleware with request IDs
  - Create health check endpoint (/health)
  - Create metrics endpoint (/metrics)
  - _Requirements: 19.5_

- [ ] 7. Create database migrations and seed script
  - Run initial Prisma migration
  - Write seed script with sample data (users, movies, theaters, showtimes)
  - Test seed script execution
  - _Requirements: 21.4_

- [ ] 8. Set up testing infrastructure
  - Install Jest and fast-check for property-based testing
  - Configure test environment
  - Create test utilities and factories
  - Set up test database
  - _Requirements: Testing Strategy_

## Phase 1: Core Authentication & Authorization

- [ ] 9. Implement authentication service
  - Create auth service with signup, login, password hashing (bcrypt)
  - Implement JWT generation and verification
  - Add token expiration handling
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 10. Create authentication middleware
  - Implement JWT verification middleware
  - Create role-based access control middleware (Admin, Theater Owner, User)
  - Add request context with user information
  - _Requirements: 1.3, 1.4_

- [ ] 11. Create authentication API routes
  - POST /api/auth/signup with Zod validation
  - POST /api/auth/login
  - GET /api/auth/me
  - Add rate limiting to auth endpoints (5 req/min per IP)
  - _Requirements: 1.1, 1.2, 17.2_

- [ ] 12. Build authentication UI
  - Create LoginForm with React Hook Form + Zod
  - Create SignupForm with role selection
  - Create AuthProvider context
  - Create ProtectedRoute HOC
  - Implement theme toggle
  - _Requirements: 1.1, 1.2, 16.1_

## Phase 2: Movie & Theater Management

- [ ] 13. Implement movie service layer
  - Create movie service with CRUD operations
  - Implement movie filtering (city, language, genre)
  - Add poster upload to S3/CloudFlare R2
  - Implement genre CRUD
  - Add Redis caching for movie listings (5min TTL)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 14. Create movie API routes
  - GET /api/movies (with filters, cached)
  - GET /api/movies/:id
  - POST /api/movies (Admin only)
  - PUT /api/movies/:id (Admin only)
  - DELETE /api/movies/:id (Admin only)
  - POST /api/movies/:id/poster (Admin only)
  - Genre CRUD endpoints (Admin only)
  - _Requirements: 2.1-2.5, 6.1-6.5_

- [ ] 15. Build movie management UI
  - Create MovieGrid with lazy loading
  - Create MovieCard with hover effects
  - Create MovieFilters
  - Create AdminDashboard
  - Create MovieManagement (Admin)
  - Create MovieForm with poster upload
  - Create GenreManagement (Admin)
  - _Requirements: 2.1-2.5, 6.1-6.5_

- [ ] 16. Implement theater service layer
  - Create theater service with CRUD
  - Implement theater approval workflow
  - Add theater filtering by city
  - Implement owner validation
  - _Requirements: 4.1, 3.1, 3.2_

- [ ] 17. Create theater API routes
  - GET /api/theaters (with filters)
  - GET /api/theaters/:id
  - POST /api/theaters (Theater Owner only)
  - PUT /api/theaters/:id (Theater Owner only)
  - DELETE /api/theaters/:id (Theater Owner only)
  - POST /api/theaters/:id/approve (Admin only)
  - _Requirements: 4.1, 3.1, 3.2_

- [ ] 18. Build theater management UI
  - Create TheaterManagement (Theater Owner)
  - Create TheaterForm
  - Create TheaterApproval (Admin)
  - _Requirements: 4.1, 3.1, 3.2_

## Phase 3: Screen & Showtime Management

- [ ] 19. Implement screen and seat service
  - Create screen service with CRUD
  - Implement seat layout builder
  - Generate seats from layout config (with Decimal prices)
  - Validate screen name uniqueness within theater
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 20. Create screen API routes
  - GET /api/theaters/:theaterId/screens
  - GET /api/screens/:id
  - POST /api/theaters/:theaterId/screens (Theater Owner)
  - PUT /api/screens/:id (Theater Owner)
  - DELETE /api/screens/:id (Theater Owner)
  - _Requirements: 4.2-4.5_

- [ ] 21. Build screen management UI
  - Create ScreenManagement
  - Create SeatLayoutBuilder (interactive grid)
  - Add seat type and pricing config
  - _Requirements: 4.2-4.4_

- [ ] 22. Implement showtime service
  - Create showtime service with CRUD
  - Implement conflict detection (overlapping times)
  - Add showtime seat initialization (all AVAILABLE)
  - Implement booking restriction checks
  - Add filtering (movie, theater, city, date)
  - _Requirements: 5.1-5.5, 7.2_

- [ ] 22.1 Write property test for showtime conflict detection
  - **Property 11: Showtime conflict detection**
  - **Validates: Requirements 5.2**

- [ ] 23. Create showtime API routes
  - GET /api/showtimes (with filters)
  - GET /api/showtimes/:id
  - POST /api/showtimes (Theater Owner)
  - PUT /api/showtimes/:id (Theater Owner)
  - DELETE /api/showtimes/:id (Theater Owner)
  - GET /api/showtimes/:id/seats (with Redis cache, 30s TTL)
  - _Requirements: 5.1-5.5, 7.2, 7.4_

- [ ] 24. Build showtime management UI
  - Create ShowtimeManagement
  - Create ShowtimeForm with conflict detection
  - Add calendar view
  - _Requirements: 5.1-5.3_

## Phase 4: User Booking Flow

- [ ] 25. Build user movie browsing UI
  - Create MovieGrid (responsive)
  - Create MovieCard with posters
  - Create MovieFilters
  - Implement lazy loading
  - Add loading skeletons
  - _Requirements: 6.1-6.5, 18.1, 18.5_

- [ ] 26. Build theater and showtime selection UI
  - Create TheaterList (grouped by city)
  - Create ShowtimeSelector
  - Display seat availability counts
  - Show screen name and start time
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 27. Build interactive seat selection UI
  - Create SeatMap (grid layout)
  - Create SeatLegend (color-coded)
  - Implement seat selection/deselection
  - Add visual feedback
  - Prevent booked seat selection
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ] 28. Implement booking cart
  - Create BookingSummary (sticky panel)
  - Implement price calculation (Decimal arithmetic)
  - Display seat details
  - Implement cart state (Zustand)
  - Add animations (Framer Motion)
  - _Requirements: 10.1, 10.2, 10.4_

- [ ] 28.1 Write property test for price calculation
  - **Property 4: Decimal precision for money**
  - **Validates: Requirements 10.2**

## Phase 5: Seat Locking & Concurrency (CRITICAL)

- [ ] 29. Implement seat lock service with enterprise pattern
  - Create seat lock service
  - Implement lock creation with unique constraint (prevents race conditions)
  - Validate locks within transactions (expiresAt > NOW())
  - NO separate status update - lock existence = reservation
  - Add optional cleanup job (not required for correctness)
  - Use Redis for lock tracking
  - _Requirements: 9.1, 9.2, 9.3, 14.1, 14.2, 14.3_

- [ ] 29.1 Write property test for concurrent lock prevention
  - **Property 1: Concurrent seat lock prevention**
  - **Validates: Requirements 14.1**

- [ ] 29.2 Write property test for lock expiration validation
  - **Property 2: Lock expiration validation in transactions**
  - **Validates: Requirements 9.3, 14.2**

- [ ] 29.3 Write property test for seat lock uniqueness
  - **Property 10: Seat lock uniqueness**
  - **Validates: Requirements 9.2**

- [ ] 30. Create seat locking API routes
  - POST /api/bookings/lock-seats (with transaction)
  - Add lock validation before payment
  - Implement rate limiting (10 attempts/5min per user)
  - _Requirements: 9.1, 9.2, 10.3_

- [ ] 30.1 Write property test for seat availability count
  - **Property 8: Seat availability count accuracy**
  - **Validates: Requirements 7.4**

## Phase 6: Payment Integration (CRITICAL)

- [ ] 31. Implement payment service with Stripe
  - Set up Stripe client
  - Create payment intent (amount in cents, Decimal conversion)
  - Implement webhook handler with idempotency
  - Add payment confirmation
  - Handle failures and lock release
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ] 31.1 Write property test for payment amount accuracy
  - **Property 6: Payment intent amount matching**
  - **Validates: Requirements 11.1**

- [ ] 32. Implement webhook idempotency with WebhookEvent table
  - Check if event exists before processing
  - Insert event record in transaction
  - Process payment and create booking atomically
  - Mark event as processed
  - Handle retries gracefully
  - _Requirements: 11.3_

- [ ] 32.1 Write property test for webhook idempotency
  - **Property 9: Webhook idempotency**
  - **Validates: Requirements 11.3**

- [ ] 33. Create payment API routes
  - POST /api/payments/create-intent
  - POST /api/payments/webhook (with signature verification)
  - Add idempotency key support
  - _Requirements: 11.1, 11.2_

- [ ] 34. Build payment UI
  - Create PaymentForm (Stripe Elements)
  - Add payment processing feedback
  - Implement error handling
  - Add loading states
  - _Requirements: 11.1, 11.5_

## Phase 7: Booking Completion

- [ ] 35. Implement booking service
  - Create booking with Decimal amounts
  - Generate unique booking codes
  - Convert locks to bookings (delete locks, update status to BOOKED)
  - Implement booking retrieval and history
  - Add sorting and categorization
  - _Requirements: 11.3, 11.4, 12.1, 12.4, 12.5, 13.1, 13.3, 13.4_

- [ ] 35.1 Write property test for lock to booking conversion
  - **Property 3: Lock to booking atomic conversion**
  - **Validates: Requirements 9.4, 11.3, 11.4**

- [ ] 35.2 Write property test for booking ID uniqueness
  - **Property 7: Booking ID uniqueness**
  - **Validates: Requirements 12.1**

- [ ] 35.3 Write property test for failed payment lock release
  - **Property 12: Failed payment lock release**
  - **Validates: Requirements 11.5**

- [ ] 36. Create booking API routes
  - POST /api/bookings (after payment)
  - GET /api/bookings (user history)
  - GET /api/bookings/:id
  - Add authorization checks
  - _Requirements: 12.4, 12.5, 13.1_

- [ ] 37. Build booking confirmation UI
  - Create BookingConfirmation
  - Display all booking details
  - Show unique booking code
  - Add view details option
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 38. Build booking history UI
  - Create BookingHistory
  - Display all bookings
  - Implement sorting by date
  - Distinguish upcoming vs past
  - Add detail view
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

## Phase 8: Admin Analytics

- [ ] 39. Implement analytics service
  - Create analytics calculations (Decimal arithmetic)
  - Calculate total bookings
  - Calculate total revenue
  - Calculate occupancy rate
  - Add date range filtering
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 39.1 Write property test for revenue calculation
  - **Property 5: Revenue calculation accuracy**
  - **Validates: Requirements 3.4**

- [ ] 40. Create admin analytics API
  - GET /api/admin/analytics (Admin only)
  - Add caching for analytics (Redis, 1min TTL)
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 41. Build admin analytics dashboard
  - Create analytics charts
  - Display bookings, revenue, occupancy
  - Add date range picker
  - _Requirements: 3.3, 3.4, 3.5_

## Phase 9: Security & Observability

- [ ] 42. Implement rate limiting with Redis
  - IP-based rate limiting (auth endpoints)
  - User-based rate limiting (booking endpoints)
  - Bot protection
  - _Requirements: 17.2_

- [ ] 43. Implement security features
  - Input validation (Zod on all routes)
  - Input sanitization (SQL injection, XSS)
  - CSRF protection
  - Security headers (Helmet)
  - _Requirements: 17.1, 17.3, 17.5_

- [ ] 44. Implement error handling
  - Error logging service (Pino)
  - Error boundary components
  - Toast notifications
  - User-friendly error messages
  - Sentry integration
  - _Requirements: 19.1, 19.2, 19.5_

- [ ] 45. Add observability
  - Request tracing with IDs
  - Structured logging
  - Prometheus metrics (bookings, locks, errors)
  - Health checks
  - _Requirements: Observability Strategy_

## Phase 10: Shared Components & Polish

- [ ] 46. Build shared UI components
  - Navbar (role-based)
  - ThemeToggle
  - LoadingSkeleton
  - Toast system
  - ErrorBoundary
  - Responsive layouts
  - _Requirements: 15.1, 15.2, 15.3, 16.1, 18.5, 19.1, 19.2_

- [ ] 47. Implement data integrity
  - Cascade deletion
  - Unique constraints validation
  - Transaction error handling
  - _Requirements: 20.2, 20.4, 14.5_

- [ ] 48. Implement API standardization
  - Consistent response format
  - HTTP status code helpers
  - Request validation middleware
  - _Requirements: 22.2, 22.3, 22.5_

## Phase 11: Deployment & DevOps

- [ ] 49. Set up Docker
  - Create Dockerfile for backend
  - Create Dockerfile for frontend
  - Create docker-compose.yml (PostgreSQL, Redis, backend, frontend)
  - Configure environment variables
  - Add health checks
  - _Requirements: 21.2, 21.3_

- [ ] 50. Create deployment documentation
  - Write comprehensive README
  - Document environment variables
  - Add deployment guide (Vercel + Railway/ECS)
  - Document database migrations
  - Add troubleshooting section
  - _Requirements: 21.5_

- [ ] 51. Set up CI/CD
  - Configure GitHub Actions
  - Run tests on PR
  - Deploy frontend to Vercel
  - Deploy backend to Railway/ECS
  - Run database migrations

## Phase 12: Testing

- [ ] 52. Write unit tests
  - Test service layer functions
  - Test utility functions
  - Test middleware
  - Test business logic
  - Aim for 80%+ coverage on services

- [ ] 53. Write integration tests
  - Test complete booking flow
  - Test authentication flow
  - Test concurrent seat booking
  - Test payment webhook processing
  - Test lock expiration

- [ ] 54. Write end-to-end tests
  - Test user booking journey (Playwright)
  - Test admin workflow
  - Test theater owner workflow
  - Test error scenarios

- [ ] 55. Final checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property tests
  - Run all integration tests
  - Run all e2e tests
  - Fix any failing tests

## Notes

**Property Tests**: Only 12 critical properties focused on concurrency, financial accuracy, booking integrity, and idempotency. UI and CRUD operations use unit tests.

**Architecture**: Monorepo with separated frontend (Next.js) and backend (Express/Fastify). No Next.js API routes for business logic.

**Critical Patterns**:
- Lock validation within transactions (expiresAt > NOW())
- Webhook idempotency with WebhookEvent table
- Decimal types for all money fields
- No LOCKED status - lock existence = temporary reservation
- Redis for caching, rate limiting, sessions

**Deployment Target**: 10,000 concurrent users, 1000 bookings/minute
