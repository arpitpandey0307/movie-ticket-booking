import { Router } from 'express';
import showtimeService from '../services/showtime.service';

const router = Router();

// Specific routes MUST come before parameterized routes
router.get('/public', async (req, res) => {
  try {
    const data = await showtimeService.getPublicShowtimes();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch showtimes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const showtime = await showtimeService.getShowtimeById(req.params.id);
    res.json(showtime);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Showtime not found' });
  }
});

export default router;
