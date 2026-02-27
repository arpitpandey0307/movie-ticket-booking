import { Router } from 'express';
import theaterService from '../services/theater.service';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createTheaterSchema,
  updateTheaterSchema,
  getTheatersQuerySchema,
  rejectTheaterSchema,
} from '../utils/validators';
import logger from '../lib/logger';

const router = Router();

// GET /api/theaters - List theaters (public + authenticated)
// ENTERPRISE: Optional auth - public users see APPROVED only
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    // Validate query params
    const queryValidation = getTheatersQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: queryValidation.error.issues[0].message,
        },
      });
    }

    const { city, status, ownerId } = queryValidation.data;

    // ENTERPRISE: Service enforces owner scoping
    const theaters = await theaterService.getTheaters({
      city,
      status: status as any,
      requestedOwnerId: ownerId, // Untrusted from query
      currentUserId: req.user?.id, // Trusted from JWT
      userRole: req.user?.role || 'USER', // Default to USER for public
    });

    res.json({
      success: true,
      data: theaters,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get theaters error');
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_THEATERS_ERROR',
        message: error.message,
      },
    });
  }
});

// GET /api/theaters/:id - Get theater by ID (public + authenticated)
// ENTERPRISE: Status-based access control
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const theater = await theaterService.getTheaterById(
      req.params.id,
      req.user?.role || 'USER', // Default to USER for public
      req.user?.id
    );

    res.json({
      success: true,
      data: theater,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message, theaterId: req.params.id }, 'Get theater error');
    res.status(404).json({
      success: false,
      error: {
        code: 'THEATER_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// POST /api/theaters - Create theater (Theater Owner only)
// ENTERPRISE: ownerId from JWT, never from body
router.post(
  '/',
  authenticate,
  authorize('THEATER_OWNER'),
  validate(createTheaterSchema),
  async (req, res) => {
    try {
      // CRITICAL: Force ownerId from JWT, ignore any body.ownerId
      const theater = await theaterService.createTheater({
        ...req.body,
        ownerId: req.user!.id, // From JWT - trusted
      });

      res.status(201).json({
        success: true,
        data: theater,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message, userId: req.user!.id }, 'Create theater error');
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_THEATER_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// PUT /api/theaters/:id - Update theater (Theater Owner only)
// ENTERPRISE: Service validates ownership
router.put(
  '/:id',
  authenticate,
  authorize('THEATER_OWNER'),
  validate(updateTheaterSchema),
  async (req, res) => {
    try {
      // Service enforces: theater.ownerId === req.user.id
      const theater = await theaterService.updateTheater(
        req.params.id,
        req.user!.id, // From JWT - trusted
        req.body
      );

      res.json({
        success: true,
        data: theater,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, theaterId: req.params.id, userId: req.user!.id },
        'Update theater error'
      );
      
      // Always return 404 - never leak existence with 403
      res.status(404).json({
        success: false,
        error: {
          code: 'THEATER_NOT_FOUND',
          message: error.message,
        },
      });
    }
  }
);

// DELETE /api/theaters/:id - Delete theater (Theater Owner only)
// ENTERPRISE: Service validates ownership
router.delete('/:id', authenticate, authorize('THEATER_OWNER'), async (req, res) => {
  try {
    // Service enforces: theater.ownerId === req.user.id
    await theaterService.deleteTheater(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Theater deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, theaterId: req.params.id, userId: req.user!.id },
      'Delete theater error'
    );
    
    // Always return 404 - never leak existence with 403
    res.status(404).json({
      success: false,
      error: {
        code: 'THEATER_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// POST /api/theaters/:id/approve - Approve theater (Admin only)
// ENTERPRISE: Defense in depth - RBAC + service validation
router.post('/:id/approve', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Service validates: status === PENDING (atomic transaction)
    const theater = await theaterService.approveTheater(
      req.params.id,
      req.user!.id // Admin ID for audit trail
    );

    res.json({
      success: true,
      data: theater,
      message: 'Theater approved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, theaterId: req.params.id, adminId: req.user!.id },
      'Approve theater error'
    );
    
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'APPROVE_THEATER_ERROR',
        message: error.message,
      },
    });
  }
});

// POST /api/theaters/:id/reject - Reject theater (Admin only)
// ENTERPRISE: Defense in depth - RBAC + service validation
router.post(
  '/:id/reject',
  authenticate,
  authorize('ADMIN'),
  validate(rejectTheaterSchema),
  async (req, res) => {
    try {
      // Service validates: status === PENDING (atomic transaction)
      const theater = await theaterService.rejectTheater(
        req.params.id,
        req.user!.id, // Admin ID for audit trail
        req.body.reason
      );

      res.json({
        success: true,
        data: theater,
        message: 'Theater rejected successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, theaterId: req.params.id, adminId: req.user!.id },
        'Reject theater error'
      );
      
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'REJECT_THEATER_ERROR',
          message: error.message,
        },
      });
    }
  }
);

export default router;
