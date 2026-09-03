import express from 'express';
import {
  getPublicTournaments,
  getAllTournaments,
  getTournamentBySlug,
  getTournamentById,
  getFullTournament,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  deleteTournament
} from '../controllers/tournamentController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getPublicTournaments);
router.get('/all', protectAdmin, getAllTournaments);
router.get('/slug/:slug', getTournamentBySlug);
router.get('/id/:id', getTournamentById);
router.get('/:id/full', getFullTournament);

router.post('/', protectAdmin, createTournament);
router.put('/:id', protectAdmin, updateTournament);
router.patch('/:id/status', protectAdmin, updateTournamentStatus);
router.delete('/:id', protectAdmin, deleteTournament);

export default router;
