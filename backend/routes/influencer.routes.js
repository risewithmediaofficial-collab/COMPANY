import express from 'express';
import {
  getInfluencers,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  getInfluencerSummary,
} from '../controllers/influencer.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager'));

router.get('/', getInfluencers);
router.get('/summary', getInfluencerSummary);
router.post('/', createInfluencer);
router.put('/:id', updateInfluencer);
router.delete('/:id', deleteInfluencer);

export default router;
