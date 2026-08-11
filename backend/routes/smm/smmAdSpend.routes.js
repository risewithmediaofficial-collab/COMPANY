// =============================================
// SMM AD SPEND ROUTES
// =============================================
import express from 'express';
import {
  getAdSpendLogs,
  addAdSpendLog,
  deleteAdSpendLog,
} from '../../controllers/smm/smmAdSpend.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAdSpendLogs);
router.post('/', addAdSpendLog);
router.delete('/:id', deleteAdSpendLog);

export default router;
