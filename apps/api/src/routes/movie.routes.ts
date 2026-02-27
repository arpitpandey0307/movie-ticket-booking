import { Router } from 'express';
import movieService from '../services/movie.service';
import genreService from '../services/genre.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createMovieSchema } from '../utils/validators';
import logger from '../lib/logger';

const router = Router();

// GET /api/movies - List all movies with filters
router.get('/', async (req, res) => {
  try {
    const filters = {
      city: req.query.city as string,
      language: req.query.language as string,
      genreId: req.query.genreId as string,
      search: req.query.search as string,
    };

    const movies = await movieService.getMovies(filters);

    res.json({
      success: true,
      data: movies,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get movies error');
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MOVIES_ERROR',
        message: error.message,
      },
    });
  }
});

// GET /api/movies/:id - Get movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await movieService.getMovieById(req.params.id);

    res.json({
      success: true,
      data: movie,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get movie error');
    res.status(404).json({
      success: false,
      error: {
        code: 'MOVIE_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

// POST /api/movies - Create movie (Admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createMovieSchema),
  async (req, res) => {
    try {
      const movie = await movieService.createMovie(req.body);

      res.status(201).json({
        success: true,
        data: movie,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Create movie error');
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_MOVIE_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// PUT /api/movies/:id - Update movie (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const movie = await movieService.updateMovie(req.params.id, req.body);

    res.json({
      success: true,
      data: movie,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Update movie error');
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_MOVIE_ERROR',
        message: error.message,
      },
    });
  }
});

// DELETE /api/movies/:id - Delete movie (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await movieService.deleteMovie(req.params.id);

    res.json({
      success: true,
      message: 'Movie deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Delete movie error');
    res.status(400).json({
      success: false,
      error: {
        code: 'DELETE_MOVIE_ERROR',
        message: error.message,
      },
    });
  }
});

// POST /api/movies/:id/poster - Upload poster (Admin only)
router.post('/:id/poster', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { posterUrl } = req.body;

    if (!posterUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Poster URL is required',
        },
      });
    }

    const movie = await movieService.uploadPoster(req.params.id, posterUrl);

    res.json({
      success: true,
      data: movie,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Upload poster error');
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_POSTER_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
