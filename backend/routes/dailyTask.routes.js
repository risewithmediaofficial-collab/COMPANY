// =============================================
// DAILY TASK ROUTES
// =============================================

import express from 'express';
import {
  getDailyTasks,
  getAssignableTasks,
  addDailyTaskFromAssigned,
  createQuickDailyTask,
  startDailyTaskTimer,
  stopDailyTaskTimer,
  updateDailyTaskStatus,
  deleteDailyTask,
} from '../controllers/dailyTask.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

const INTERNAL_ROLES = [
  'superAdmin',
  'admin',
  'manager',
  'organizationOwner',
  'employee',
  'intern',
  'editor',
  'designer',
  'adsManager',
  'financeManager',
  'accountManager',
];

router.get('/', authorize(...INTERNAL_ROLES), getDailyTasks);
router.get('/assignable-tasks', authorize(...INTERNAL_ROLES), getAssignableTasks);
router.post('/from-assigned', authorize(...INTERNAL_ROLES), addDailyTaskFromAssigned);
router.post('/quick', authorize(...INTERNAL_ROLES), createQuickDailyTask);
router.post('/:id/start-timer', authorize(...INTERNAL_ROLES), startDailyTaskTimer);
router.post('/:id/stop-timer', authorize(...INTERNAL_ROLES), stopDailyTaskTimer);
router.patch('/:id/status', authorize(...INTERNAL_ROLES), updateDailyTaskStatus);
router.delete('/:id', authorize(...INTERNAL_ROLES), deleteDailyTask);

export default router;
