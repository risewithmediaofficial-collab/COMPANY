// =============================================
// SMM CONTENT ROUTES
// =============================================
import express from 'express';
import {
  getSmmContents,
  getSmmContentById,
  createSmmContent,
  updateSmmContent,
  updateContentPerformance,
  deleteSmmContent,
  getPublishedContentForAd,
} from '../../controllers/smm/smmContent.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSmmContents);
router.get('/published-for-ad', getPublishedContentForAd);
router.get('/:id', getSmmContentById);
router.post('/', createSmmContent);
router.put('/:id', updateSmmContent);
router.patch('/:id/performance', updateContentPerformance);
router.delete('/:id', deleteSmmContent);

export default router;
