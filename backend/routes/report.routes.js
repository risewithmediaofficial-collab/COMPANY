import express from 'express';
import {
  getAdminDashboard,
  getClientDashboard,
  getEmployeeDashboard,
  getMonthlyEmployeeSummary,
  getAdminAuditLogs,
} from '../controllers/report.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/admin', authorize('superAdmin', 'manager'), getAdminDashboard);
router.get('/audit-logs', authorize('superAdmin', 'manager'), getAdminAuditLogs);
router.get('/employee', authorize('superAdmin', 'manager', 'employee'), getEmployeeDashboard);
router.get('/client', authorize('client'), getClientDashboard);
router.get('/monthly-employee-summary', authorize('superAdmin', 'manager'), getMonthlyEmployeeSummary);

export default router;

