// =============================================
// RECONCILED FINANCE CALCULATION SERVICE
// Shared calculation engine for Dashboards, Reports, Forecasts, and Invariants
// =============================================

import mongoose from 'mongoose';
import Invoice from '../models/invoice.model.js';
import Payment from '../models/payment.model.js';
import Expense from '../models/expense.model.js';
import SalaryRecord from '../models/salaryRecord.model.js';
import FinanceAccount from '../models/financeAccount.model.js';
import InternalTransfer from '../models/internalTransfer.model.js';
import Subscription from '../models/subscription.model.js';
import CostAllocation from '../models/costAllocation.model.js';
import FounderTransaction from '../models/founderTransaction.model.js';
import PeriodLock from '../models/periodLock.model.js';
import FinanceAuditLog from '../models/financeAuditLog.model.js';
import Client from '../models/client.model.js';

/**
 * Format Indian Currency (e.g. ₹1,25,000.00)
 */
export const formatIndianNumber = (num, includeDecimals = true) => {
  if (num === null || num === undefined || isNaN(num)) return '₹0.00';
  const val = Number(num);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(val);
};

/**
 * Check if a date falls into a locked accounting period
 */
export const assertPeriodNotLocked = async (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const period = `${year}-${month}`;

  const lock = await PeriodLock.findOne({ period, isLocked: true });
  if (lock) {
    const error = new Error(`The financial period ${period} is closed and locked. Modifying or posting transactions in this period requires admin reopening.`);
    error.statusCode = 403;
    throw error;
  }
};

/**
 * Create immutable audit record
 */
export const recordFinanceAudit = async ({
  actorId,
  actorName = 'System',
  action,
  entityType,
  entityId,
  referenceNumber = '',
  description = '',
  changes = {},
  ipAddress = '',
}) => {
  try {
    await FinanceAuditLog.create({
      actor: actorId,
      actorName,
      action,
      entityType,
      entityId,
      referenceNumber,
      description,
      changes,
      ipAddress,
    });
  } catch (err) {
    console.error('Failed to write financial audit log:', err.message);
  }
};

/**
 * Compute Period KPIs & Financial Invariants
 */
