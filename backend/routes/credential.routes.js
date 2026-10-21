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

const allowedReadRoles = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager', 'employee', 'client'];
const allowedWriteRoles = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager', 'employee'];

router.get('/', authorize(...allowedReadRoles), getCredentialsVault);
router.get('/clients/:clientId', authorize(...allowedReadRoles), getClientCredentials);
router.post('/clients/:clientId', authorize(...allowedWriteRoles), createCredential);
router.get('/:credentialId', authorize(...allowedReadRoles), getCredential);
router.put('/:credentialId', authorize(...allowedWriteRoles), updateCredential);
router.delete('/:credentialId', authorize(...allowedWriteRoles), deleteCredential);
router.get('/:credentialId/logs', authorize(...allowedWriteRoles), getCredentialLogs);

export default router;
