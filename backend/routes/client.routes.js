import express from 'express';
import {
  activatePortal,
  createClient,
  deleteClient,
  getClient,
  getClients,
  syncPortalUsersHandler,
  updateClient,
  updateOnboardingStep,
} from '../controllers/client.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getClients);
router.post('/sync-portal-users', authorize('superAdmin', 'admin', 'manager'), syncPortalUsersHandler);
router.get('/:id', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getClient);
router.post('/', authorize('superAdmin', 'admin', 'manager'), createClient);
router.put('/:id', authorize('superAdmin', 'admin', 'manager'), updateClient);
router.post('/:id/activate-portal', authorize('superAdmin', 'admin', 'manager'), activatePortal);
router.patch('/:id/onboarding', authorize('superAdmin', 'admin', 'manager'), updateOnboardingStep);
router.delete('/:id', authorize('superAdmin', 'admin'), deleteClient);

export default router;
