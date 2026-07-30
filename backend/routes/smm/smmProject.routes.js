import express from 'express';
import { getSmmProjects, getSmmProject, createSmmProject, updateSmmProject, deleteSmmProject } from '../../controllers/smm/smmProject.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmProjects);
router.get('/:id', getSmmProject);
router.post('/', authorize('superAdmin', 'manager'), createSmmProject);
router.put('/:id', authorize('superAdmin', 'manager'), updateSmmProject);
router.delete('/:id', authorize('superAdmin'), deleteSmmProject);

export default router;
