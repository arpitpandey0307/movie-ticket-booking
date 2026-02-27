import { Router } from 'express';
import genreService from '../services/genre.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import logger from '../lib/logger';

const router = Router();

// GET /api/genres - List all genres
router.get('/', async (req, res) => {
  try {
    const genres = await genreService.getGenres();

    res.json({
      success: true,
      data: genres,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get genres error');
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_GENRES_ERROR',
        message: error.message,
      },
    });
  }
});

// GET /api/genres/:id - Get genre by ID
router.get('/:id', async (req, res) => {
  try {
    const genre = await genreService.getGenreById(req.params.id);

    res.json({
      success: true,
      data: genre,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get genre error');
    res.status(404).json({
      success: false,
      error: {
        code: 'GENRE_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// POST /api/genres - Create genre (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and slug are required',
        },
      });
    }

    const genre = await genreService.createGenre({ name, slug });

    res.status(201).json({
      success: true,
      data: genre,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Create genre error');
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_GENRE_ERROR',
        message: error.message,
      },
    });
  }
});

// PUT /api/genres/:id - Update genre (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const genre = await genreService.updateGenre(req.params.id, req.body);

    res.json({
      success: true,
      data: genre,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Update genre error');
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_GENRE_ERROR',
        message: error.message,
      },
    });
  }
});

// DELETE /api/genres/:id - Delete genre (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await genreService.deleteGenre(req.params.id);

    res.json({
      success: true,
      message: 'Genre deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Delete genre error');
    res.status(400).json({
      success: false,
      error: {
        code: 'DELETE_GENRE_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
