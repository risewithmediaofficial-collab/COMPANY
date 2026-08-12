import express from 'express';
import {
  approveExpense,
  addCallHistory,
  addInternalFinanceNote,
  addPartialPaymentToInvoice,
  addPaymentNote,
  createExpense,
  createFinanceEntry,
  createFinanceRecord,
  createInvoice,
  deleteFinanceEntry,
  deleteFinanceRecord,
  deleteCallHistory,
  deleteInvoice,
  updateExpense,
  deleteExpense,
  getMonthlyExpenseReport,
  getCallHistory,
  getCallHistoryByClient,
  getCallHistoryByProject,
  getExpenses,
  getFinanceEntries,
  getFinanceDashboardSummary,
  getFinanceRecord,
  getFinanceRecords,
  getFinanceRecordsByClient,
  getFinanceRecordsByProject,
  getFinanceSummary,
  getInvoice,
  getInvoiceByPublicLink,
  getInvoices,
  getOverdueFinanceRecords,
  getPayments,
  getPaymentNotes,
  getTodayFollowUpCalls,
  markInvoiceViewed,
  markInvoicePaid,
  sendInvoice,
  updateFinanceEntry,
  updateFinanceRecord,
  updateCallHistory,
  updateInvoice,
} from '../controllers/finance.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get('/invoices/public/:publicLink', getInvoiceByPublicLink);
router.use(protect);

router.get('/summary', authorize('superAdmin', 'manager'), getFinanceSummary);
router.get('/dashboard-summary', authorize('superAdmin', 'manager'), getFinanceDashboardSummary);

router.get('/records/overdue/list', authorize('superAdmin', 'manager', 'employee', 'client'), getOverdueFinanceRecords);
router.get('/records/client/:clientId', authorize('superAdmin', 'manager', 'employee', 'client'), getFinanceRecordsByClient);
router.get('/records/project/:projectId', authorize('superAdmin', 'manager', 'employee', 'client'), getFinanceRecordsByProject);
router.get('/records/:id', authorize('superAdmin', 'manager', 'employee', 'client'), getFinanceRecord);
router.get('/records', authorize('superAdmin', 'manager', 'employee', 'client'), getFinanceRecords);
router.post('/records', authorize('superAdmin', 'employee'), createFinanceRecord);
router.put('/records/:id', authorize('superAdmin', 'employee'), updateFinanceRecord);
router.delete('/records/:id', authorize('superAdmin'), deleteFinanceRecord);
router.post('/records/:id/payment-notes', authorize('superAdmin', 'employee'), addPaymentNote);
router.get('/records/:id/payment-notes', authorize('superAdmin', 'manager', 'employee', 'client'), getPaymentNotes);
router.post('/records/:id/internal-notes', authorize('superAdmin', 'employee'), addInternalFinanceNote);

router.get('/', authorize('superAdmin', 'manager', 'employee'), getFinanceEntries);
router.post('/', authorize('superAdmin', 'employee'), createFinanceEntry);

router.get('/invoices', authorize('superAdmin', 'manager', 'employee', 'client'), getInvoices);
router.get('/invoices/:id', authorize('superAdmin', 'manager', 'employee', 'client'), getInvoice);
router.post('/invoices', authorize('superAdmin'), createInvoice);
router.put('/invoices/:id', authorize('superAdmin'), updateInvoice);
router.post('/invoices/:id/send', authorize('superAdmin'), sendInvoice);
router.post('/invoices/:id/viewed', authorize('client'), markInvoiceViewed);
router.post('/invoices/:id/partial-payment', authorize('superAdmin'), addPartialPaymentToInvoice);
router.post('/invoices/:id/mark-paid', authorize('superAdmin'), markInvoicePaid);
router.delete('/invoices/:id', authorize('superAdmin'), deleteInvoice);
router.get('/payments', authorize('superAdmin', 'manager', 'employee', 'client'), getPayments);

router.get('/call-history/followups/today', authorize('superAdmin', 'manager', 'employee', 'client'), getTodayFollowUpCalls);
router.get('/call-history/client/:clientId', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistoryByClient);
router.get('/call-history/project/:projectId', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistoryByProject);
router.get('/call-history', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistory);
router.post('/call-history', authorize('superAdmin', 'employee'), addCallHistory);
router.put('/call-history/:id', authorize('superAdmin', 'employee'), updateCallHistory);
router.delete('/call-history/:id', authorize('superAdmin'), deleteCallHistory);

router.get('/expenses/monthly-report', authorize('superAdmin', 'manager'), getMonthlyExpenseReport);
router.get('/expenses', authorize('superAdmin', 'manager', 'employee'), getExpenses);
router.post('/expenses', authorize('superAdmin', 'employee'), createExpense);
router.put('/expenses/:id', authorize('superAdmin', 'employee'), updateExpense);
router.delete('/expenses/:id', authorize('superAdmin'), deleteExpense);
router.patch('/expenses/:id/approve', authorize('superAdmin'), approveExpense);

router.put('/:id', authorize('superAdmin'), updateFinanceEntry);
router.delete('/:id', authorize('superAdmin'), deleteFinanceEntry);

export default router;
