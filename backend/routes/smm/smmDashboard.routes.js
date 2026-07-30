import express from 'express';
import { getSmmDashboardStats } from '../../controllers/smm/smmDashboard.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/stats', getSmmDashboardStats);

export default router;
