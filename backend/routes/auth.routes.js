// =============================================
// AUTH ROUTES
// =============================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  completeOnboarding,
} from '../controllers/auth.controller.js';
import { getEnv } from '../config/env.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
const env = getEnv();

const failedAuthAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed auth attempts, please try again later.' },
});

router.post('/register', failedAuthAttemptLimiter, register);
router.post('/login', failedAuthAttemptLimiter, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', failedAuthAttemptLimiter, forgotPassword);
router.put('/reset-password/:token', failedAuthAttemptLimiter, resetPassword);

// Protected
router.use(protect);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/update-profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/complete-onboarding', completeOnboarding);

export default router;
