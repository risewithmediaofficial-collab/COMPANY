import express from 'express';
import { getSmmNotes, createSmmNote, deleteSmmNote } from '../../controllers/smm/smmNote.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getSmmNotes);
router.post('/', createSmmNote);
router.delete('/:id', authorize('superAdmin', 'manager', 'employee'), deleteSmmNote);

export default router;
