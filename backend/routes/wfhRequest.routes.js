// =============================================
// WFH REQUEST ROUTES
// =============================================

import express from 'express';
import {
  submitWFHRequest,
  getWFHRequests,
  getMyWFHRequests,
  approveWFHRequest,
  rejectWFHRequest,
  checkWFHStatus,
} from '../controllers/wfhRequest.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// User routes
router.post('/submit', submitWFHRequest); // Submit WFH request
router.get('/my-requests', getMyWFHRequests); // Get user's own requests
router.get('/check-status', checkWFHStatus); // Check WFH status for specific date

// Manager/Admin routes
router.get('/', getWFHRequests); // Get all WFH requests (manager only)
router.patch('/:wfhRequestId/approve', approveWFHRequest); // Approve WFH request
router.patch('/:wfhRequestId/reject', rejectWFHRequest); // Reject WFH request

export default router;
