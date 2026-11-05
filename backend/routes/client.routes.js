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

const clientViewRoles = [
  'superAdmin',
  'admin',
  'organizationOwner',
  'manager',
  'accountManager',
  'editor',
  'designer',
  'adsManager',
  'financeManager',
  'clientAdmin',
  'clientMember',
  'intern',
  'employee',
  'client',
];

router.get('/', authorize(...clientViewRoles), getClients);
router.post('/sync-portal-users', authorize('superAdmin', 'admin', 'organizationOwner', 'manager'), syncPortalUsersHandler);
router.get('/:id', authorize(...clientViewRoles), getClient);
router.post('/', authorize('superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'), createClient);
router.put('/:id', authorize('superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'), updateClient);
router.post('/:id/activate-portal', authorize('superAdmin', 'admin', 'organizationOwner', 'manager'), activatePortal);
router.patch('/:id/onboarding', authorize('superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'), updateOnboardingStep);
router.delete('/:id', authorize('superAdmin', 'admin', 'organizationOwner'), deleteClient);

export default router;