export const computeFinanceKPIs = async ({ startDate, endDate, clientId, projectId }) => {
  const matchRange = {};
  if (startDate && endDate) {
    matchRange.$gte = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    matchRange.$lte = end;
  } else if (startDate) {
    matchRange.$gte = new Date(startDate);
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    matchRange.$lte = end;
  }

  // 1. Invoices filter (Service Revenue recognized only on Issued/Sent/Viewed/Paid invoices, excluding Draft and Void)
  const invoiceQuery = {
    status: { $nin: ['draft', 'void', 'cancelled'] },
    workflowStatus: { $nin: ['draft', 'void'] },
  };
  if (matchRange.$gte || matchRange.$lte) {
    invoiceQuery.invoiceDate = matchRange;
  }
  if (clientId) invoiceQuery.client = new mongoose.Types.ObjectId(clientId);
  if (projectId) invoiceQuery.project = new mongoose.Types.ObjectId(projectId);

  const invoices = await Invoice.find(invoiceQuery).lean();

  let recognizedServiceRevenue = 0;
  let passThroughAdBudgetTotal = 0;
  let billedTaxTotal = 0;
  let totalInvoicedAmount = 0;
  let outstandingReceivables = 0;
  let overdueReceivables = 0;
  const now = new Date();

  invoices.forEach((inv) => {
    recognizedServiceRevenue += Number(inv.serviceRevenue ?? inv.subtotal ?? 0);
    passThroughAdBudgetTotal += Number(inv.passThroughAdBudget || 0);
    billedTaxTotal += Number(inv.taxAmount || 0);
    totalInvoicedAmount += Number(inv.total || inv.totalAmount || 0);

    const balance = Number(inv.balanceAmount || 0);
    outstandingReceivables += balance;
    if (balance > 0 && inv.dueDate && new Date(inv.dueDate) < now) {
      overdueReceivables += balance;
    }
  });

  // 2. Client Payment Receipts (Cash Received)
  const paymentQuery = { status: 'paid' };
  if (matchRange.$gte || matchRange.$lte) {
    paymentQuery.receivedDate = matchRange;
  }
  if (clientId) paymentQuery.client = new mongoose.Types.ObjectId(clientId);
  if (projectId) paymentQuery.project = new mongoose.Types.ObjectId(projectId);

  const payments = await Payment.find(paymentQuery).lean();
  const cashReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 3. Recognized Expenses (posted/approved expenses in period)
  const expenseQuery = {
    approvalStatus: { $ne: 'rejected' },
  };
  if (matchRange.$gte || matchRange.$lte) {
    expenseQuery.date = matchRange;
  }
  if (clientId) expenseQuery.client = new mongoose.Types.ObjectId(clientId);
  if (projectId) expenseQuery.project = new mongoose.Types.ObjectId(projectId);

  const expenses = await Expense.find(expenseQuery).lean();
  let recognizedExpenses = 0;
  let cashPaidExpenses = 0;

  expenses.forEach((e) => {
    recognizedExpenses += Number(e.amount || 0);
    if (e.paymentStatus === 'paid') {
      cashPaidExpenses += Number(e.amount || 0);
    }
  });

  // 4. Approved & Paid Salaries
  const salaryQuery = {
    status: { $in: ['approved', 'paid', 'processing'] },
  };
  if (matchRange.$gte || matchRange.$lte) {
    salaryQuery.createdAt = matchRange;
  }
  const salaries = await SalaryRecord.find(salaryQuery).lean();
  let recognizedSalaries = 0;
  let cashPaidSalaries = 0;

  salaries.forEach((s) => {
    recognizedSalaries += Number(s.netSalary || 0);
    if (s.status === 'paid') {
      cashPaidSalaries += Number(s.paidAmount || s.netSalary || 0);
    }
  });

  // Total operating costs recognized
  const totalRecognizedCosts = recognizedExpenses + recognizedSalaries;
  const totalCashPaid = cashPaidExpenses + cashPaidSalaries;

  // 5. Net Profit & Margin
  // Formula: Net Profit = Recognized Service Revenue - Recognized Expenses
  const netProfit = recognizedServiceRevenue - totalRecognizedCosts;
  const profitMargin = recognizedServiceRevenue > 0
    ? (netProfit / recognizedServiceRevenue) * 100
    : null;

  // 6. Current Balances across active Finance Accounts
  const accounts = await FinanceAccount.find({ isActive: true }).lean();
  let totalCashBankBalance = 0;
  accounts.forEach((acc) => {
    totalCashBankBalance += Number(acc.currentBalance || 0);
  });

  return {
    recognizedServiceRevenue,
    passThroughAdBudgetTotal,
    billedTaxTotal,
    totalInvoicedAmount,
    cashReceived,
    recognizedExpenses: totalRecognizedCosts,
    operationalExpenses: recognizedExpenses,
    salaryExpenses: recognizedSalaries,
    cashPaid: totalCashPaid,
    netProfit,
    profitMargin: profitMargin !== null ? Number(profitMargin.toFixed(2)) : null,
    outstandingReceivables,
    overdueReceivables,
    totalCashBankBalance,
    invoicesCount: invoices.length,
    paymentsCount: payments.length,
    expensesCount: expenses.length,
    salariesCount: salaries.length,
  };
};

/**
 * Receivables Aging Buckets
 * Buckets:
 * 1. Current / Not Yet Due
 * 2. 1 - 30 days overdue
 * 3. 31 - 60 days overdue
 * 4. 61 - 90 days overdue
 * 5. 90+ days overdue
 */
