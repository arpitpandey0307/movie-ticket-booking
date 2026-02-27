# Implementation Plan

- [ ] 1. Initialize project structure and dependencies
  - Create Next.js 14 project with TypeScript and App Router
  - Install and configure Tailwind CSS
  - Install ShadCN UI and initialize components
  - Install Prisma, Zustand, React Hook Form, Zod, bcrypt, jsonwebtoken
  - Install fast-check for property-based testing
  - Set up ESLint and Prettier
  - Create folder structure for app routes, components, services, types
  - _Requirements: 21.1, 21.5_

- [ ] 2. Set up database schema and Prisma
  - Create Prisma schema with all models (User, Movie, Genre, Theater, Screen, Seat, Showtime, ShowtimeSeat, SeatLock, Booking, BookingSeat, Payment)
  - Define enums (Role, TheaterStatus, SeatType, SeatStatus, BookingStatus, PaymentStatus)
  - Configure relationships and cascade rules
  - Add indexes on frequently queried columns
  - Create initial migration
  - _Requirements: 20.1, 20.2, 20.4, 18.2_

- [ ] 3. Create database seed script
  - Write seed script to generate sample users (admin, theater owner, regular users)
  - Generate sample movies with genres and posters
  - Create sample theaters with screens and seat layouts
  - Generate sample showtimes
  - _Requirements: 21.4_

- [ ] 4. Implement authentication service and middleware
  - Create auth service with signup, login, password hashing, JWT generation
  - Implement JWT verification middleware
  - Create role-based access control middleware
  - Add token expiration handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.1 Write property test for password hashing
  - **Property 1: Password hashing consistency**
  - **Validates: Requirements 1.1**

- [ ] 4.2 Write property test for JWT token generation
  - **Property 2: JWT token generation**
  - **Validates: Requirements 1.2**

- [ ] 4.3 Write property test for JWT validation
  - **Property 3: JWT token validation**
  - **Validates: Requirements 1.3**

- [ ] 4.4 Write property test for role-based access control
  - **Property 4: Role-based access control**
  - **Validates: Requirements 1.4**

- [ ] 5. Create authentication API routes
  - Implement POST /api/auth/signup endpoint with validation
  - Implement POST /api/auth/login endpoint
  - Implement GET /api/auth/me endpoint for current user
  - Add input validation using Zod schemas
  - _Requirements: 1.1, 1.2, 17.1_

- [ ] 6. Build authentication UI components
  - Create LoginForm component with React Hook Form and Zod validation
  - Create SignupForm component with role selection
  - Create AuthProvider context for managing auth state
  - Create ProtectedRoute HOC for route protection
  - Implement theme toggle component
  - _Requirements: 1.1, 1.2, 16.1, 16.2, 16.3_

- [ ] 6.1 Write property test for theme persistence
  - **Property 61: Theme preference persistence**
  - **Validates: Requirements 16.2**

- [ ] 6.2 Write property test for theme restoration
  - **Property 62: Theme preference restoration**
  - **Validates: Requirements 16.3**

- [ ] 7. Implement movie service layer
  - Create movie service with CRUD operations
  - Implement movie filtering by city, language, genre
  - Add poster upload functionality
  - Implement genre CRUD operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 6.3, 6.4, 6.5_

- [ ] 7.1 Write property test for movie creation
  - **Property 5: Movie creation completeness**
  - **Validates: Requirements 2.1**

- [ ] 7.2 Write property test for movie update
  - **Property 7: Movie update persistence**
  - **Validates: Requirements 2.3**

- [ ] 7.3 Write property test for movie cascade deletion
  - **Property 8: Movie cascade deletion**
  - **Validates: Requirements 2.4**

- [ ] 7.4 Write property test for genre CRUD
  - **Property 9: Genre CRUD operations**
  - **Validates: Requirements 2.5**

