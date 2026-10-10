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

import {
  getFinanceOverview,
  getFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
  deleteFinanceAccount,
  reconcileAccount,
  getInternalTransfers,
  createInternalTransfer,
  deleteInternalTransfer,
  getModuleInvoices,
  createModuleInvoice,
  updateModuleInvoice,
  deleteModuleInvoice,
  updateInvoiceWorkflow,
  generateMonthlyRetainerInvoices,
  recordClientPaymentReceipt,
  getPaymentReceipts,
  updatePaymentReceipt,
  deletePaymentReceipt,
  getModuleExpenses,
  createModuleExpense,
  updateModuleExpense,
  deleteModuleExpense,
  payVendorBill,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  postSubscriptionRenewal,
  getPayrollRecords,
  getPayrollRecord,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  getEmployeesForPayroll,
  calculateMonthlyPayroll,
  approvePayrollRecord,
  payPayrollRecord,
  getClientProfitability,
  createCostAllocation,
  deleteCostAllocation,
  getFounderTransactions,
  createFounderTransaction,
  getReceivablesAgingReport,
  getCashForecastReport,
  getDailyCashbookReport,
  getMonthlyProfitAndLossReport,
  getPeriodLocks,
  togglePeriodLock,
  getFinanceAuditLogs,
  getFinanceBudgets,
  setFinanceBudget,
} from '../controllers/financeModule.controller.js';

import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get('/invoices/public/:publicLink', getInvoiceByPublicLink);
router.use(protect);

// =============================================
// ADVANCED FINANCE MODULE ROUTES
// =============================================

// 1. Overview & Period KPIs
router.get('/module/overview', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getFinanceOverview);

// 2. Bank, Cash & UPI Accounts
router.get('/accounts', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getFinanceAccounts);
router.post('/accounts', authorize('superAdmin', 'admin', 'financeManager'), createFinanceAccount);
router.put('/accounts/:id', authorize('superAdmin', 'admin', 'financeManager'), updateFinanceAccount);
router.delete('/accounts/:id', authorize('superAdmin', 'admin', 'financeManager'), deleteFinanceAccount);
router.post('/accounts/:id/reconcile', authorize('superAdmin', 'admin', 'financeManager'), reconcileAccount);

// 3. Internal Transfers
router.get('/transfers', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getInternalTransfers);
router.post('/transfers', authorize('superAdmin', 'admin', 'financeManager'), createInternalTransfer);
router.delete('/transfers/:id', authorize('superAdmin', 'admin', 'financeManager'), deleteInternalTransfer);

// 4. Invoices & Revenue Master
router.get('/module/invoices', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'accountManager'), getModuleInvoices);
router.post('/module/invoices', authorize('superAdmin', 'admin', 'financeManager'), createModuleInvoice);
router.put('/module/invoices/:id', authorize('superAdmin', 'admin', 'financeManager'), updateModuleInvoice);
router.delete('/module/invoices/:id', authorize('superAdmin', 'admin', 'financeManager'), deleteModuleInvoice);
router.patch('/module/invoices/:id/workflow', authorize('superAdmin', 'admin', 'financeManager'), updateInvoiceWorkflow);
router.post('/module/invoices/retainer-generate', authorize('superAdmin', 'admin', 'financeManager'), generateMonthlyRetainerInvoices);

// 5. Client Payment Receipts
router.get('/receipts', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'accountManager'), getPaymentReceipts);
router.post('/receipts', authorize('superAdmin', 'admin', 'financeManager'), recordClientPaymentReceipt);
router.put('/receipts/:id', authorize('superAdmin', 'admin', 'financeManager'), updatePaymentReceipt);
router.delete('/receipts/:id', authorize('superAdmin', 'admin', 'financeManager'), deletePaymentReceipt);

// 6. Expenses & Vendor Bills
router.get('/module/expenses', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'accountManager', 'editor', 'designer', 'employee'), getModuleExpenses);
router.post('/module/expenses', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'accountManager', 'editor', 'designer', 'employee'), createModuleExpense);
router.put('/module/expenses/:id', authorize('superAdmin', 'admin', 'manager', 'financeManager'), updateModuleExpense);
router.delete('/module/expenses/:id', authorize('superAdmin', 'admin', 'manager', 'financeManager'), deleteModuleExpense);
router.post('/module/expenses/:id/pay', authorize('superAdmin', 'admin', 'financeManager'), payVendorBill);

// 7. Recurring Subscriptions
router.get('/subscriptions', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getSubscriptions);
router.post('/subscriptions', authorize('superAdmin', 'admin', 'financeManager'), createSubscription);
router.put('/subscriptions/:id', authorize('superAdmin', 'admin', 'financeManager'), updateSubscription);
router.delete('/subscriptions/:id', authorize('superAdmin', 'admin', 'financeManager'), deleteSubscription);
router.post('/subscriptions/:id/post-renewal', authorize('superAdmin', 'admin', 'financeManager'), postSubscriptionRenewal);

