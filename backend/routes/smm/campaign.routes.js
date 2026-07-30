import express from 'express';
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign,
  deleteCampaign, updateCampaignPerformance, bulkUpdateCampaignStatus
} from '../../controllers/smm/campaign.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/', authorize('superAdmin', 'manager'), createCampaign);
router.put('/bulk-status', authorize('superAdmin', 'manager'), bulkUpdateCampaignStatus);
router.put('/:id', authorize('superAdmin', 'manager'), updateCampaign);
router.patch('/:id/performance', authorize('superAdmin', 'manager'), updateCampaignPerformance);
router.delete('/:id', authorize('superAdmin', 'manager'), deleteCampaign);

export default router;
