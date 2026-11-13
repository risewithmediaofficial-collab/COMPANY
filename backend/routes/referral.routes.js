import express from 'express';
import {
  createReferral,
  deleteReferral,
  getReferralAnalytics,
  getReferralByClient,
  getReferrals,
  processPayout,
  requestPayout,
  submitReferralLead,
  updateReferral,
} from '../controllers/referral.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'referral', 'client'), getReferrals);
router.get('/analytics', authorize('superAdmin', 'admin', 'manager', 'employee'), getReferralAnalytics);
router.get('/client/:clientId', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getReferralByClient);
router.post('/', authorize('superAdmin', 'admin', 'manager', 'employee'), createReferral);
router.put('/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), updateReferral);
router.delete('/:id', authorize('superAdmin', 'admin', 'manager'), deleteReferral);
router.post('/submit', authorize('superAdmin', 'admin', 'manager', 'employee', 'referral'), submitReferralLead);
router.post('/submit-lead', authorize('superAdmin', 'admin', 'manager', 'employee', 'referral'), submitReferralLead);
router.post('/:id/payout-request', authorize('referral'), requestPayout);
router.post('/:id/process-payout', authorize('superAdmin'), processPayout);

export default router;
