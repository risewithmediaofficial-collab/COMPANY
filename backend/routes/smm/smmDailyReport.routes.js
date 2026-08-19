// =============================================
// SMM DAILY REPORT ROUTES
// =============================================
import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import {
  getDailyReports,
  getDailyReportByDate,
  saveDailyReport,
} from '../../controllers/smm/smmDailyReport.controller.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDailyReports)
  .post(saveDailyReport);

router.get('/by-date', getDailyReportByDate);

export default router;