// 8. Payroll Integration
router.get('/payroll/employees', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getEmployeesForPayroll);
router.get('/payroll/:id', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getPayrollRecord);
router.get('/payroll', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getPayrollRecords);
router.post('/payroll', authorize('superAdmin', 'admin', 'financeManager'), createPayrollRecord);
router.put('/payroll/:id', authorize('superAdmin', 'admin', 'financeManager'), updatePayrollRecord);
router.delete('/payroll/:id', authorize('superAdmin', 'admin', 'financeManager'), deletePayrollRecord);
router.post('/payroll/calculate', authorize('superAdmin', 'admin', 'financeManager'), calculateMonthlyPayroll);
router.patch('/payroll/:id/approve', authorize('superAdmin', 'admin', 'financeManager'), approvePayrollRecord);
router.post('/payroll/:id/pay', authorize('superAdmin', 'admin', 'financeManager'), payPayrollRecord);

// 9. Client Cost Allocation & Profitability
router.get('/profitability', authorize('superAdmin', 'admin', 'manager', 'financeManager', 'accountManager'), getClientProfitability);
router.post('/allocations', authorize('superAdmin', 'admin', 'financeManager'), createCostAllocation);
router.delete('/allocations/:id', authorize('superAdmin', 'admin', 'financeManager'), deleteCostAllocation);

// 10. Founder Accounts (Restricted to superAdmin / admin)
router.get('/founders', authorize('superAdmin', 'admin'), getFounderTransactions);
router.post('/founders', authorize('superAdmin', 'admin'), createFounderTransaction);

// 11. Reports & Cash Forecasts
router.get('/reports/aging', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getReceivablesAgingReport);
router.get('/reports/forecast', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getCashForecastReport);
router.get('/reports/cashbook', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getDailyCashbookReport);
router.get('/reports/pnl', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getMonthlyProfitAndLossReport);

// 12. Period Locks & Audit Settings
router.get('/settings/period-locks', authorize('superAdmin', 'admin', 'financeManager'), getPeriodLocks);
router.post('/settings/period-locks/toggle', authorize('superAdmin', 'admin'), togglePeriodLock);
router.get('/settings/audit-logs', authorize('superAdmin', 'admin'), getFinanceAuditLogs);
router.get('/settings/budgets', authorize('superAdmin', 'admin', 'manager', 'financeManager'), getFinanceBudgets);
router.post('/settings/budgets', authorize('superAdmin', 'admin', 'financeManager'), setFinanceBudget);

// =============================================
// LEGACY CRM COMPATIBILITY ROUTES
// =============================================

router.get('/summary', authorize('superAdmin', 'manager', 'admin', 'financeManager'), getFinanceSummary);
router.get('/dashboard-summary', authorize('superAdmin', 'manager', 'admin', 'financeManager'), getFinanceDashboardSummary);

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
router.post('/invoices', authorize('superAdmin', 'admin', 'financeManager'), createInvoice);
router.put('/invoices/:id', authorize('superAdmin', 'admin', 'financeManager'), updateInvoice);
router.post('/invoices/:id/send', authorize('superAdmin', 'admin', 'financeManager'), sendInvoice);
router.post('/invoices/:id/viewed', authorize('client'), markInvoiceViewed);
router.post('/invoices/:id/partial-payment', authorize('superAdmin', 'admin', 'financeManager'), addPartialPaymentToInvoice);
router.post('/invoices/:id/mark-paid', authorize('superAdmin', 'admin', 'financeManager'), markInvoicePaid);
router.delete('/invoices/:id', authorize('superAdmin', 'admin'), deleteInvoice);
router.get('/payments', authorize('superAdmin', 'manager', 'employee', 'client'), getPayments);

router.get('/call-history/followups/today', authorize('superAdmin', 'manager', 'employee', 'client'), getTodayFollowUpCalls);
router.get('/call-history/client/:clientId', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistoryByClient);
router.get('/call-history/project/:projectId', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistoryByProject);
router.get('/call-history', authorize('superAdmin', 'manager', 'employee', 'client'), getCallHistory);
router.post('/call-history', authorize('superAdmin', 'employee'), addCallHistory);
router.put('/call-history/:id', authorize('superAdmin', 'employee'), updateCallHistory);
router.delete('/call-history/:id', authorize('superAdmin'), deleteCallHistory);

router.get('/expenses/monthly-report', authorize('superAdmin', 'manager', 'admin', 'financeManager'), getMonthlyExpenseReport);
router.get('/expenses', authorize('superAdmin', 'manager', 'employee', 'admin', 'financeManager'), getExpenses);
router.post('/expenses', authorize('superAdmin', 'employee', 'admin', 'financeManager'), createExpense);
router.put('/expenses/:id', authorize('superAdmin', 'employee', 'admin', 'financeManager'), updateExpense);
router.delete('/expenses/:id', authorize('superAdmin', 'admin'), deleteExpense);
router.patch('/expenses/:id/approve', authorize('superAdmin', 'admin', 'financeManager'), approveExpense);

router.put('/:id', authorize('superAdmin', 'admin'), updateFinanceEntry);
router.delete('/:id', authorize('superAdmin', 'admin'), deleteFinanceEntry);

export default router;
