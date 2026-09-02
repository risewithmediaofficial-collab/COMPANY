import express from 'express';
import { getSmmTasks, getSmmTask, createSmmTask, updateSmmTask, deleteSmmTask, addComment } from '../../controllers/smm/smmTask.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmTasks);
router.get('/:id', getSmmTask);
router.post('/', createSmmTask);
router.put('/:id', updateSmmTask);
router.delete('/:id', authorize('superAdmin', 'manager', 'employee'), deleteSmmTask);
router.post('/:id/comments', addComment);

export default router;
