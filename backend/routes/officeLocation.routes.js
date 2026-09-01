// =============================================
// OFFICE LOCATION ROUTES
// =============================================

import express from 'express';
import {
  createOfficeLocation,
  getOfficeLocations,
  getOfficeLocationById,
  updateOfficeLocation,
  deleteOfficeLocation,
} from '../controllers/officeLocation.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Public routes
router.get('/', getOfficeLocations); // Get all office locations
router.get('/:locationId', getOfficeLocationById); // Get specific location

// Admin routes
router.post('/', createOfficeLocation); // Create new office location
router.patch('/:locationId', updateOfficeLocation); // Update office location
router.delete('/:locationId', deleteOfficeLocation); // Delete office location

export default router;
