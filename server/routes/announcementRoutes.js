import express from 'express';
import {
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement
} from '../controllers/announcementController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/tournament/:tournamentId', getAnnouncements);
router.post('/tournament/:tournamentId', protectAdmin, addAnnouncement);
router.delete('/:id', protectAdmin, deleteAnnouncement);

export default router;
