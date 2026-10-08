import express from 'express';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  sendTestPushNotification,
  getPushDiagnostics,
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.get('/diagnostics', getPushDiagnostics);
router.post('/test', sendTestNotification);
router.post('/test-push', sendTestPushNotification);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.put('/mark-all-read', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
