// =============================================
// SMM AD SPEND ROUTES
// =============================================
import express from 'express';
import {
  getAdSpendLogs,
  addAdSpendLog,
  updateAdSpendLog,
  deleteAdSpendLog,
  getAdSpendSummary,
  exportAdSpendReport,
} from '../../controllers/smm/smmAdSpend.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Specific routes MUST come before /:id to avoid param collisions
router.get('/summary', getAdSpendSummary);
router.get('/report/export', exportAdSpendReport);

router.get('/', getAdSpendLogs);
router.post('/', addAdSpendLog);
router.put('/:id', updateAdSpendLog);
router.delete('/:id', deleteAdSpendLog);

export default router;
