import prisma from '../lib/prisma';
import redis from '../lib/redis';
import logger from '../lib/logger';

interface CreateGenreData {
  name: string;
  slug: string;
}

export class GenreService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_KEY = 'genres:all';

  async createGenre(data: CreateGenreData) {
    const genre = await prisma.genre.create({
      data,
    });

    await this.invalidateCache();
    logger.info({ genreId: genre.id }, 'Genre created');
    return genre;
  }

  async updateGenre(id: string, data: Partial<CreateGenreData>) {
    const genre = await prisma.genre.update({
      where: { id },
      data,
    });

    await this.invalidateCache();
    logger.info({ genreId: id }, 'Genre updated');
    return genre;
  }

  async deleteGenre(id: string) {
    await prisma.genre.delete({
      where: { id },
    });

    await this.invalidateCache();
    logger.info({ genreId: id }, 'Genre deleted');
  }

  async getGenres() {
    // Try cache first
    try {
      const cached = await redis.get(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Redis cache read failed');
    }

    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });

    // Cache the result
    try {
      await redis.setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(genres));
    } catch (error) {
      logger.warn({ error }, 'Redis cache write failed');
    }

    return genres;
  }

  async getGenreById(id: string) {
    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        movies: {
          include: {
            movie: true,
          },
        },
      },
    });

    if (!genre) {
      throw new Error('Genre not found');
    }

    return genre;
  }

  private async invalidateCache() {
    try {
      await redis.del(this.CACHE_KEY);
    } catch (error) {
      logger.warn({ error }, 'Cache invalidation failed');
    }
  }
}

export default new GenreService();
