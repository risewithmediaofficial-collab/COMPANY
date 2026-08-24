import express from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectKanban,
  getProjects,
  updateProject,
} from '../controllers/project.controller.js';
import {
  getProjectMonthlyDeliverables,
  saveProjectMonthlyDeliverable,
  batchSaveProjectMonthlyDeliverables,
  deleteProjectMonthlyDeliverable,
  checkTaskDeliverableQuota,
} from '../controllers/projectMonthlyDeliverable.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProjects);
router.get('/:id', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProject);
router.get('/:id/kanban', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProjectKanban);
router.post('/', authorize('superAdmin', 'admin', 'manager'), createProject);
router.put('/:id', authorize('superAdmin', 'admin', 'manager'), updateProject);
router.delete('/:id', authorize('superAdmin', 'admin'), deleteProject);

// Project Monthly Deliverables & Targets
router.get('/:projectId/monthly-deliverables', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProjectMonthlyDeliverables);
router.get('/:projectId/monthly-deliverables/check-quota', authorize('superAdmin', 'admin', 'manager', 'employee'), checkTaskDeliverableQuota);
router.post('/:projectId/monthly-deliverables', authorize('superAdmin', 'admin', 'manager'), saveProjectMonthlyDeliverable);
router.post('/:projectId/monthly-deliverables/batch', authorize('superAdmin', 'admin', 'manager'), batchSaveProjectMonthlyDeliverables);
router.delete('/:projectId/monthly-deliverables/:targetId', authorize('superAdmin', 'admin', 'manager'), deleteProjectMonthlyDeliverable);

export default router;