- [ ] 7.5 Write property test for movie filtering
  - **Property 25: City filter accuracy**
  - **Property 26: Language filter accuracy**
  - **Property 27: Genre filter accuracy**
  - **Property 28: Multiple filter combination**
  - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [ ] 8. Create movie management API routes
  - Implement GET /api/movies with filtering support
  - Implement GET /api/movies/:id
  - Implement POST /api/movies (Admin only)
  - Implement PUT /api/movies/:id (Admin only)
  - Implement DELETE /api/movies/:id (Admin only)
  - Implement POST /api/movies/:id/poster (Admin only)
  - Implement genre CRUD endpoints (Admin only)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Build admin movie management UI
  - Create AdminDashboard component with analytics
  - Create MovieManagement component with list and CRUD
  - Create MovieForm component with poster upload
  - Create GenreManagement component
  - Implement movie card with hover effects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5_

- [ ] 9.1 Write property test for analytics calculations
  - **Property 11: Booking count accuracy**
  - **Property 12: Revenue calculation accuracy**
  - **Property 13: Occupancy rate calculation**
  - **Validates: Requirements 3.3, 3.4, 3.5**

- [ ] 10. Implement theater service layer
  - Create theater service with CRUD operations
  - Implement theater approval functionality
  - Add theater filtering by city
  - Implement owner validation
  - _Requirements: 4.1, 4.2, 3.1, 3.2_

- [ ] 10.1 Write property test for theater creation
  - **Property 14: Theater creation with owner association**
  - **Validates: Requirements 4.1**

- [ ] 10.2 Write property test for theater approval
  - **Property 10: Theater approval status transition**
  - **Validates: Requirements 3.2**

- [ ] 11. Create theater API routes
  - Implement GET /api/theaters with filtering
  - Implement GET /api/theaters/:id
  - Implement POST /api/theaters (Theater Owner only)
  - Implement PUT /api/theaters/:id (Theater Owner only)
  - Implement DELETE /api/theaters/:id (Theater Owner only)
  - Implement POST /api/theaters/:id/approve (Admin only)
  - _Requirements: 4.1, 3.1, 3.2_

- [ ] 12. Build theater owner theater management UI
  - Create TheaterManagement component
  - Create TheaterForm component
  - Create TheaterApproval component for admin
  - _Requirements: 4.1, 3.1, 3.2_

- [ ] 13. Implement screen and seat service layer
  - Create screen service with CRUD operations
  - Implement seat layout builder logic
  - Create seat generation from layout configuration
  - Validate screen name uniqueness within theater
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 13.1 Write property test for screen creation
  - **Property 15: Screen-theater association**
  - **Validates: Requirements 4.2**

- [ ] 13.2 Write property test for seat layout generation
  - **Property 16: Seat layout grid creation**
  - **Property 17: Seat pricing storage**
  - **Validates: Requirements 4.3, 4.4**

- [ ] 13.3 Write property test for screen name uniqueness
  - **Property 18: Screen name uniqueness within theater**
  - **Validates: Requirements 4.5**

- [ ] 14. Create screen API routes
  - Implement GET /api/theaters/:theaterId/screens
  - Implement GET /api/screens/:id
  - Implement POST /api/theaters/:theaterId/screens (Theater Owner only)
  - Implement PUT /api/screens/:id (Theater Owner only)
  - Implement DELETE /api/screens/:id (Theater Owner only)
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 15. Build screen management UI
  - Create ScreenManagement component
  - Create SeatLayoutBuilder interactive component
  - Add seat type and pricing configuration
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 16. Implement showtime service layer
  - Create showtime service with CRUD operations
  - Implement showtime conflict detection
  - Add showtime seat initialization logic
  - Implement booking restriction checks for updates/deletes
  - Add showtime filtering by movie, theater, city, date
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.2_

- [ ] 16.1 Write property test for showtime validation
  - **Property 19: Showtime required fields validation**
  - **Validates: Requirements 5.1**