export const computeReceivablesAging = async () => {
  const openInvoices = await Invoice.find({
    status: { $in: ['unpaid', 'partially_paid', 'sent', 'viewed'] },
    workflowStatus: { $ne: 'void' },
    balanceAmount: { $gt: 0 },
  })
    .populate('client', 'name company email phone')
    .sort({ dueDate: 1 })
    .lean();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const buckets = {
    current: { label: 'Current / Not Yet Due', minDays: -Infinity, maxDays: 0, total: 0, count: 0, invoices: [] },
    days1_30: { label: '1 - 30 Days Overdue', minDays: 1, maxDays: 30, total: 0, count: 0, invoices: [] },
    days31_60: { label: '31 - 60 Days Overdue', minDays: 31, maxDays: 60, total: 0, count: 0, invoices: [] },
    days61_90: { label: '61 - 90 Days Overdue', minDays: 61, maxDays: 90, total: 0, count: 0, invoices: [] },
    days90Plus: { label: '90+ Days Overdue', minDays: 91, maxDays: Infinity, total: 0, count: 0, invoices: [] },
  };

  let totalOutstanding = 0;

  openInvoices.forEach((inv) => {
    const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate || inv.createdAt);
    due.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - due.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const balance = Number(inv.balanceAmount || 0);
    totalOutstanding += balance;

    const item = {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client?.company || inv.client?.name || inv.clientDetails?.businessName || 'Unknown Client',
      clientEmail: inv.client?.email,
      clientPhone: inv.client?.phone,
      issueDate: inv.issueDate || inv.invoiceDate,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, daysOverdue),
      totalAmount: inv.total || inv.totalAmount,
      paidAmount: inv.paidAmount || 0,
      balanceAmount: balance,
    };

    if (daysOverdue <= 0) {
      buckets.current.total += balance;
      buckets.current.count += 1;
      buckets.current.invoices.push(item);
    } else if (daysOverdue <= 30) {
      buckets.days1_30.total += balance;
      buckets.days1_30.count += 1;
      buckets.days1_30.invoices.push(item);
    } else if (daysOverdue <= 60) {
      buckets.days31_60.total += balance;
      buckets.days31_60.count += 1;
      buckets.days31_60.invoices.push(item);
    } else if (daysOverdue <= 90) {
      buckets.days61_90.total += balance;
      buckets.days61_90.count += 1;
      buckets.days61_90.invoices.push(item);
    } else {
      buckets.days90Plus.total += balance;
      buckets.days90Plus.count += 1;
      buckets.days90Plus.invoices.push(item);
    }
  });

  return {
    totalOutstanding,
    buckets: Object.values(buckets),
  };
};

/**
 * Reconciled Client Profitability & Cost Allocation
 *
 * Formulas:
 * Contribution = recognized service revenue - direct service costs
 * Net client profit = contribution - allocated overhead
 * Margin = net client profit / service revenue * 100 (N/A if service revenue is 0)
 */
export const computeClientProfitabilityReport = async ({ servicePeriod, clientId }) => {
  const clientFilter = { status: { $ne: 'churned' } };
  if (clientId) clientFilter._id = new mongoose.Types.ObjectId(clientId);
  const clients = await Client.find(clientFilter).lean();

  const clientMap = {};
  clients.forEach((c) => {
    clientMap[String(c._id)] = {
      clientId: c._id,
      clientName: c.company || c.name,
      monthlyPlanFee: c.monthlyPlanFee || c.contractValue || 0,
      servicePlan: c.servicePlan || 'Retainer',
      deliverables: c.deliverables || '',
      status: c.status,
      serviceRevenue: 0,
      passThroughAdBudget: 0,
      directCosts: 0,
      directCostBreakdown: {
        editing: 0,
        design: 0,
        shootTravel: 0,
        freelancers: 0,
        tools: 0,
        other: 0,
      },
      allocatedOverhead: 0,
      contribution: 0,
      netProfit: 0,
      marginPercent: null,
      allocations: [],
    };
  });

  // Query Invoices for the period
  const invQuery = {
    status: { $nin: ['draft', 'void', 'cancelled'] },
    workflowStatus: { $ne: 'void' },
  };
  if (servicePeriod) {
    invQuery.servicePeriod = servicePeriod;
  }
  const invoices = await Invoice.find(invQuery).lean();
  invoices.forEach((inv) => {
    const cid = String(inv.client);
    if (clientMap[cid]) {
      clientMap[cid].serviceRevenue += Number(inv.serviceRevenue ?? inv.subtotal ?? 0);
      clientMap[cid].passThroughAdBudget += Number(inv.passThroughAdBudget || 0);
    }
  });

  // Query Cost Allocations for the period
  const allocQuery = {};
  if (servicePeriod) allocQuery.servicePeriod = servicePeriod;
  const allocations = await CostAllocation.find(allocQuery).lean();

  allocations.forEach((alloc) => {
    const cid = String(alloc.client);
    if (!clientMap[cid]) return;

    const amount = Number(alloc.allocatedAmount || 0);
    clientMap[cid].allocations.push(alloc);

    if (alloc.costType === 'direct') {
      clientMap[cid].directCosts += amount;
      const act = (alloc.activityDeliverable || '').toLowerCase();
      if (act.includes('edit')) clientMap[cid].directCostBreakdown.editing += amount;
      else if (act.includes('design')) clientMap[cid].directCostBreakdown.design += amount;
      else if (act.includes('shoot') || act.includes('travel')) clientMap[cid].directCostBreakdown.shootTravel += amount;
      else if (act.includes('freelance')) clientMap[cid].directCostBreakdown.freelancers += amount;
      else if (act.includes('tool') || act.includes('software')) clientMap[cid].directCostBreakdown.tools += amount;
      else clientMap[cid].directCostBreakdown.other += amount;
    } else {
      clientMap[cid].allocatedOverhead += amount;
    }
  });

  // Compute Contribution, Net Profit, and Margin
  const report = Object.values(clientMap).map((row) => {
    const contribution = row.serviceRevenue - row.directCosts;
    const netProfit = contribution - row.allocatedOverhead;
    const margin = row.serviceRevenue > 0
      ? Number(((netProfit / row.serviceRevenue) * 100).toFixed(2))
      : null;

    return {
      ...row,
      contribution,
      netProfit,
      marginPercent: margin,
    };
  });

  // Sort by highest profit
  report.sort((a, b) => b.netProfit - a.netProfit);
  return report;
};

