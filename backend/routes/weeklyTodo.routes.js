// =============================================
// WEEKLY TODO ROUTES
// =============================================

import express from 'express';
import {
  getWeeklyTodos,
  createWeeklyTodo,
  updateWeeklyTodo,
  toggleWeeklyTodo,
  deleteWeeklyTodo,
} from '../controllers/weeklyTodo.controller.js';
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

router.get('/', authorize(...INTERNAL_ROLES), getWeeklyTodos);
router.post('/', authorize(...INTERNAL_ROLES), createWeeklyTodo);
router.put('/:id', authorize(...INTERNAL_ROLES), updateWeeklyTodo);
router.patch('/:id/toggle', authorize(...INTERNAL_ROLES), toggleWeeklyTodo);
router.delete('/:id', authorize(...INTERNAL_ROLES), deleteWeeklyTodo);

export default router;
