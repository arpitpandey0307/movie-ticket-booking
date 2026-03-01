# Movie Ticket Booking Platform

> Enterprise-grade movie ticket booking system similar to BookMyShow, built with modern technologies and scalable architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## 🎯 Features

- ✅ **Multi-Role System**: Admin, Theater Owner, and User roles with distinct capabilities
- ✅ **Authentication**: JWT-based auth with bcrypt password hashing
- ✅ **Movie Management**: CRUD operations with Redis caching (Admin only)
- ✅ **Genre Management**: Genre categorization with caching
- 🚧 **Real-time Seat Booking**: Concurrent seat locking (In Progress)
- 🚧 **Payment Integration**: Stripe payment processing (Planned)
- ✅ **Enterprise Architecture**: Separated frontend and backend services
- ✅ **High Performance**: Redis caching, rate limiting
- ✅ **Observability**: Structured logging with Pino, error tracking ready
- ✅ **Security**: Rate limiting, input validation, CSRF protection, secure authentication

## 🏗️ Architecture

### Monorepo Structure

```
movie-ticket-booking-platform/
├── apps/
│   ├── web/          # Next.js 14 Frontend (Vercel)
│   └── api/          # Express/Fastify Backend (Railway/ECS)
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   └── prisma/       # Database schema and migrations
└── pre-plan/         # Project specifications and design docs
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + ShadCN UI
- Zustand (State Management)
- React Hook Form + Zod

**Backend:**
- Express.js / Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication

**Infrastructure:**
- Docker & Docker Compose
- Vercel (Frontend)
- Railway / AWS ECS (Backend)
- AWS RDS / Railway (PostgreSQL)
- AWS ElastiCache / Upstash (Redis)

**Observability:**
- Pino (Structured Logging)
- Sentry (Error Tracking)
- Prometheus (Metrics)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker (optional, for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arpitpandey0307/movie-ticket-booking.git
   cd movie-ticket-booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

4. **Set up database**
   ```bash
   # Run migrations
   cd packages/prisma
   npx prisma migrate dev
   
   # Seed database
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually
   cd apps/web && npm run dev    # Frontend on http://localhost:3000
   cd apps/api && npm run dev    # Backend on http://localhost:4000
   ```

### Using Docker

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 Documentation

- [Requirements Document](./pre-plan/specs/movie-ticket-booking-platform/requirements.md)
- [Design Document](./pre-plan/specs/movie-ticket-booking-platform/design.md)
- [Implementation Tasks](./pre-plan/specs/movie-ticket-booking-platform/tasks.md)
- [Enterprise Upgrades](./pre-plan/specs/movie-ticket-booking-platform/ENTERPRISE_UPGRADES.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run property-based tests
npm run test:property
```

## 🔒 Security

- JWT-based authentication with HTTP-only cookies
- Role-based access control (RBAC)
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CSRF protection
- Security headers (Helmet)
- SQL injection prevention (Prisma)

## 📊 Performance

- **Target**: 10,000 concurrent users, 1000 bookings/minute
- Redis caching for seat availability and movie listings
- Database read replicas for query optimization
- Horizontal scaling with load balancer
- Optimized database indexes
- CDN for static assets

## 🚢 Deployment

### Quick Deploy to Railway

**Backend API (Already Deployed ✅)**
- See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for API deployment details
- API URL: `https://your-api-service.up.railway.app`

**Frontend Web App (Deploy Now! 🚀)**
- See [QUICK_WEB_DEPLOY.md](./QUICK_WEB_DEPLOY.md) for 5-minute deployment
- See [WEB_DEPLOYMENT_GUIDE.md](./WEB_DEPLOYMENT_GUIDE.md) for detailed guide
- See [WEB_DEPLOYMENT_CHECKLIST.md](./WEB_DEPLOYMENT_CHECKLIST.md) for step-by-step checklist

### Deployment Guides

- **API Deployment**: [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- **Web Deployment**: [WEB_DEPLOYMENT_GUIDE.md](./WEB_DEPLOYMENT_GUIDE.md)
- **Quick Start**: [QUICK_WEB_DEPLOY.md](./QUICK_WEB_DEPLOY.md)
- **Troubleshooting**: [WEB_DEPLOYMENT_TROUBLESHOOTING.md](./WEB_DEPLOYMENT_TROUBLESHOOTING.md)

### Alternative Deployment Options

**Frontend (Vercel)**
```bash
cd apps/web
vercel --prod
```

**Backend (AWS ECS)**
```bash
docker build -t movie-booking-api .
docker push <your-registry>/movie-booking-api:latest
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

Built with ❤️ by the development team

## 🙏 Acknowledgments

- Inspired by BookMyShow
- Built with enterprise-grade best practices
- Designed for scalability and maintainability

---

**Status**: 🚧 In Active Development

**Current Phase**: Phase 2 - Movie & Theater Management (60% Complete)

**Completed:**
- ✅ Phase 0: Infrastructure Setup
- ✅ Phase 1: Authentication & Authorization  
- ✅ Phase 2: Movie & Genre Backend Services

**Next Up:**
- Theater Management
- Showtime Management
- Seat Booking with Concurrency Control
- Payment Integration

For questions or support, please open an issue on GitHub.