- [ ] 16.2 Write property test for conflict detection
  - **Property 20: Showtime conflict detection**
  - **Validates: Requirements 5.2**

- [ ] 16.3 Write property test for seat initialization
  - **Property 21: Showtime seat initialization**
  - **Validates: Requirements 5.3**

- [ ] 16.4 Write property test for update/delete restrictions
  - **Property 22: Showtime update restriction with bookings**
  - **Property 23: Showtime deletion restriction with bookings**
  - **Validates: Requirements 5.4, 5.5**

- [ ] 17. Create showtime API routes
  - Implement GET /api/showtimes with filtering
  - Implement GET /api/showtimes/:id
  - Implement POST /api/showtimes (Theater Owner only)
  - Implement PUT /api/showtimes/:id (Theater Owner only)
  - Implement DELETE /api/showtimes/:id (Theater Owner only)
  - Implement GET /api/showtimes/:id/seats for seat availability
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.2, 7.4_

- [ ] 18. Build showtime management UI
  - Create ShowtimeManagement component
  - Create ShowtimeForm with conflict detection
  - Add calendar view for showtimes
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 19. Build user movie browsing UI
  - Create MovieGrid component with responsive layout
  - Create MovieCard component with poster and hover effects
  - Create MovieFilters component for city, language, genre
  - Implement lazy loading for movie posters
  - Add loading skeletons
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 18.1, 18.5_

- [ ] 19.1 Write property test for movie listing
  - **Property 24: Movie listing completeness**
  - **Validates: Requirements 6.1**

- [ ] 20. Build theater and showtime selection UI
  - Create TheaterList component with city grouping
  - Create ShowtimeSelector component
  - Display seat availability counts
  - Show screen name and start time
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 20.1 Write property test for theater grouping
  - **Property 29: Theater grouping by city**
  - **Validates: Requirements 7.1**

- [ ] 20.2 Write property test for showtime listing
  - **Property 30: Showtime listing for theater**
  - **Validates: Requirements 7.2**

- [ ] 20.3 Write property test for availability count
  - **Property 31: Seat availability count accuracy**
  - **Validates: Requirements 7.4**

- [ ] 21. Implement seat lock service layer
  - Create seat lock service with lock creation
  - Implement lock validation and expiration checking
  - Add lock release functionality
  - Create scheduled job for expired lock cleanup
  - Implement concurrent lock prevention with transactions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.1, 14.2, 14.3_

- [ ] 21.1 Write property test for seat lock creation
  - **Property 37: Seat lock creation with expiration**
  - **Validates: Requirements 9.1**

- [ ] 21.2 Write property test for lock exclusivity
  - **Property 38: Seat lock exclusivity**
  - **Validates: Requirements 9.2**

- [ ] 21.3 Write property test for lock expiration
  - **Property 39: Expired lock release**
  - **Property 41: Lock timeout release**
  - **Validates: Requirements 9.3, 9.5**

- [ ] 21.4 Write property test for concurrent lock prevention
  - **Property 57: Concurrent seat lock prevention**
  - **Property 58: Lock creation duplicate prevention**
  - **Property 59: Concurrent seat status update consistency**
  - **Validates: Requirements 14.1, 14.2, 14.3**

- [ ] 22. Build interactive seat selection UI
  - Create SeatMap component with grid layout
  - Create SeatLegend component with color coding
  - Implement seat selection/deselection logic
  - Add visual feedback for seat statuses
  - Prevent selection of booked seats
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ] 22.1 Write property test for seat map display
  - **Property 33: Seat map completeness**
  - **Validates: Requirements 8.1**

- [ ] 22.2 Write property test for seat selection
  - **Property 34: Seat selection cart addition**
  - **Property 35: Seat deselection cart removal**
  - **Property 36: Booked seat selection prevention**
  - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 23. Implement booking cart and summary
  - Create BookingSummary sticky panel component
  - Implement price calculation logic
  - Add seat details display (numbers, types, prices)
  - Implement cart state management with Zustand
  - Add smooth animations with Framer Motion
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 23.1 Write property test for price calculation
  - **Property 42: Total price calculation**
  - **Validates: Requirements 10.2**

