// =============================================
// DEVELOPMENT MODULE ROUTES
// =============================================
import express from 'express';
import {
  getDevDashboard,
  getDevTasks,
  getDevTaskById,
  createDevTask,
  updateDevTask,
  deleteDevTask,
  updateDevStage,
  submitCodeReview,
  submitQAResult,
  toggleBlocked,
  updateDevMetadata,
  updateDevChecklist,
  addDevComment,
  getSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  getReleases,
  createRelease,
  updateRelease,
  deleteRelease,
} from '../controllers/development/development.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// ── Dashboard & Task Board ───────────────────────────────────────────────────
router.get('/dashboard', authorize('superAdmin', 'admin', 'manager', 'employee'), getDevDashboard);
router.get('/tasks', authorize('superAdmin', 'admin', 'manager', 'employee'), getDevTasks);
router.post('/tasks', authorize('superAdmin', 'admin', 'manager', 'employee'), createDevTask);
router.get('/tasks/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), getDevTaskById);
router.put('/tasks/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), updateDevTask);
router.delete('/tasks/:id', authorize('superAdmin', 'admin', 'manager'), deleteDevTask);

router.patch('/tasks/:id/stage', authorize('superAdmin', 'admin', 'manager', 'employee'), updateDevStage);
router.patch('/tasks/:id/review', authorize('superAdmin', 'admin', 'manager', 'employee'), submitCodeReview);
router.patch('/tasks/:id/qa', authorize('superAdmin', 'admin', 'manager', 'employee'), submitQAResult);
router.patch('/tasks/:id/blocked', authorize('superAdmin', 'admin', 'manager', 'employee'), toggleBlocked);
router.patch('/tasks/:id/metadata', authorize('superAdmin', 'admin', 'manager', 'employee'), updateDevMetadata);
router.patch('/tasks/:id/checklist', authorize('superAdmin', 'admin', 'manager', 'employee'), updateDevChecklist);
router.post('/tasks/:id/comments', authorize('superAdmin', 'admin', 'manager', 'employee'), addDevComment);

// ── Sprints ──────────────────────────────────────────────────────────────────
router.get('/sprints', authorize('superAdmin', 'admin', 'manager', 'employee'), getSprints);
router.post('/sprints', authorize('superAdmin', 'admin', 'manager'), createSprint);
router.put('/sprints/:id', authorize('superAdmin', 'admin', 'manager'), updateSprint);
router.delete('/sprints/:id', authorize('superAdmin', 'admin', 'manager'), deleteSprint);

// ── Releases & Deployments ───────────────────────────────────────────────────
router.get('/releases', authorize('superAdmin', 'admin', 'manager', 'employee'), getReleases);
router.post('/releases', authorize('superAdmin', 'admin', 'manager'), createRelease);
router.put('/releases/:id', authorize('superAdmin', 'admin', 'manager'), updateRelease);
router.delete('/releases/:id', authorize('superAdmin', 'admin', 'manager'), deleteRelease);

export default router;
