import { Router } from 'express';
import showtimeService from '../services/showtime.service';

const router = Router();

router.get('/public', async (req, res) => {
  try {
    const data = await showtimeService.getPublicShowtimes();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch showtimes' });
  }
});

export default router;
