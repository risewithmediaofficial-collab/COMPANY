import express from 'express';
import { getAds, getAd, createAd, updateAd, deleteAd, updateAdApproval } from '../../controllers/smm/ad.controller.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);
router.use(authorize('superAdmin', 'manager', 'employee'));

router.get('/', getAds);
router.get('/:id', getAd);
router.post('/', authorize('superAdmin', 'manager'), createAd);
router.put('/:id', authorize('superAdmin', 'manager'), updateAd);
router.patch('/:id/approval', authorize('superAdmin', 'manager'), updateAdApproval);
router.delete('/:id', authorize('superAdmin', 'manager'), deleteAd);

export default router;
