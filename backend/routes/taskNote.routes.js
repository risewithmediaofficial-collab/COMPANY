import express from 'express';
import {
  createNote,
  getMyNotes,
  updateNote,
  deleteNote,
  getAllNotes,
  assignNote,
  dismissNote,
  toggleNotePin,
  toggleChecklistItem,
} from '../controllers/taskNote.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

// Employee / User routes
router.post('/', authorize('superAdmin', 'admin', 'manager', 'employee'), createNote);
router.get('/mine', authorize('superAdmin', 'admin', 'manager', 'employee'), getMyNotes);
router.put('/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), updateNote);
router.delete('/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), deleteNote);
router.patch('/:id/pin', authorize('superAdmin', 'admin', 'manager', 'employee'), toggleNotePin);
router.patch('/:id/checklist', authorize('superAdmin', 'admin', 'manager', 'employee'), toggleChecklistItem);

// Manager / Admin / SuperAdmin / Employee routes
router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee'), getAllNotes);
router.patch('/:id/assign', authorize('superAdmin', 'admin', 'manager'), assignNote);
router.patch('/:id/dismiss', authorize('superAdmin', 'admin', 'manager'), dismissNote);

export default router;
