import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from './lib/logger';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// CRITICAL: Webhook route MUST use raw body for Stripe signature verification
// This MUST come BEFORE express.json() middleware
import webhookRoutes from './routes/webhook.routes';
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  webhookRoutes
);

// Body parsing (after webhook route)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
  })
);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // TODO: Add database and Redis health checks
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// Import routes
import authRoutes from './routes/auth.routes';
import movieRoutes from './routes/movie.routes';
import genreRoutes from './routes/genre.routes';
import theaterRoutes from './routes/theater.routes';
import screenRoutes from './routes/screen.routes';
import showtimeRoutes from './routes/showtime.routes';
import seatLockRoutes from './routes/seat-lock.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Movie Booking Platform API',
    version: '1.0.0',
    status: 'running',
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/screens', screenRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/seat-locks', seatLockRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, req: req.url }, 'Unhandled error');

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

export default app;
