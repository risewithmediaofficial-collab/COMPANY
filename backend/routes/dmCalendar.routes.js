import express from 'express';
import {
  getVideoShoots,
  createVideoShoot,
  updateVideoShoot,
  deleteVideoShoot,
  trackVideoShootTime,
  getRjPromotions,
  createRjPromotion,
  updateRjPromotion,
  deleteRjPromotion,
  getVjPromotions,
  createVjPromotion,
  updateVjPromotion,
  deleteVjPromotion,
  getMasterCalendarEvents,
  getDMDashboardSummary,
  getDMClientPerformance,
  getDMTeamPerformance,
  getDMAuditLogs,
} from '../controllers/dmCalendar.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager'));

// Dashboard & Feeds
router.get('/dashboard', getDMDashboardSummary);
router.get('/master-events', getMasterCalendarEvents);
router.get('/client-performance', getDMClientPerformance);
router.get('/team-performance', getDMTeamPerformance);
router.get('/audit-logs', getDMAuditLogs);

// Video Shoots
router.get('/video-shoots', getVideoShoots);
router.post('/video-shoots', createVideoShoot);
router.put('/video-shoots/:id', updateVideoShoot);
router.delete('/video-shoots/:id', deleteVideoShoot);
router.patch('/video-shoots/:id/time-tracking', trackVideoShootTime);

// RJ Promotions
router.get('/rj-promotions', getRjPromotions);
router.post('/rj-promotions', createRjPromotion);
router.put('/rj-promotions/:id', updateRjPromotion);
router.delete('/rj-promotions/:id', deleteRjPromotion);

// VJ Promotions
router.get('/vj-promotions', getVjPromotions);
router.post('/vj-promotions', createVjPromotion);
router.put('/vj-promotions/:id', updateVjPromotion);
router.delete('/vj-promotions/:id', deleteVjPromotion);

export default router;
