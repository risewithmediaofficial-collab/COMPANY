import express from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectKanban,
  getProjects,
  updateProject,
} from '../controllers/project.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProjects);
router.get('/:id', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProject);
router.get('/:id/kanban', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getProjectKanban);
router.post('/', authorize('superAdmin', 'admin', 'manager'), createProject);
router.put('/:id', authorize('superAdmin', 'admin', 'manager'), updateProject);
router.delete('/:id', authorize('superAdmin', 'admin'), deleteProject);

export default router;
