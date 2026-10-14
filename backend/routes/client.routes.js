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

router.get('/', authorize('superAdmin', 'manager', 'employee', 'client'), getClients);
router.post('/sync-portal-users', authorize('superAdmin', 'manager'), syncPortalUsersHandler);
router.get('/:id', authorize('superAdmin', 'manager', 'employee', 'client'), getClient);
router.post('/', authorize('superAdmin', 'manager'), createClient);
router.put('/:id', authorize('superAdmin', 'manager'), updateClient);
router.post('/:id/activate-portal', authorize('superAdmin', 'manager'), activatePortal);
router.patch('/:id/onboarding', authorize('superAdmin', 'manager'), updateOnboardingStep);
router.delete('/:id', authorize('superAdmin'), deleteClient);

export default router;

