import express from 'express';
import { getCreatives, createCreative, updateCreative, deleteCreative } from '../../controllers/smm/creative.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getCreatives);
router.post('/', createCreative);
router.put('/:id', updateCreative);
router.delete('/:id', authorize('superAdmin', 'manager', 'employee'), deleteCreative);

export default router;
