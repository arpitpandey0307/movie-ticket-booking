import { Router } from 'express';
import screenService from '../services/screen.service';
import theaterService from '../services/theater.service';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createScreenSchema, updateScreenSchema } from '../utils/validators';
import logger from '../lib/logger';

const router = Router();

// GET /api/theaters/:theaterId/screens - List screens for theater
// ENTERPRISE: Theater access check FIRST, then screens
router.get('/theaters/:theaterId/screens', optionalAuthenticate, async (req, res) => {
  try {
    const { theaterId } = req.params;
    const userRole = req.user?.role || 'USER';
    const currentUserId = req.user?.id;

    // ENTERPRISE: Validate theater access FIRST (prevents existence leak)
    await theaterService.getTheaterById(theaterId, userRole, currentUserId);

    // Then fetch screens (theater access already validated)
    const screens = await screenService.getScreensByTheater(theaterId, userRole, currentUserId);

    res.json({
      success: true,
      data: screens,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message, theaterId: req.params.theaterId }, 'Get screens error');
    res.status(404).json({
      success: false,
      error: {
        code: 'THEATER_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// GET /api/screens/:id - Get screen by ID
// ENTERPRISE: Must validate parent theater visibility
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const userRole = req.user?.role || 'USER';
    const currentUserId = req.user?.id;

    // Get screen with theater info
    const screen = await screenService.getScreenById(req.params.id);

    // ENTERPRISE: Validate parent theater access (prevents leak)
    await theaterService.getTheaterById(screen.theater.id, userRole, currentUserId);

    res.json({
      success: true,
      data: screen,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message, screenId: req.params.id }, 'Get screen error');
    res.status(404).json({
      success: false,
      error: {
        code: 'SCREEN_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// POST /api/theaters/:theaterId/screens - Create screen (Theater Owner only)
// ENTERPRISE: theaterId from route param ONLY, never from body
router.post(
  '/theaters/:theaterId/screens',
  authenticate,
  authorize('THEATER_OWNER'),
  validate(createScreenSchema),
  async (req, res) => {
    try {
      // ENTERPRISE: Use theaterId from route param, ignore any body.theaterId
      const theaterId = req.params.theaterId;
      const ownerId = req.user!.id;

      const screen = await screenService.createScreen({
        name: req.body.name,
        seats: req.body.seats,
        theaterId, // From route param - trusted
        ownerId, // From JWT - trusted
      });

      res.status(201).json({
        success: true,
        data: screen,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        {
          error: error.message,
          theaterId: req.params.theaterId,
          userId: req.user!.id,
        },
        'Create screen error'
      );

      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message.includes('not found') ? 'THEATER_NOT_FOUND' : 'CREATE_SCREEN_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// PUT /api/screens/:id - Update screen (Theater Owner only)
// ENTERPRISE: Only name updates, service blocks if showtimes exist
router.put(
  '/:id',
  authenticate,
  authorize('THEATER_OWNER'),
  validate(updateScreenSchema),
  async (req, res) => {
    try {
      const screen = await screenService.updateScreen(req.params.id, req.user!.id, req.body);

      res.json({
        success: true,
        data: screen,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        {
          error: error.message,
          screenId: req.params.id,
          userId: req.user!.id,
        },
        'Update screen error'
      );

      // Always return 404 - never leak existence with 403
      res.status(404).json({
        success: false,
        error: {
          code: 'SCREEN_NOT_FOUND',
          message: error.message,
        },
      });
    }
  }
);

// DELETE /api/screens/:id - Delete screen (Theater Owner only)
// ENTERPRISE: Service blocks if showtimes exist, cascades seats
router.delete('/:id', authenticate, authorize('THEATER_OWNER'), async (req, res) => {
  try {
    await screenService.deleteScreen(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Screen deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(
      {
        error: error.message,
        screenId: req.params.id,
        userId: req.user!.id,
      },
      'Delete screen error'
    );

    // Always return 404 - never leak existence with 403
    res.status(404).json({
      success: false,
      error: {
        code: 'SCREEN_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

export default router;
