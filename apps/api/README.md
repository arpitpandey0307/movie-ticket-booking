# Movie Booking Platform - Backend API

Express.js backend service for the Movie Ticket Booking Platform.

## Tech Stack

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
- Pino (Logging)
- Stripe (Payments)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run database migrations:
   ```bash
   cd ../../packages/prisma
   npx prisma migrate dev
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. API will be available at [http://localhost:4000](http://localhost:4000)

## Project Structure

```
apps/api/
├── src/
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic
│   ├── middleware/   # Express middleware
│   ├── lib/          # Utilities (Prisma, Redis, Logger)
│   ├── utils/        # Helper functions
│   ├── types/        # TypeScript types
│   ├── app.ts        # Express app setup
│   └── server.ts     # Server entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Movies
- `GET /api/movies` - List movies (with filters)
- `GET /api/movies/:id` - Get movie details
- `POST /api/movies` - Create movie (Admin)
- `PUT /api/movies/:id` - Update movie (Admin)
- `DELETE /api/movies/:id` - Delete movie (Admin)

### Theaters
- `GET /api/theaters` - List theaters
- `POST /api/theaters` - Create theater (Theater Owner)
- `POST /api/theaters/:id/approve` - Approve theater (Admin)

### Bookings
- `POST /api/bookings/lock-seats` - Lock seats
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook

## Features

- JWT-based authentication
- Role-based access control
- Rate limiting with Redis
- Structured logging with Pino
- Error tracking with Sentry
- Webhook idempotency
- Decimal precision for money
- Concurrent seat locking
