import express from 'express';
import { getSmmClients, getSmmClient, createSmmClient, updateSmmClient, deleteSmmClient } from '../../controllers/smm/smmClient.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmClients);
router.get('/:id', getSmmClient);
router.post('/', authorize('superAdmin', 'manager'), createSmmClient);
router.put('/:id', authorize('superAdmin', 'manager'), updateSmmClient);
router.delete('/:id', authorize('superAdmin'), deleteSmmClient);

export default router;
