import express from 'express';
import { getAdSets, getAdSet, createAdSet, updateAdSet, deleteAdSet } from '../../controllers/smm/adSet.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getAdSets);
router.get('/:id', getAdSet);
router.post('/', authorize('superAdmin', 'manager', 'employee'), createAdSet);
router.put('/:id', authorize('superAdmin', 'manager', 'employee'), updateAdSet);
router.delete('/:id', authorize('superAdmin', 'manager', 'employee'), deleteAdSet);

export default router;
