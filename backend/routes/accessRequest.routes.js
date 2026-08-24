import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  createRequest,
  getProjectRequests,
  getAllRequests,
  handleRequest
} from '../controllers/accessRequest.controller.js';

const router = express.Router();

router.use(protect);

router.post('/', createRequest);
router.get('/', authorize('superAdmin', 'admin', 'manager'), getAllRequests);
router.get('/project/:projectId', authorize('superAdmin', 'admin', 'manager'), getProjectRequests);
router.put('/:id', authorize('superAdmin', 'admin', 'manager'), handleRequest);

export default router;
