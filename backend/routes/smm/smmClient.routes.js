import express from 'express';
import { getSmmClients, getSmmClient, createSmmClient, updateSmmClient, deleteSmmClient } from '../../controllers/smm/smmClient.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmClients);
router.get('/:id', getSmmClient);
router.post('/', authorize('superAdmin', 'manager', 'employee'), createSmmClient);
router.put('/:id', authorize('superAdmin', 'manager', 'employee'), updateSmmClient);
router.delete('/:id', authorize('superAdmin', 'manager', 'employee'), deleteSmmClient);

export default router;
