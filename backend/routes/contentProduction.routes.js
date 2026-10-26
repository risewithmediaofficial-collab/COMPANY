// =============================================
// CONTENT PRODUCTION ROUTES
// =============================================

import express from 'express';
import {
  listContentProduction,
  getContentProductionById,
  createContentProduction,
  updateContentProduction,
  updateStageDetails,
  getScriptsAndReferences,
  addContentRevision,
  deleteContentProduction,
} from '../controllers/contentProduction.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Saved scripts & reference videos lookup for Video Editor and other forms
router.get('/scripts-and-references', getScriptsAndReferences);

// List and Create
router
  .route('/')
  .get(listContentProduction)
  .post(
    authorize('superAdmin', 'admin', 'manager', 'employee', 'editor', 'designer', 'adsManager'),
    createContentProduction
  );

// Single Content Record
router
  .route('/:id')
  .get(getContentProductionById)
  .put(
    authorize('superAdmin', 'admin', 'manager', 'employee', 'editor', 'designer', 'adsManager'),
    updateContentProduction
  )
  .delete(authorize('superAdmin', 'admin', 'manager'), deleteContentProduction);

// Stage Specific Update
router.patch(
  '/:id/stage/:stageName',
  authorize('superAdmin', 'admin', 'manager', 'employee', 'editor', 'designer', 'adsManager', 'intern'),
  updateStageDetails
);

// Add Revision Feedback
router.post(
  '/:id/revisions',
  authorize('superAdmin', 'admin', 'manager', 'employee', 'editor', 'designer', 'adsManager'),
  addContentRevision
);

export default router;
