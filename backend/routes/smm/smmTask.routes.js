import express from 'express';
import { getSmmTasks, createSmmTask, updateSmmTask, deleteSmmTask, addComment } from '../../controllers/smm/smmTask.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmTasks);
router.post('/', createSmmTask);
router.put('/:id', updateSmmTask);
router.delete('/:id', authorize('superAdmin', 'manager'), deleteSmmTask);
router.post('/:id/comments', addComment);

export default router;
