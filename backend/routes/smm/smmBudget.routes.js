// =============================================
// SMM CLIENT BUDGET ROUTES
// =============================================
import express from 'express';
import {
  getBudgets,
  getBudgetSummary,
  addBudget,
  updateBudget,
  deleteBudget,
  exportBudgetReport,
} from '../../controllers/smm/smmBudget.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Specific routes before /:id
router.get('/summary', getBudgetSummary);
router.get('/report/export', exportBudgetReport);

router.get('/', getBudgets);
router.post('/', addBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
