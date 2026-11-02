import express from 'express';
import {
  getRecycleBinItems,
  restoreItem,
  permanentDeleteItem,
  emptyRecycleBin,
} from '../controllers/recycleBin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superAdmin', 'admin', 'manager'));

router.get('/', getRecycleBinItems);
router.post('/:id/restore', restoreItem);
router.delete('/:id/permanent', permanentDeleteItem);
router.post('/empty', emptyRecycleBin);

export default router;
