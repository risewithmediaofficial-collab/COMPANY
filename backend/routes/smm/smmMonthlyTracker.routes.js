import express from 'express';
import {
  getMonthlyTrackers,
  getTrackerByClient,
  upsertTracker,
  updateDayCell,
  updateTrackerMeta,
  deleteTracker,
  syncContentWithTracker,
  syncTasksWithTracker,
  getClientDeliverablesSummary,
} from '../../controllers/smm/smmMonthlyTracker.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
// Allow clients read access to the tracker (controller scopes strictly to their own client data)
router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getMonthlyTrackers);
router.get('/client-deliverables-summary', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getClientDeliverablesSummary);
router.get('/client/:clientId', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getTrackerByClient);

// Staff-only mutations
router.post('/', authorize('superAdmin', 'admin', 'manager', 'employee'), upsertTracker);
router.post('/sync-tasks', authorize('superAdmin', 'admin', 'manager', 'employee'), syncTasksWithTracker);
router.post('/sync-content', authorize('superAdmin', 'admin', 'manager', 'employee'), syncTasksWithTracker);
router.patch('/:id/day/:day', authorize('superAdmin', 'admin', 'manager', 'employee'), updateDayCell);
router.patch('/:id/meta', authorize('superAdmin', 'admin', 'manager', 'employee'), updateTrackerMeta);
router.delete('/:id', authorize('superAdmin', 'admin', 'manager'), deleteTracker);

export default router;