- [ ] 23.2 Write property test for booking summary content
  - **Property 44: Booking summary completeness**
  - **Validates: Requirements 10.4**

- [ ] 24. Create seat locking API routes
  - Implement POST /api/bookings/lock-seats endpoint
  - Add lock validation before payment
  - Implement lock release endpoint
  - Add transaction handling for lock operations
  - _Requirements: 9.1, 9.2, 10.3_

- [ ] 24.1 Write property test for lock validation
  - **Property 43: Payment lock validation**
  - **Validates: Requirements 10.3**

- [ ] 25. Implement payment service with Stripe
  - Set up Stripe client configuration
  - Create payment service with payment intent creation
  - Implement webhook handler for payment events
  - Add payment confirmation logic
  - Handle payment failures and lock release
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ] 25.1 Write property test for payment intent creation
  - **Property 45: Payment intent amount accuracy**
  - **Validates: Requirements 11.1**

- [ ] 25.2 Write property test for failed payment handling
  - **Property 48: Failed payment lock release**
  - **Validates: Requirements 11.5**

- [ ] 26. Create payment API routes
  - Implement POST /api/payments/create-intent endpoint
  - Implement POST /api/payments/webhook for Stripe webhooks
  - Add webhook signature verification
  - Implement idempotency using Stripe event IDs
  - _Requirements: 11.1, 11.2_

- [ ] 27. Implement booking service layer
  - Create booking service with booking creation
  - Implement booking code generation
  - Add seat status update from locked to booked
  - Implement booking retrieval and history
  - Add booking sorting and categorization
  - _Requirements: 11.3, 11.4, 12.1, 12.4, 12.5, 13.1, 13.3, 13.4_

- [ ] 27.1 Write property test for booking creation
  - **Property 40: Lock to booking conversion**
  - **Property 46: Webhook booking creation**
  - **Property 47: Booking seat status update**
  - **Validates: Requirements 9.4, 11.3, 11.4**

- [ ] 27.2 Write property test for booking ID uniqueness
  - **Property 49: Booking ID uniqueness**
  - **Validates: Requirements 12.1**

- [ ] 27.3 Write property test for booking retrieval
  - **Property 52: Booking retrieval by ID**
  - **Validates: Requirements 12.5**

- [ ] 27.4 Write property test for booking history
  - **Property 53: Booking history completeness**
  - **Property 55: Booking history sorting**
  - **Property 56: Booking temporal categorization**
  - **Validates: Requirements 13.1, 13.3, 13.4**

- [ ] 28. Create booking API routes
  - Implement POST /api/bookings endpoint
  - Implement GET /api/bookings for user history
  - Implement GET /api/bookings/:id for booking details
  - Add proper authorization checks
  - _Requirements: 12.4, 12.5, 13.1_

- [ ] 29. Build payment UI component
  - Create PaymentForm component with Stripe Elements
  - Add payment processing feedback
  - Implement error handling for payment failures
  - Add loading states during payment
  - _Requirements: 11.1, 11.5_

- [ ] 30. Build booking confirmation UI
  - Create BookingConfirmation component
  - Display booking details (movie, theater, showtime, seats, amount)
  - Show unique booking code
  - Add option to view booking details
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 30.1 Write property test for confirmation content
  - **Property 50: Booking confirmation completeness**
  - **Property 51: Booking payment reference storage**
  - **Validates: Requirements 12.3, 12.4**

- [ ] 31. Build booking history UI
  - Create BookingHistory component
  - Display all user bookings with details
  - Implement sorting by showtime date
  - Distinguish between upcoming and past bookings
  - Add booking detail view
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 31.1 Write property test for booking display
  - **Property 54: Booking display information**
  - **Validates: Requirements 13.2**

