import express from 'express';
import {
  getMatchesByTournament,
  updateRoomInfo,
  toggleRoomRelease,
  saveMatchResults,
  unpublishMatch,
  getLeaderboard
} from '../controllers/matchController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/tournament/:tournamentId', getMatchesByTournament);
router.get('/tournament/:tournamentId/leaderboard', getLeaderboard);

// Admin routes
router.put('/tournament/:tournamentId/matches/:matchNumber/room', protectAdmin, updateRoomInfo);
router.post('/tournament/:tournamentId/matches/:matchNumber/toggle-release', protectAdmin, toggleRoomRelease);
router.post('/tournament/:tournamentId/matches/:matchNumber/results', protectAdmin, saveMatchResults);
router.post('/tournament/:tournamentId/matches/:matchNumber/unpublish', protectAdmin, unpublishMatch);

export default router;
