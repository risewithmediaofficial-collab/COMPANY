// =============================================
// SALARY & PAYROLL ROUTES - Finance Module
// =============================================

import express from 'express';
import {
  getSalaries,
  getSalarySummary,
  getSalaryById,
  createSalary,
  updateSalary,
  updateSalaryStatus,
  deleteSalary,
  generateMonthlyPayroll,
} from '../controllers/salary.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/summary', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getSalarySummary);
router.post('/generate-monthly', authorize('superAdmin', 'admin', 'manager', 'financeManager'), generateMonthlyPayroll);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'employee'), getSalaries);
router.get('/:id', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'employee'), getSalaryById);
router.post('/', authorize('superAdmin', 'admin', 'manager', 'financeManager'), createSalary);
router.put('/:id', authorize('superAdmin', 'admin', 'manager', 'financeManager'), updateSalary);
router.patch('/:id/status', authorize('superAdmin', 'admin', 'manager', 'financeManager'), updateSalaryStatus);
router.delete('/:id', authorize('superAdmin', 'admin'), deleteSalary);

export default router;
