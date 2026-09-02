import express from 'express';
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign,
  deleteCampaign, updateCampaignPerformance, bulkUpdateCampaignStatus,
  addDailyLog, deleteDailyLog
} from '../../controllers/smm/campaign.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/', authorize('superAdmin', 'manager', 'employee'), createCampaign);
router.post('/:id/daily-logs', authorize('superAdmin', 'manager', 'employee'), addDailyLog);
router.post('/:id/daily-log', authorize('superAdmin', 'manager', 'employee'), addDailyLog);
router.delete('/:id/daily-logs/:logId', authorize('superAdmin', 'manager', 'employee'), deleteDailyLog);
router.delete('/:id/daily-log/:logId', authorize('superAdmin', 'manager', 'employee'), deleteDailyLog);
router.put('/bulk-status', authorize('superAdmin', 'manager'), bulkUpdateCampaignStatus);
router.put('/:id', authorize('superAdmin', 'manager', 'employee'), updateCampaign);
router.patch('/:id/performance', authorize('superAdmin', 'manager', 'employee'), updateCampaignPerformance);
router.delete('/:id', authorize('superAdmin', 'manager'), deleteCampaign);

export default router;
