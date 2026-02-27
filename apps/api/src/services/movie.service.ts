import prisma from '../lib/prisma';
import redis from '../lib/redis';
import logger from '../lib/logger';

interface CreateMovieData {
  title: string;
  description: string;
  duration: number;
  language: string;
  releaseDate: string;
  rating?: string;
  genreIds: string[];
}

interface UpdateMovieData {
  title?: string;
  description?: string;
  duration?: number;
  language?: string;
  releaseDate?: string;
  rating?: string;
  genreIds?: string[];
}

interface MovieFilters {
  city?: string;
  language?: string;
  genreId?: string;
  search?: string;
}

export class MovieService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_KEY_PREFIX = 'movies';

  async createMovie(data: CreateMovieData) {
    const movie = await prisma.movie.create({
      data: {
        title: data.title,
        description: data.description,
        duration: data.duration,
        language: data.language,
        releaseDate: new Date(data.releaseDate),
        rating: data.rating,
        genres: {
          create: data.genreIds.map((genreId) => ({
            genreId,
          })),
        },
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    logger.info({ movieId: movie.id }, 'Movie created');
    return movie;
  }

  async updateMovie(id: string, data: UpdateMovieData) {
    const movie = await prisma.movie.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.duration && { duration: data.duration }),
        ...(data.language && { language: data.language }),
        ...(data.releaseDate && { releaseDate: new Date(data.releaseDate) }),
        ...(data.rating && { rating: data.rating }),
        ...(data.genreIds && {
          genres: {
            deleteMany: {},
            create: data.genreIds.map((genreId) => ({
              genreId,
            })),
          },
        }),
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    logger.info({ movieId: id }, 'Movie updated');
    return movie;
  }

  async deleteMovie(id: string) {
    await prisma.movie.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateCache();

    logger.info({ movieId: id }, 'Movie deleted');
  }

  async getMovies(filters: MovieFilters = {}) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:list:${JSON.stringify(filters)}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Movies retrieved from cache');
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Redis cache read failed');
    }

    // Build query
    const where: any = {};

    if (filters.language) {
      where.language = filters.language;
    }

    if (filters.genreId) {
      where.genres = {
        some: {
          genreId: filters.genreId,
        },
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // If city filter, need to join through showtimes and theaters
    if (filters.city) {
      where.showtimes = {
        some: {
          screen: {
            theater: {
              city: filters.city,
              status: 'APPROVED',
            },
          },
        },
      };
    }

    const movies = await prisma.movie.findMany({
      where,
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(movies));
    } catch (error) {
      logger.warn({ error }, 'Redis cache write failed');
    }

    return movies;
  }

  async getMovieById(id: string) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${id}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Redis cache read failed');
    }

    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        showtimes: {
          include: {
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw new Error('Movie not found');
    }

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(movie));
    } catch (error) {
      logger.warn({ error }, 'Redis cache write failed');
    }

    return movie;
  }

  async uploadPoster(id: string, posterUrl: string) {
    const movie = await prisma.movie.update({
      where: { id },
      data: { posterUrl },
    });

    // Invalidate cache
    await this.invalidateCache();

    return movie;
  }

  private async invalidateCache() {
    try {
      const keys = await redis.keys(`${this.CACHE_KEY_PREFIX}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn({ error }, 'Cache invalidation failed');
    }
  }
}

export default new MovieService();