/**
 * Six-Month Cash Forecast with Scenario Analysis
 */
export const computeSixMonthCashForecast = async ({ scenario = 'expected' } = {}) => {
  // Scenario adjustment factors
  const factors = {
    conservative: { collectionFactor: 0.85, expenseFactor: 1.08 },
    expected: { collectionFactor: 1.00, expenseFactor: 1.00 },
    growth: { collectionFactor: 1.15, expenseFactor: 0.95 },
  }[scenario] || { collectionFactor: 1.0, expenseFactor: 1.0 };

  // Current opening cash across accounts
  const accounts = await FinanceAccount.find({ isActive: true }).lean();
  let currentCash = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  // Active client monthly retainers
  const activeClients = await Client.find({ status: 'active' }).lean();
  const monthlyClientRetainers = activeClients.reduce((sum, c) => {
    return sum + Number(c.monthlyPlanFee || c.contractValue || 0);
  }, 0);

  // Active employee salary commitments
  const activeEmployees = await SalaryRecord.aggregate([
    { $match: { status: { $ne: 'hold' } } },
    { $group: { _id: '$employee', lastSalary: { $last: '$netSalary' } } },
  ]);
  const estimatedMonthlySalaries = activeEmployees.reduce((sum, e) => sum + Number(e.lastSalary || 0), 0);

  // Recurring software/hosting subscriptions
  const subscriptions = await Subscription.find({ status: 'active' }).lean();
  let monthlySubscriptionCost = 0;
  subscriptions.forEach((sub) => {
    if (sub.frequency === 'annual') {
      monthlySubscriptionCost += Number(sub.expectedAmount || 0) / 12;
    } else {
      monthlySubscriptionCost += Number(sub.expectedAmount || 0);
    }
  });

  // Estimated overhead and vendor bills (past 30 days actual recorded expenses)
  const pastExpenses = await Expense.find({
    paymentStatus: 'paid',
    date: { $gte: new Date(Date.now() - 30 * 86400000) },
  }).lean();
  const estimatedMonthlyOverhead = pastExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const forecastMonths = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();

  let runningCash = currentCash;
  let totalNetCashFlow = 0;

  for (let i = 0; i < 6; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const mLabel = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

    // Expected inflows
    const baseInflow = monthlyClientRetainers;
    const projectedInflow = Math.round(baseInflow * factors.collectionFactor);

    // Expected outflows
    const baseOutflow = estimatedMonthlySalaries + monthlySubscriptionCost + estimatedMonthlyOverhead;
    const projectedOutflow = Math.round(baseOutflow * factors.expenseFactor);

    const netMovement = projectedInflow - projectedOutflow;
    const openingCash = runningCash;
    const closingCash = openingCash + netMovement;
    runningCash = closingCash;
    totalNetCashFlow += netMovement;

    forecastMonths.push({
      monthIndex: i + 1,
      monthLabel: mLabel,
      openingCash,
      projectedInflow,
      breakdownInflow: {
        clientRetainers: projectedInflow,
      },
      projectedOutflow,
      breakdownOutflow: {
        salaries: Math.round(estimatedMonthlySalaries * factors.expenseFactor),
        subscriptions: Math.round(monthlySubscriptionCost * factors.expenseFactor),
        overhead: Math.round(estimatedMonthlyOverhead * factors.expenseFactor),
      },
      netMovement,
      closingCash,
    });
  }

  // Runway calculation: currentCash / monthly burn rate
  const monthlyAverageBurn = forecastMonths.reduce((sum, m) => sum + m.projectedOutflow, 0) / 6;
  const monthlyAverageNet = totalNetCashFlow / 6;
  let runwayMonths = 'N/A';
  if (monthlyAverageBurn > 0) {
    if (monthlyAverageNet < 0 && currentCash > 0) {
      runwayMonths = (currentCash / Math.abs(monthlyAverageNet)).toFixed(1);
    } else if (monthlyAverageNet >= 0) {
      runwayMonths = 'Profitable / Self-sustaining';
    }
  } else {
    runwayMonths = 'N/A';
  }

  return {
    scenario,
    openingCash: currentCash,
    runwayMonths,
    monthlyAverageBurn: Math.round(monthlyAverageBurn),
    forecastMonths,
  };
};