- [ ] 32. Implement security features
  - Add input validation with Zod on all API routes
  - Implement rate limiting middleware
  - Add input sanitization for SQL injection and XSS prevention
  - Implement CSRF protection
  - Add security headers
  - _Requirements: 17.1, 17.2, 17.3, 17.5_

- [ ] 32.1 Write property test for input validation
  - **Property 63: Form input validation**
  - **Validates: Requirements 17.1**

- [ ] 32.2 Write property test for rate limiting
  - **Property 64: Rate limiting enforcement**
  - **Validates: Requirements 17.2**

- [ ] 32.3 Write property test for input sanitization
  - **Property 65: Input sanitization**
  - **Validates: Requirements 17.3**

- [ ] 32.4 Write property test for CSRF protection
  - **Property 66: CSRF protection**
  - **Validates: Requirements 17.5**

- [ ] 33. Implement error handling and logging
  - Create error logging service
  - Add error boundary components
  - Implement toast notification system
  - Add error logging to all API routes
  - Create user-friendly error messages
  - _Requirements: 19.1, 19.2, 19.5_

- [ ] 33.1 Write property test for error logging
  - **Property 67: Error logging**
  - **Validates: Requirements 19.5**

- [ ] 34. Implement data integrity features
  - Add cascade deletion tests
  - Implement unique constraints validation
  - Add database transaction error handling
  - _Requirements: 20.2, 20.4, 14.5_

- [ ] 34.1 Write property test for cascade deletion
  - **Property 68: Cascade deletion**
  - **Validates: Requirements 20.2**

- [ ] 34.2 Write property test for uniqueness constraints
  - **Property 69: Email and booking ID uniqueness**
  - **Validates: Requirements 20.4**

- [ ] 34.3 Write property test for transaction conflict handling
  - **Property 60: Transaction conflict handling**
  - **Validates: Requirements 14.5**

- [ ] 35. Implement API response standardization
  - Create consistent response format utilities
  - Add HTTP status code helpers
  - Implement request validation middleware
  - _Requirements: 22.2, 22.3, 22.5_

- [ ] 35.1 Write property test for API responses
  - **Property 70: HTTP status code correctness**
  - **Property 71: JSON response format consistency**
  - **Property 72: Request validation**
  - **Validates: Requirements 22.2, 22.3, 22.5**

- [ ] 36. Build shared UI components
  - Create Navbar with role-based menu items
  - Implement ThemeToggle component
  - Create LoadingSkeleton components
  - Build Toast notification system
  - Create ErrorBoundary component
  - Add responsive layout components
  - _Requirements: 15.1, 15.2, 15.3, 16.1, 18.5, 19.1, 19.2_

- [ ] 37. Implement admin analytics dashboard
  - Create analytics calculation functions
  - Build dashboard charts with revenue visualization
  - Display total bookings, revenue, occupancy rate
  - Add date range filtering
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 38. Set up Docker configuration
  - Create Dockerfile for application
  - Create docker-compose.yml with PostgreSQL service
  - Configure environment variables
  - Add health checks
  - _Requirements: 21.2, 21.3_

- [ ] 39. Create deployment documentation
  - Write comprehensive README with setup instructions
  - Document environment variables
  - Add deployment guide for Vercel and Railway
  - Document database migration process
  - Add troubleshooting section
  - _Requirements: 21.5_

- [ ] 40. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 41. Write integration tests for critical flows
  - Test complete booking flow from selection to payment
  - Test authentication and authorization flow
  - Test concurrent seat booking scenarios
  - Test payment webhook processing
  - Test seat lock expiration cleanup

- [ ] 42. Set up end-to-end tests
  - Test user booking journey with Playwright
  - Test admin movie management workflow
  - Test theater owner theater creation workflow
  - Test error scenarios and edge cases
