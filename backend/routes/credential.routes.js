import express from 'express';
import {
  createCredential,
  deleteCredential,
  getClientCredentials,
  getCredential,
  getCredentialLogs,
  getCredentialsVault,
  updateCredential,
} from '../controllers/credential.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

const allowedRoles = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager', 'employee'];

router.get('/', authorize(...allowedRoles), getCredentialsVault);
router.get('/clients/:clientId', authorize(...allowedRoles), getClientCredentials);
router.post('/clients/:clientId', authorize(...allowedRoles), createCredential);
router.get('/:credentialId', authorize(...allowedRoles), getCredential);
router.put('/:credentialId', authorize(...allowedRoles), updateCredential);
router.delete('/:credentialId', authorize(...allowedRoles), deleteCredential);
router.get('/:credentialId/logs', authorize(...allowedRoles), getCredentialLogs);

export default router;