/**
 * Reconcile Account Balance
 * openingBalance + totalInflows - totalOutflows = closingBalance
 */
export const reconcileAccountBalance = async (accountId) => {
  const account = await FinanceAccount.findById(accountId);
  if (!account) return null;

  // Inflows:
  // 1. Client Payment Receipts
  const payments = await Payment.find({
    destinationAccount: accountId,
    status: 'paid',
  }).lean();
  const paymentInflow = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 2. Transfers In
  const transfersIn = await InternalTransfer.find({ toAccount: accountId }).lean();
  const transferInflow = transfersIn.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // 3. Founder Inflows (capital introduced, loans to company)
  const founderInflows = await FounderTransaction.find({
    account: accountId,
    direction: 'inflow',
  }).lean();
  const founderInflowTotal = founderInflows.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // Outflows:
  // 1. Paid Expenses
  const expenses = await Expense.find({
    fundingAccount: accountId,
    paymentStatus: 'paid',
  }).lean();
  const expenseOutflow = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // 2. Paid Salaries
  const salaries = await SalaryRecord.find({
    paymentAccount: accountId,
    status: 'paid',
  }).lean();
  const salaryOutflow = salaries.reduce((sum, s) => sum + Number(s.paidAmount || s.netSalary || 0), 0);

  // 3. Transfers Out (including transfer bank fee)
  const transfersOut = await InternalTransfer.find({ fromAccount: accountId }).lean();
  const transferOutflow = transfersOut.reduce((sum, t) => sum + Number(t.amount || 0) + Number(t.bankFee || 0), 0);

  // 4. Founder Outflows (drawings, loan repayments, profit distributions)
  const founderOutflows = await FounderTransaction.find({
    account: accountId,
    direction: 'outflow',
  }).lean();
  const founderOutflowTotal = founderOutflows.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const totalInflows = paymentInflow + transferInflow + founderInflowTotal;
  const totalOutflows = expenseOutflow + salaryOutflow + transferOutflow + founderOutflowTotal;
  const calculatedClosing = Number(account.openingBalance || 0) + totalInflows - totalOutflows;

  // Atomic sync
  account.currentBalance = calculatedClosing;
  await account.save();

  return {
    accountId: account._id,
    accountName: account.accountName,
    openingBalance: account.openingBalance,
    totalInflows,
    totalOutflows,
    closingBalance: calculatedClosing,
    inflowsBreakdown: { payments: paymentInflow, transfersIn: transferInflow, founder: founderInflowTotal },
    outflowsBreakdown: { expenses: expenseOutflow, salaries: salaryOutflow, transfersOut: transferOutflow, founder: founderOutflowTotal },
  };
};
