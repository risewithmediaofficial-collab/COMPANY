import express from 'express';
import { getAds, getAd, createAd, updateAd, deleteAd, updateAdApproval, updateAdPerformance } from '../../controllers/smm/ad.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getAds);
router.get('/:id', getAd);
router.post('/', authorize('superAdmin', 'manager', 'employee'), createAd);
router.put('/:id', authorize('superAdmin', 'manager', 'employee'), updateAd);
router.patch('/:id/approval', authorize('superAdmin', 'manager'), updateAdApproval);
router.patch('/:id/performance', authorize('superAdmin', 'manager', 'employee'), updateAdPerformance);
router.delete('/:id', authorize('superAdmin', 'manager'), deleteAd);

export default router;
