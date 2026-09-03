import express from 'express';
import { login, getMe, seedAdmin } from '../controllers/authController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protectAdmin, getMe);
router.post('/seed', seedAdmin);

export default router;
