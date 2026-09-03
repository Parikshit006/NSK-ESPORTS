import express from 'express';
import {
  getTeamsByTournament,
  getConfirmedTeams,
  registerTeam,
  approveTeam,
  rejectTeam,
  disqualifyTeam,
  updateTeam,
  portalLogin,
  getScreenshot,
  checkDuplicateIGN,
  checkDuplicateUID
} from '../controllers/teamController.js';
import { protectAdmin } from '../middleware/auth.js';
import { uploadPaymentScreenshot } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/tournament/:tournamentId', getTeamsByTournament);
router.get('/tournament/:tournamentId/confirmed', getConfirmedTeams);
router.post('/tournament/:tournamentId/register', uploadPaymentScreenshot.single('screenshot'), registerTeam);
router.post('/portal-login', portalLogin);
router.post('/tournament/:tournamentId/check-duplicate-ign', checkDuplicateIGN);
router.post('/tournament/:tournamentId/check-duplicate-uid', checkDuplicateUID);

// Admin routes
router.post('/:id/approve', protectAdmin, approveTeam);
router.post('/:id/reject', protectAdmin, rejectTeam);
router.post('/:id/disqualify', protectAdmin, disqualifyTeam);
router.put('/:id', protectAdmin, updateTeam);
router.get('/:id/screenshot', protectAdmin, getScreenshot);

export default router;
