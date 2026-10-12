// =============================================
// RISE WITH MEDIA - ADVANCED FINANCE MODULE CONTROLLER
// Functional endpoints for Accounts, Invoices, Receipts, Expenses, Transfers,
// Subscriptions, Payroll, Cost Allocation, Founders, Reports & Exports
// =============================================

import mongoose from 'mongoose';
import FinanceAccount from '../models/financeAccount.model.js';
import InternalTransfer from '../models/internalTransfer.model.js';
import Invoice from '../models/invoice.model.js';
import Payment from '../models/payment.model.js';
import Expense from '../models/expense.model.js';
import Subscription from '../models/subscription.model.js';
import CostAllocation from '../models/costAllocation.model.js';
import FounderTransaction from '../models/founderTransaction.model.js';
import SalaryRecord from '../models/salaryRecord.model.js';
import FinanceBudget from '../models/financeBudget.model.js';
import PeriodLock from '../models/periodLock.model.js';
import FinanceAuditLog from '../models/financeAuditLog.model.js';
import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import IdempotencyKey from '../models/idempotencyKey.model.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { emitLiveEvent } from '../utils/socketEmitter.js';
import { parsePagination } from '../utils/pagination.js';
import crypto from 'crypto';

import {
  computeFinanceKPIs,
  computeReceivablesAging,
  computeClientProfitabilityReport,
  computeSixMonthCashForecast,
  reconcileAccountBalance,
  assertPeriodNotLocked,
  recordFinanceAudit,
  formatIndianNumber,
} from '../services/financeCalculation.service.js';

// =============================================
// 1. OVERVIEW & KPIS
// =============================================

export const getFinanceOverview = async (req, res) => {
  try {
    const { startDate, endDate, clientId, projectId } = req.query;
    const kpis = await computeFinanceKPIs({ startDate, endDate, clientId, projectId });

    // Monthly revenue vs expenses chart (last 6 months)
    const today = new Date();
    const monthlySeries = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [invoicesByMonth, expensesByMonth, salariesByMonth] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            status: { $nin: ['draft', 'void', 'cancelled'] },
            invoiceDate: { $gte: sixMonthsAgo, $lte: endOfCurrentMonth },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: '$invoiceDate', timezone: 'Asia/Kolkata' } },
              month: { $month: { date: '$invoiceDate', timezone: 'Asia/Kolkata' } },
            },
            revenue: {
              $sum: { $ifNull: ['$serviceRevenue', { $ifNull: ['$subtotal', 0] }] },
            },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            approvalStatus: { $ne: 'rejected' },
            date: { $gte: sixMonthsAgo, $lte: endOfCurrentMonth },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: '$date', timezone: 'Asia/Kolkata' } },
              month: { $month: { date: '$date', timezone: 'Asia/Kolkata' } },
            },
            total: { $sum: '$amount' },
          },
        },
      ]),
      SalaryRecord.aggregate([
        {
          $match: {
            status: { $in: ['approved', 'paid'] },
            createdAt: { $gte: sixMonthsAgo, $lte: endOfCurrentMonth },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
              month: { $month: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
            },
            total: { $sum: '$netSalary' },
          },
        },
      ]),
    ]);

    const revMap = new Map();
    invoicesByMonth.forEach((r) => revMap.set(`${r._id.year}-${r._id.month}`, r.revenue || 0));

    const expMap = new Map();
    expensesByMonth.forEach((e) => expMap.set(`${e._id.year}-${e._id.month}`, e.total || 0));

    const salMap = new Map();
    salariesByMonth.forEach((s) => salMap.set(`${s._id.year}-${s._id.month}`, s.total || 0));

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m}`;
      const mLabel = `${monthNames[d.getMonth()]} ${y}`;

      const revenue = revMap.get(key) || 0;
      const opExpenses = expMap.get(key) || 0;
      const salExpenses = salMap.get(key) || 0;
      const totalCosts = opExpenses + salExpenses;
      const profit = revenue - totalCosts;

      monthlySeries.push({
        month: mLabel,
        revenue,
        expenses: totalCosts,
        netProfit: profit,
        margin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
      });
    }

    // Expense category breakdown
    const categoryMatch = { approvalStatus: { $ne: 'rejected' } };
    if (startDate || endDate) {
      categoryMatch.date = {};
      if (startDate) categoryMatch.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        categoryMatch.date.$lte = end;
      }
    }

    const categoryAgg = await Expense.aggregate([
      { $match: categoryMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const categoryBreakdown = categoryAgg.map((c) => ({
      category: c._id || 'other',
      amount: c.total,
      count: c.count,
    }));

    // Recent financial transactions (combined invoices, payments, expenses, transfers)
    const [recentInvoices, recentPayments, recentExpenses, recentTransfers] = await Promise.all([
      Invoice.find({ status: { $ne: 'draft' } })
        .sort({ invoiceDate: -1 })
        .limit(5)
        .populate('client', 'name company')
        .lean(),
      Payment.find({ status: 'paid' })
        .sort({ receivedDate: -1 })
        .limit(5)
        .populate('client', 'name company')
        .populate('destinationAccount', 'accountName')
        .lean(),
      Expense.find()
        .sort({ date: -1 })
        .limit(5)
        .populate('client', 'name company')
        .populate('fundingAccount', 'accountName')
        .lean(),
      InternalTransfer.find()
        .sort({ date: -1 })
        .limit(5)
        .populate('fromAccount', 'accountName')
        .populate('toAccount', 'accountName')
        .lean(),
    ]);

    // Active in-app alerts
    const alerts = [];
    if (kpis.overdueReceivables > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Receivables Alert',
        message: `₹${kpis.overdueReceivables.toLocaleString('en-IN')} is currently overdue from clients.`,
        actionLink: '/finance/invoices?status=overdue',
      });
    }

    // Renewal subscriptions within 5 days
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    const renewalSubs = await Subscription.find({
      status: 'active',
      nextRenewalDate: { $lte: fiveDaysLater, $gte: new Date() },
    }).lean();

    if (renewalSubs.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Upcoming Subscription Renewals',
        message: `${renewalSubs.length} recurring tool subscription(s) renewing within 5 days.`,
        actionLink: '/finance/expenses',
      });
    }

    // Low cash alert if balance < 1,00,000 (only if accounts exist)
    const activeAccountsCount = await FinanceAccount.countDocuments({ isActive: true });
    if (activeAccountsCount > 0 && kpis.totalCashBankBalance < 100000) {
      alerts.push({
        type: 'danger',
        title: 'Low Cash Balance Warning',
        message: `Consolidated bank & cash balance is ₹${kpis.totalCashBankBalance.toLocaleString('en-IN')}. Consider checking receivables.`,
        actionLink: '/finance/cash-flow',
      });
    }

    res.json({
      success: true,
      kpis,
      monthlySeries,
      categoryBreakdown,
      recentTransactions: {
        invoices: recentInvoices,
        payments: recentPayments,
        expenses: recentExpenses,
        transfers: recentTransfers,
      },
      alerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 2. ACCOUNTS & TRANSFERS
// =============================================

export const getFinanceAccounts = async (req, res) => {
  try {
    const accounts = await FinanceAccount.find().sort({ accountType: 1, accountName: 1 }).lean();

    // Only compute live breakdown without DB writes if explicitly requested
    const shouldComputeBreakdown = req.query.computeBreakdown === 'true';

    let detailed = accounts;
    if (shouldComputeBreakdown) {
      detailed = await Promise.all(
        accounts.map(async (acc) => {
          const reconciliation = await reconcileAccountBalance(acc._id, { persist: false });
          return {
            ...acc,
            currentBalance: reconciliation?.closingBalance ?? acc.currentBalance,
            reconciliation,
          };
        })
      );
    }

    res.json({ success: true, accounts: detailed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFinanceAccount = async (req, res) => {
  try {
    const { accountName, accountType, bankName, accountNumber, ifscCode, upiId, openingBalance, cutoverDate, notes } = req.body;

    const opBal = Number(openingBalance || 0);
    const account = await FinanceAccount.create({
      accountName,
      accountType: accountType || 'bank',
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      openingBalance: opBal,
      currentBalance: opBal,
      cutoverDate: cutoverDate ? new Date(cutoverDate) : new Date(),
      notes,
      createdBy: req.user?._id,
    });

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'create',
      entityType: 'FinanceAccount',
      entityId: account._id,
      description: `Created ${accountType} account: ${accountName} with opening balance ₹${opBal}`,
      changes: account.toObject(),
    });

    res.status(201).json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFinanceAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await FinanceAccount.findById(id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    Object.assign(account, req.body);
    await account.save();
    await reconcileAccountBalance(account._id);

    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reconcileAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await reconcileAccountBalance(id);
    if (!report) return res.status(404).json({ success: false, message: 'Account not found' });

    res.json({ success: true, reconciliation: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFinanceAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await FinanceAccount.findByIdAndDelete(id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInternalTransfers = async (req, res) => {
  try {
    const { startDate, endDate, sortOrder = 'desc' } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    const sort = { date: sortOrder === 'asc' ? 1 : -1 };

    const transfers = await InternalTransfer.find(query)
      .populate('fromAccount', 'accountName accountType')
      .populate('toAccount', 'accountName accountType')
      .populate('createdBy', 'name')
      .sort(sort)
      .lean();

    res.json({ success: true, transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInternalTransfer = async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, bankFee, date, reference, notes, proofUrl } = req.body;
    const transferAmount = Number(amount);
    const fee = Number(bankFee || 0);

    if (transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Transfer amount must be positive' });
    }
    if (fromAccount === toAccount) {
      return res.status(400).json({ success: false, message: 'Source and destination accounts must be different' });
    }

    await assertPeriodNotLocked(date || new Date());

    const fromAcc = await FinanceAccount.findById(fromAccount);
    const toAcc = await FinanceAccount.findById(toAccount);

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ success: false, message: 'One or both accounts not found' });
    }

    const transfer = await runInTransaction(async (session) => {
      let createdTransfer;
      const transferData = {
        fromAccount,
        toAccount,
        amount: transferAmount,
        bankFee: fee,
        date: date ? new Date(date) : new Date(),
        reference,
        notes,
        proofUrl,
        createdBy: req.user?._id,
      };

      if (session) {
        const created = await InternalTransfer.create([transferData], { session });
        createdTransfer = created[0];
      } else {
        createdTransfer = await InternalTransfer.create(transferData);
      }

      // If an explicit bank fee was recorded, create an linked operational Expense for the fee
      if (fee > 0) {
        const expenseData = {
          title: `Transfer Bank Fee: ${reference || 'Internal Transfer'}`,
          description: `Bank transfer fee from ${fromAcc.accountName} to ${toAcc.accountName}`,
          amount: fee,
          category: 'office',
          costType: 'agency_overhead',
          paymentStatus: 'paid',
          paymentMode: 'Bank',
          fundingAccount: fromAccount,
          date: createdTransfer.date,
          submittedBy: req.user?._id,
          approvedBy: req.user?._id,
          status: 'approved',
        };
        if (session) {
          await Expense.create([expenseData], { session });
        } else {
          await Expense.create(expenseData);
        }
      }

      // Reconcile both accounts atomically within session
      await reconcileAccountBalance(fromAccount, { session, persist: true });
      await reconcileAccountBalance(toAccount, { session, persist: true });

      await recordFinanceAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'transfer',
        entityType: 'InternalTransfer',
        entityId: createdTransfer._id,
        description: `Transferred ₹${transferAmount} from ${fromAcc.accountName} to ${toAcc.accountName}`,
        changes: createdTransfer.toObject ? createdTransfer.toObject() : createdTransfer,
        session,
      });

      return createdTransfer;
    });

    res.status(201).json({ success: true, transfer });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteInternalTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await InternalTransfer.findById(id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

    const { fromAccount, toAccount } = transfer;
    await transfer.deleteOne();

    if (fromAccount) await reconcileAccountBalance(fromAccount);
    if (toAccount) await reconcileAccountBalance(toAccount);

    res.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 3. INVOICES & REVENUE
// =============================================

export const getModuleInvoices = async (req, res) => {
  try {
    const { status, workflowStatus, client, search, servicePeriod, startDate, endDate } = req.query;
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const filter = {};

    if (client) filter.client = client;
    if (status && status !== 'all') filter.status = status;
    if (workflowStatus && workflowStatus !== 'all') filter.workflowStatus = workflowStatus;
    if (servicePeriod && servicePeriod !== 'all') filter.servicePeriod = servicePeriod;

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.invoiceDate.$lte = end;
      }
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { 'clientDetails.name': { $regex: q, $options: 'i' } },
        { 'clientDetails.businessName': { $regex: q, $options: 'i' } },
      ];
    }

    const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1;
    const findQuery = Invoice.find(filter)
      .populate('client', 'name company email phone monthlyPlanFee servicePlan deliverables billingDate')
      .populate('issuedBy', 'name email')
      .sort({ invoiceDate: sortDirection, createdAt: sortDirection })
      .lean();

    if (isPaginated) {
      findQuery.skip(skip).limit(limit);
    }

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      findQuery,
    ]);

    // Dynamically derive overdue flag for any unpaid/partially paid past due date
    const now = new Date();
    const enriched = invoices.map((inv) => {
      const isPastDue = inv.dueDate && new Date(inv.dueDate) < now && Number(inv.balanceAmount || 0) > 0;
      return {
        ...inv,
        isOverdue: isPastDue,
        displayStatus: isPastDue && inv.status !== 'void' ? 'overdue' : inv.status,
      };
    });

    res.json({
      success: true,
      total,
      ...(isPaginated ? { page, pages: Math.ceil(total / limit) } : {}),
      invoices: enriched,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const createModuleInvoice = async (req, res) => {
  try {
    const {
      client,
      invoiceDate,
      dueDate,
      servicePeriod,
      lineItems = [],
      taxType = 'exclusive',
      taxRate = 18,
      notes,
      terms,
      isRetainer = false,
      workflowStatus = 'draft',
      attachments = [],
    } = req.body;

    if (!client) {
      return res.status(400).json({ success: false, message: 'Client is required' });
    }
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }

    await assertPeriodNotLocked(invoiceDate || new Date());

    // Duplicate Retainer Invoice Check:
    // Prevent duplicate invoices for the same client, contract, and service period unless explicitly created as an additional charge
    if (isRetainer && servicePeriod) {
      const existing = await Invoice.findOne({
        client,
        servicePeriod,
        isRetainer: true,
        workflowStatus: { $ne: 'void' },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A retainer invoice (${existing.invoiceNumber}) already exists for this client for period ${servicePeriod}. Please edit the existing invoice or create an additional charge.`,
        });
      }
    }

    const clientDoc = await Client.findById(client);

    const invoice = new Invoice({
      client,
      clientId: client,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      issueDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
      servicePeriod: servicePeriod || '',
      isRetainer,
      workflowStatus: workflowStatus || 'draft',
      status: workflowStatus === 'issued' ? 'unpaid' : 'draft',
      taxType,
      taxRate: taxType === 'exempt' ? 0 : Number(taxRate || 0),
      lineItems: lineItems.map((li) => ({
        serviceName: li.serviceName || '',
        description: li.description || 'Service',
        quantity: Number(li.quantity || 1),
        rate: Number(li.rate ?? li.unitPrice ?? 0),
        unitPrice: Number(li.rate ?? li.unitPrice ?? 0),
        amount: Number(li.quantity || 1) * Number(li.rate ?? li.unitPrice ?? 0),
        itemType: li.itemType || 'service',
      })),
      clientDetails: {
        name: clientDoc?.name || '',
        businessName: clientDoc?.company || clientDoc?.name || '',
        email: clientDoc?.email || '',
        phone: clientDoc?.phone || '',
        address: clientDoc?.address ? `${clientDoc.address.street || ''} ${clientDoc.address.city || ''}` : '',
      },
      notes,
      terms: terms || 'Payment due within 15 days of issue',
      createdBy: req.user?._id,
      issuedBy: req.user?._id,
    });

    await invoice.save();

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'create',
      entityType: 'Invoice',
      entityId: invoice._id,
      referenceNumber: invoice.invoiceNumber,
      description: `Created invoice ${invoice.invoiceNumber} for ₹${invoice.total} (Status: ${invoice.workflowStatus})`,
      changes: invoice.toObject(),
    });

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateInvoiceWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { workflowStatus, voidReason } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const oldStatus = invoice.workflowStatus;

    if (workflowStatus === 'void') {
      invoice.workflowStatus = 'void';
      invoice.status = 'void';
      invoice.voidReason = voidReason || 'Voided by user';
      invoice.voidedAt = new Date();
      invoice.voidedBy = req.user?._id;
    } else if (workflowStatus === 'issued') {
      invoice.workflowStatus = 'issued';
      if (invoice.balanceAmount === 0 && invoice.total > 0) {
        invoice.status = 'paid';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partially_paid';
      } else {
        invoice.status = 'unpaid';
      }
    } else if (workflowStatus === 'under_review') {
      invoice.workflowStatus = 'under_review';
    } else if (workflowStatus === 'draft') {
      invoice.workflowStatus = 'draft';
      invoice.status = 'draft';
    }

    await invoice.save();

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: workflowStatus === 'void' ? 'void' : 'update',
      entityType: 'Invoice',
      entityId: invoice._id,
      referenceNumber: invoice.invoiceNumber,
      description: `Updated invoice ${invoice.invoiceNumber} workflow from ${oldStatus} to ${workflowStatus}`,
      changes: { oldStatus, newStatus: workflowStatus, voidReason },
    });

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateMonthlyRetainerInvoices = async (req, res) => {
  try {
    const { servicePeriod, issueDate, dueDate } = req.body;
    if (!servicePeriod) {
      return res.status(400).json({ success: false, message: 'Service period is required (e.g. October 2026)' });
    }

    const activeClients = await Client.find({
      status: 'active',
      monthlyPlanFee: { $gt: 0 },
    });

    const createdInvoices = [];
    const skippedClients = [];

    for (const c of activeClients) {
      // Check for duplicate retainer
      const existing = await Invoice.findOne({
        client: c._id,
        servicePeriod,
        isRetainer: true,
        workflowStatus: { $ne: 'void' },
      });

      if (existing) {
        skippedClients.push({ clientName: c.company || c.name, reason: 'Already has retainer invoice' });
        continue;
      }

      const inv = new Invoice({
        client: c._id,
        clientId: c._id,
        invoiceDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
        servicePeriod,
        isRetainer: true,
        workflowStatus: 'issued', // Issued creates receivable
        status: 'unpaid',
        taxType: 'exclusive',
        taxRate: 18,
        lineItems: [
          {
            serviceName: c.servicePlan || 'Monthly Marketing Retainer',
            description: `${c.servicePlan || 'Retainer Services'} (${c.deliverables || 'Monthly deliverables'}) for ${servicePeriod}`,
            quantity: 1,
            rate: c.monthlyPlanFee,
            unitPrice: c.monthlyPlanFee,
            amount: c.monthlyPlanFee,
            itemType: 'service',
          },
        ],
        clientDetails: {
          name: c.name || '',
          businessName: c.company || c.name || '',
          email: c.email || '',
          phone: c.phone || '',
        },
        createdBy: req.user?._id,
      });

      await inv.save();
      createdInvoices.push(inv);
    }

    res.json({
      success: true,
      message: `Generated ${createdInvoices.length} retainer invoices. ${skippedClients.length} skipped.`,
      createdCount: createdInvoices.length,
      skippedCount: skippedClients.length,
      invoices: createdInvoices,
      skipped: skippedClients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateModuleInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { dueDate, notes, terms, status, workflowStatus, clientDetails } = req.body;
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (status) invoice.status = status;
    if (workflowStatus) invoice.workflowStatus = workflowStatus;
    if (clientDetails) invoice.clientDetails = { ...invoice.clientDetails, ...clientDetails };

    await invoice.save();
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteModuleInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await Payment.deleteMany({ invoice: invoice._id });
    await invoice.deleteOne();

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 4. CLIENT PAYMENT RECEIPTS
// =============================================

export const recordClientPaymentReceipt = async (req, res) => {
  try {
    const {
      client,
      invoice,
      amount,
      receivedDate,
      paymentMode = 'Bank',
      destinationAccount,
      reference,
      notes,
      proofUrl,
    } = req.body;

    // 1. Amount validation: must be finite and > 0
    const receiptAmount = Number(amount);
    if (!Number.isFinite(receiptAmount) || receiptAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Receipt amount must be a finite positive number' });
    }

    // 2. Client validation
    if (!client || !mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({ success: false, message: 'Valid client ID is required' });
    }
    const clientDoc = await Client.findById(client);
    if (!clientDoc) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // 3. Date & Period Lock validation
    const paymentDate = receivedDate ? new Date(receivedDate) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid payment date provided' });
    }
    await assertPeriodNotLocked(paymentDate);

    // 4. Destination Account validation
    let destAccountDoc = null;
    if (destinationAccount) {
      if (!mongoose.Types.ObjectId.isValid(destinationAccount)) {
        return res.status(400).json({ success: false, message: 'Invalid destination account ID' });
      }
      destAccountDoc = await FinanceAccount.findById(destinationAccount);
      if (!destAccountDoc || !destAccountDoc.isActive) {
        return res.status(400).json({ success: false, message: 'Destination account is not active or not found' });
      }
    }

    // 5. Target Invoice validation & ownership check
    let targetInvoice = null;
    if (invoice) {
      if (!mongoose.Types.ObjectId.isValid(invoice)) {
        return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
      }
      targetInvoice = await Invoice.findById(invoice);
      if (!targetInvoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      if (targetInvoice.client?.toString() !== client.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Invoice does not belong to the specified client',
        });
      }
      if (['void', 'draft'].includes(targetInvoice.status) || targetInvoice.workflowStatus === 'void') {
        return res.status(400).json({
          success: false,
          message: 'Cannot record payment for void or draft invoices',
        });
      }
    }

    // 6. Idempotency Key deduplication
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    const requestHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          client,
          invoice,
          amount: receiptAmount,
          receivedDate: paymentDate.toISOString(),
          destinationAccount,
        })
      )
      .digest('hex');

    if (idempotencyKey) {
      const existingKeyRecord = await IdempotencyKey.findOne({
        scope: 'payment-receipt',
        key: idempotencyKey,
      });
      if (existingKeyRecord) {
        if (existingKeyRecord.requestHash !== requestHash) {
          return res.status(409).json({
            success: false,
            message: 'Idempotency key reused with mismatched request payload',
          });
        }
        return res.status(existingKeyRecord.responseStatus || 200).json(existingKeyRecord.responseBody);
      }
    }

    // 7. Atomic Multi-Document Transaction
    const txnResult = await runInTransaction(async (session) => {
      let unappliedCredit = 0;
      let updatedInvoice = null;

      if (invoice) {
        const invQuery = Invoice.findById(invoice);
        if (session) invQuery.session(session);
        updatedInvoice = await invQuery;

        const currentBalance = Number(updatedInvoice.balanceAmount || 0);

        if (receiptAmount > currentBalance) {
          unappliedCredit = receiptAmount - currentBalance;
          updatedInvoice.paidAmount = (updatedInvoice.paidAmount || 0) + currentBalance;
          updatedInvoice.balanceAmount = 0;
          updatedInvoice.status = 'paid';
        } else {
          updatedInvoice.paidAmount = (updatedInvoice.paidAmount || 0) + receiptAmount;
          updatedInvoice.balanceAmount = Math.max(0, currentBalance - receiptAmount);
          updatedInvoice.status = updatedInvoice.balanceAmount === 0 ? 'paid' : 'partially_paid';
        }

        updatedInvoice.payments = updatedInvoice.payments || [];
        updatedInvoice.payments.push({
          amount: receiptAmount - unappliedCredit,
          method: paymentMode,
          reference: reference || '',
          paidAt: paymentDate,
          notes: notes || '',
        });

        await updatedInvoice.save({ session });
      } else {
        unappliedCredit = receiptAmount;
      }

      // Record Payment document
      const paymentData = {
        invoice: invoice || null,
        client,
        amount: receiptAmount,
        unappliedCredit,
        paymentMode,
        method: paymentMode,
        destinationAccount: destinationAccount || null,
        reference: reference || '',
        proofUrl: proofUrl || '',
        receivedDate: paymentDate,
        paidAt: paymentDate,
        status: 'paid',
        notes,
        recordedBy: req.user?._id,
      };

      let newPayment;
      if (session) {
        const created = await Payment.create([paymentData], { session });
        newPayment = created[0];
      } else {
        newPayment = await Payment.create(paymentData);
      }

      // Reconcile account balance inside transaction
      if (destinationAccount) {
        await reconcileAccountBalance(destinationAccount, { session, persist: true });
      }

      // Record financial audit inside transaction
      await recordFinanceAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'pay',
        entityType: 'Payment',
        entityId: newPayment._id,
        referenceNumber: reference || newPayment._id.toString(),
        description: `Recorded client receipt of ₹${receiptAmount} (${paymentMode}) for ${
          updatedInvoice ? updatedInvoice.invoiceNumber : 'Client Advance'
        }`,
        changes: newPayment.toObject ? newPayment.toObject() : newPayment,
        session,
      });

      return {
        payment: newPayment,
        invoice: updatedInvoice,
        unappliedCredit,
      };
    });

    const responsePayload = {
      success: true,
      payment: txnResult.payment,
      invoice: txnResult.invoice,
      unappliedCredit: txnResult.unappliedCredit,
    };

    // 8. Persist Idempotency record post-commit
    if (idempotencyKey) {
      try {
        await IdempotencyKey.create({
          scope: 'payment-receipt',
          key: idempotencyKey,
          userId: req.user?._id,
          requestHash,
          responseStatus: 201,
          responseBody: responsePayload,
          status: 'completed',
        });
      } catch (err) {
        // Ignore duplicate key collision
      }
    }

    // 9. Emit scoped real-time events outside the transaction callback
    emitLiveEvent(
      'financeUpdated',
      { id: txnResult.payment._id },
      {
        brandId: txnResult.invoice?.brandId || req.headers['x-workspace-id'],
      }
    );

    res.status(201).json(responsePayload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getPaymentReceipts = async (req, res) => {
  try {
    const { client, invoice, startDate, endDate } = req.query;
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const filter = { status: 'paid' };
    if (client) filter.client = client;
    if (invoice) filter.invoice = invoice;
    if (startDate || endDate) {
      filter.receivedDate = {};
      if (startDate) filter.receivedDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.receivedDate.$lte = end;
      }
    }

    const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1;
    const findQuery = Payment.find(filter)
      .populate('client', 'name company email phone')
      .populate('invoice', 'invoiceNumber total balanceAmount servicePeriod')
      .populate('destinationAccount', 'accountName accountType bankName')
      .populate('recordedBy', 'name')
      .sort({ receivedDate: sortDirection, paidAt: sortDirection })
      .lean();

    if (isPaginated) {
      findQuery.skip(skip).limit(limit);
    }

    const [total, receipts] = await Promise.all([
      Payment.countDocuments(filter),
      findQuery,
    ]);

    res.json({
      success: true,
      total,
      ...(isPaginated ? { page, pages: Math.ceil(total / limit) } : {}),
      receipts,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updatePaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment receipt not found' });

    const { receivedDate, paymentMode, reference, notes, proofUrl } = req.body;
    if (receivedDate) {
      payment.receivedDate = new Date(receivedDate);
      payment.paidAt = new Date(receivedDate);
    }
    if (paymentMode) {
      payment.paymentMode = paymentMode;
      payment.method = paymentMode;
    }
    if (reference !== undefined) payment.reference = reference;
    if (notes !== undefined) payment.notes = notes;
    if (proofUrl !== undefined) payment.proofUrl = proofUrl;

    await payment.save();
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment receipt not found' });

    // Restore invoice balance if payment was linked to an invoice
    if (payment.invoice) {
      const inv = await Invoice.findById(payment.invoice);
      if (inv) {
        const appliedAmt = Number(payment.amount || 0) - Number(payment.unappliedCredit || 0);
        inv.paidAmount = Math.max(0, Number(inv.paidAmount || 0) - appliedAmt);
        inv.balanceAmount = Math.min(Number(inv.total || 0), Number(inv.balanceAmount || 0) + appliedAmt);
        if (inv.paidAmount === 0) {
          inv.status = 'unpaid';
        } else {
          inv.status = 'partially_paid';
        }
        if (Array.isArray(inv.payments)) {
          inv.payments = inv.payments.filter(
            (p) => p._id?.toString() !== payment._id?.toString() && p.reference !== payment.reference
          );
        }
        await inv.save();
      }
    }

    const destinationAccount = payment.destinationAccount;
    await payment.deleteOne();

    if (destinationAccount) {
      await reconcileAccountBalance(destinationAccount);
    }

    res.json({ success: true, message: 'Payment receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 5. EXPENSES & VENDOR BILLS
// =============================================

export const getModuleExpenses = async (req, res) => {
  try {
    const { category, costType, paymentStatus, approvalStatus, startDate, endDate, search } = req.query;
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const filter = {};

    if (category && category !== 'all') filter.category = category;
    if (costType && costType !== 'all') filter.costType = costType;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (approvalStatus && approvalStatus !== 'all') filter.approvalStatus = approvalStatus;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { vendor: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1;
    const findQuery = Expense.find(filter)
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('fundingAccount', 'accountName accountType')
      .populate('payments.fundingAccount', 'accountName accountType')
      .populate('payments.recordedBy', 'name email')
      .populate('submittedBy', 'name email role')
      .populate('approvedBy', 'name email')
      .sort({ date: sortDirection, createdAt: sortDirection })
      .lean();

    if (isPaginated) {
      findQuery.skip(skip).limit(limit);
    }

    const [total, rawExpenses] = await Promise.all([
      Expense.countDocuments(filter),
      findQuery,
    ]);

    const expenses = rawExpenses.map((e) => {
      const hasPayments = Array.isArray(e.payments) && e.payments.length > 0;
      const paidAmount = hasPayments
        ? e.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : (e.paymentStatus === 'paid' ? Number(e.amount || 0) : Number(e.paidAmount || 0));
      const balanceAmount = Math.max(0, Number(e.amount || 0) - paidAmount);
      let paymentStatus = e.paymentStatus;
      if (hasPayments) {
        paymentStatus = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');
      } else if (e.paymentStatus === 'paid') {
        paymentStatus = 'paid';
      } else {
        paymentStatus = 'unpaid';
      }
      return {
        ...e,
        paidAmount,
        balanceAmount,
        paymentStatus,
        payments: Array.isArray(e.payments) ? e.payments : [],
      };
    });

    res.json({
      success: true,
      total,
      ...(isPaginated ? { page, pages: Math.ceil(total / limit) } : {}),
      expenses,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const createModuleExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      category = 'office',
      subcategory = '',
      vendor = '',
      description = '',
      costType = 'agency_overhead',
      client,
      project,
      paymentStatus = 'paid', // 'paid' (immediate cash outflow) or 'unpaid' (vendor bill liability) or 'partially_paid'
      paymentMode = 'Bank',
      fundingAccount,
      paymentDate,
      date,
      taxTreatment = 'none',
      taxRate = 0,
      receiptUrl,
      notes,
      advanceAmount,
      reference,
    } = req.body;

    const expenseAmount = Number(amount);
    if (expenseAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be positive' });
    }

    const expenseDate = date ? new Date(date) : new Date();
    await assertPeriodNotLocked(expenseDate);

    // If paid immediately, preserve actual payment date
    const actualPayDate = paymentStatus === 'paid' || paymentStatus === 'partially_paid'
      ? (paymentDate ? new Date(paymentDate) : expenseDate)
      : null;

    const initialPayments = [];
    let finalPaidAmount = 0;
    let finalStatus = paymentStatus;

    if (paymentStatus === 'paid') {
      finalPaidAmount = expenseAmount;
      initialPayments.push({
        amount: expenseAmount,
        paymentDate: actualPayDate || expenseDate,
        paymentMode,
        reference: reference || 'Initial Payment',
        notes: notes || 'Paid upon recording',
        fundingAccount: fundingAccount || null,
        recordedBy: req.user?._id,
      });
    } else if (paymentStatus === 'partially_paid') {
      const adv = Number(advanceAmount || req.body.paidAmount || 0);
      finalPaidAmount = Math.min(expenseAmount, Math.max(0, adv));
      if (finalPaidAmount >= expenseAmount) {
        finalStatus = 'paid';
      } else if (finalPaidAmount === 0) {
        finalStatus = 'unpaid';
      } else {
        finalStatus = 'partially_paid';
      }

      if (finalPaidAmount > 0) {
        initialPayments.push({
          amount: finalPaidAmount,
          paymentDate: actualPayDate || expenseDate,
          paymentMode,
          reference: reference || 'Advance Payment',
          notes: notes || 'Initial partial payment',
          fundingAccount: fundingAccount || null,
          recordedBy: req.user?._id,
        });
      }
    }

    const finalBalanceAmount = Math.max(0, expenseAmount - finalPaidAmount);

    const expense = await Expense.create({
      title,
      description,
      amount: expenseAmount,
      paidAmount: finalPaidAmount,
      balanceAmount: finalBalanceAmount,
      payments: initialPayments,
      category,
      subcategory,
      vendor,
      costType,
      client: client || null,
      project: project || null,
      taxTreatment,
      taxRate: Number(taxRate || 0),
      taxAmount: taxTreatment === 'exclusive' ? (expenseAmount * Number(taxRate || 0)) / 100 : 0,
      paymentStatus: finalStatus,
      paymentMode,
      fundingAccount: fundingAccount || null,
      paymentDate: actualPayDate,
      date: expenseDate,
      receiptUrl: receiptUrl || '',
      notes: notes || '',
      submittedBy: req.user?._id,
      approvedBy: req.user?._id,
      approvalStatus: 'approved',
      status: 'approved',
    });

    // If immediately paid or partially paid from a funding account, reconcile that account's balance
    if (finalPaidAmount > 0 && fundingAccount) {
      await reconcileAccountBalance(fundingAccount);
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'create',
      entityType: 'Expense',
      entityId: expense._id,
      description: `Created ${paymentStatus === 'paid' ? 'paid expense' : 'unpaid vendor bill'}: ${title} for ₹${expenseAmount} (${category})`,
      changes: expense.toObject(),
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const payVendorBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { fundingAccount, paymentMode = 'Bank', paymentDate = new Date(), amount, reference, notes } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense bill not found' });

    if (expense.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This bill has already been fully paid' });
    }

    await assertPeriodNotLocked(paymentDate);

    const currentPaid = Array.isArray(expense.payments) && expense.payments.length > 0
      ? expense.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      : (expense.paymentStatus === 'paid' ? Number(expense.amount || 0) : Number(expense.paidAmount || 0));
    const currentBalance = Math.max(0, Number(expense.amount || 0) - currentPaid);

    const payAmount = amount != null && Number(amount) > 0 ? Math.min(Number(amount), currentBalance) : currentBalance;

    if (!Array.isArray(expense.payments)) {
      expense.payments = [];
    }

    expense.payments.push({
      amount: payAmount,
      paymentDate: new Date(paymentDate),
      paymentMode,
      reference: reference || 'Bill Settlement',
      notes: notes || '',
      fundingAccount: fundingAccount || null,
      recordedBy: req.user?._id,
    });

    const newTotalPaid = expense.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    expense.paidAmount = newTotalPaid;
    expense.balanceAmount = Math.max(0, Number(expense.amount || 0) - newTotalPaid);
    expense.paymentStatus = expense.balanceAmount === 0 ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : 'unpaid');
    expense.paymentDate = new Date(paymentDate);
    expense.paymentMode = paymentMode;
    if (fundingAccount) expense.fundingAccount = fundingAccount;
    await expense.save();

    if (expense.fundingAccount) {
      await reconcileAccountBalance(expense.fundingAccount);
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'pay',
      entityType: 'Expense',
      entityId: expense._id,
      description: `Paid ₹${payAmount} on vendor bill: ${expense.title} via ${paymentMode}`,
      changes: expense.toObject(),
    });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const addExpensePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode = 'Bank', paymentDate = new Date(), reference = '', notes = '', fundingAccount } = req.body;

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a finite positive number' });
    }

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const payDate = new Date(paymentDate);
    if (isNaN(payDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid payment date' });
    }
    await assertPeriodNotLocked(payDate);

    const targetAccount = fundingAccount || expense.fundingAccount;

    const updatedExpense = await runInTransaction(async (session) => {
      const expQuery = Expense.findById(id);
      if (session) expQuery.session(session);
      const exp = await expQuery;

      if (!Array.isArray(exp.payments)) {
        exp.payments = [];
      }

      // If migrating legacy paid expense without payments items
      if (exp.payments.length === 0 && exp.paymentStatus === 'paid' && (exp.paidAmount > 0 || exp.amount > 0)) {
        exp.payments.push({
          amount: Number(exp.paidAmount || exp.amount),
          paymentDate: exp.paymentDate || exp.date || new Date(),
          paymentMode: exp.paymentMode || 'Bank',
          reference: 'Initial Payment',
          notes: 'Legacy full payment',
          fundingAccount: exp.fundingAccount || null,
          recordedBy: exp.submittedBy,
          createdAt: exp.paymentDate || exp.createdAt || new Date(),
        });
      }

      exp.payments.push({
        amount: paymentAmount,
        paymentDate: payDate,
        paymentMode,
        reference,
        notes,
        fundingAccount: targetAccount || null,
        recordedBy: req.user?._id,
        createdAt: new Date(),
      });

      const totalPaid = exp.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      exp.paidAmount = totalPaid;
      exp.balanceAmount = Math.max(0, Number(exp.amount || 0) - totalPaid);
      exp.paymentStatus = exp.balanceAmount === 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
      exp.paymentDate = payDate;
      exp.paymentMode = paymentMode;

      await exp.save({ session });

      if (targetAccount) {
        await reconcileAccountBalance(targetAccount, { session, persist: true });
      }

      await recordFinanceAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'add_payment',
        entityType: 'Expense',
        entityId: exp._id,
        description: `Added payment of ₹${paymentAmount} to ${exp.title} via ${paymentMode}`,
        changes: exp.toObject ? exp.toObject() : exp,
        session,
      });

      return exp;
    });

    emitLiveEvent('financeUpdated', { id: updatedExpense._id });

    res.json({ success: true, expense: updatedExpense });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteExpensePayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    if (!Array.isArray(expense.payments)) {
      return res.status(404).json({ success: false, message: 'No payments found on this expense' });
    }

    const targetPayment = expense.payments.find((p) => String(p._id) === String(paymentId));
    if (!targetPayment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Check period lock on the payment being removed
    await assertPeriodNotLocked(targetPayment.paymentDate || expense.date);

    const affectedAccount = targetPayment.fundingAccount || expense.fundingAccount;

    const updatedExpense = await runInTransaction(async (session) => {
      const expQuery = Expense.findById(id);
      if (session) expQuery.session(session);
      const exp = await expQuery;

      exp.payments = exp.payments.filter((p) => String(p._id) !== String(paymentId));

      const totalPaid = exp.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      exp.paidAmount = totalPaid;
      exp.balanceAmount = Math.max(0, Number(exp.amount || 0) - totalPaid);
      exp.paymentStatus = exp.balanceAmount === 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

      await exp.save({ session });

      if (affectedAccount) {
        await reconcileAccountBalance(affectedAccount, { session, persist: true });
      }

      await recordFinanceAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'delete_payment',
        entityType: 'Expense',
        entityId: exp._id,
        description: `Removed payment of ₹${targetPayment.amount} from expense: ${exp.title}`,
        changes: { removedPayment: targetPayment, remainingPaidAmount: exp.paidAmount },
        session,
      });

      return exp;
    });

    emitLiveEvent('financeUpdated', { id: updatedExpense._id });

    res.json({ success: true, expense: updatedExpense });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateModuleExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const oldFundingAccount = expense.fundingAccount;
    const oldPaymentStatus = expense.paymentStatus;

    const {
      title,
      amount,
      category,
      subcategory,
      vendor,
      description,
      costType,
      paymentStatus,
      paymentMode,
      fundingAccount,
      date,
      paymentDate,
      notes,
    } = req.body;

    if (title !== undefined) expense.title = title;
    if (amount !== undefined && Number(amount) > 0) expense.amount = Number(amount);
    if (category !== undefined) expense.category = category;
    if (subcategory !== undefined) expense.subcategory = subcategory;
    if (vendor !== undefined) expense.vendor = vendor;
    if (description !== undefined) expense.description = description;
    if (costType !== undefined) expense.costType = costType;
    if (paymentStatus !== undefined) expense.paymentStatus = paymentStatus;
    if (paymentMode !== undefined) expense.paymentMode = paymentMode;
    if (fundingAccount !== undefined) expense.fundingAccount = fundingAccount || null;
    if (date) expense.date = new Date(date);
    if (paymentDate) expense.paymentDate = new Date(paymentDate);
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    // Reconcile if paid and fundingAccount changed or amount changed
    if (expense.fundingAccount && expense.paymentStatus === 'paid') {
      await reconcileAccountBalance(expense.fundingAccount);
    }
    if (
      oldFundingAccount &&
      oldFundingAccount.toString() !== expense.fundingAccount?.toString() &&
      oldPaymentStatus === 'paid'
    ) {
      await reconcileAccountBalance(oldFundingAccount);
    }

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteModuleExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const fundingAccount = expense.fundingAccount;
    const wasPaid = expense.paymentStatus === 'paid';

    await expense.deleteOne();

    if (fundingAccount && wasPaid) {
      await reconcileAccountBalance(fundingAccount);
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 6. RECURRING SUBSCRIPTIONS
// =============================================

export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('paymentAccount', 'accountName accountType')
      .populate('assignedClient', 'name company')
      .sort({ nextRenewalDate: 1 })
      .lean();

    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const {
      serviceName,
      vendor,
      frequency = 'monthly',
      expectedAmount,
      nextRenewalDate,
      paymentAccount,
      costClassification = 'software',
      allocationRule = 'overhead',
      assignedClient,
      reminderLeadDays = 5,
      notes,
    } = req.body;

    const subscription = await Subscription.create({
      serviceName,
      vendor,
      frequency,
      expectedAmount: Number(expectedAmount),
      nextRenewalDate: new Date(nextRenewalDate),
      paymentAccount: paymentAccount || null,
      costClassification,
      allocationRule,
      assignedClient: assignedClient || null,
      reminderLeadDays: Number(reminderLeadDays || 5),
      notes: notes || '',
      createdBy: req.user?._id,
    });

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'create',
      entityType: 'Subscription',
      entityId: subscription._id,
      description: `Created subscription schedule: ${serviceName} (₹${expectedAmount}/${frequency})`,
      changes: subscription.toObject(),
    });

    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const postSubscriptionRenewal = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualAmount, paymentDate = new Date(), fundingAccount } = req.body;

    const sub = await Subscription.findById(id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await assertPeriodNotLocked(paymentDate);

    const chargeAmount = Number(actualAmount || sub.expectedAmount);
    const accountToDebit = fundingAccount || sub.paymentAccount;

    // Create posted Expense linked to this subscription instance
    const expense = await Expense.create({
      title: `${sub.serviceName} Renewal`,
      description: `Subscription renewal for ${sub.serviceName} (${sub.frequency})`,
      amount: chargeAmount,
      category: sub.costClassification === 'tools' || sub.costClassification === 'software' ? 'tools' : 'office',
      vendor: sub.vendor || sub.serviceName,
      costType: sub.allocationRule === 'specific_client' ? 'client_project' : 'agency_overhead',
      client: sub.assignedClient || null,
      paymentStatus: 'paid',
      paymentMode: 'Bank',
      fundingAccount: accountToDebit || null,
      paymentDate: new Date(paymentDate),
      date: new Date(paymentDate),
      subscriptionId: sub._id,
      submittedBy: req.user?._id,
      approvedBy: req.user?._id,
      status: 'approved',
    });

    // Advance nextRenewalDate to next period
    const nextDate = new Date(sub.nextRenewalDate);
    if (sub.frequency === 'annual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    sub.nextRenewalDate = nextDate;
    sub.lastBilledDate = new Date(paymentDate);
    await sub.save();

    if (accountToDebit) {
      await reconcileAccountBalance(accountToDebit);
    }

    res.json({ success: true, expense, subscription: sub });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id);
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    Object.assign(subscription, req.body);
    if (req.body.nextRenewalDate) subscription.nextRenewalDate = new Date(req.body.nextRenewalDate);
    if (req.body.expectedAmount !== undefined) subscription.expectedAmount = Number(req.body.expectedAmount);

    await subscription.save();
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findByIdAndDelete(id);
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 7. PAYROLL INTEGRATION
// =============================================

export const getPayrollRecords = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all') filter.year = Number(year);

    const records = await SalaryRecord.find(filter)
      .populate('employee', 'name email department position salary')
      .populate('approvedBy', 'name')
      .populate('paymentAccount', 'accountName')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SalaryRecord.findById(id)
      .populate('employee', 'name email department position salary phone')
      .populate('approvedBy', 'name email')
      .populate('paymentAccount', 'accountName accountType')
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const calculateMonthlyPayroll = async (req, res) => {
  try {
    const { month, year = new Date().getFullYear(), workingDays = 26, dailyHours = 9 } = req.body;
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required (e.g. October 2026)' });
    }

    const expectedHoursTotal = Number(workingDays) * Number(dailyHours); // e.g. 26 * 9 = 234 hours
    const employees = await User.find({
      role: { $in: ['employee', 'editor', 'designer', 'manager', 'adsManager'] },
      employmentStatus: 'active',
      isActive: true,
    }).lean();

    const generated = [];
    const skipped = [];

    // Parse month date range for attendance aggregation
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    for (const emp of employees) {
      const existing = await SalaryRecord.findOne({
        employee: emp._id,
        month,
        year: Number(year),
      });

      if (existing) {
        skipped.push({ employeeName: emp.name, reason: 'Already exists' });
        continue;
      }

      // Aggregate approved attendance hours
      const attendances = await Attendance.find({
        user: emp._id,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['present', 'work_from_home', 'half_day'] },
      }).lean();

      let actualHours = attendances.reduce((sum, att) => sum + Number(att.totalHours || 0), 0);
      if (actualHours === 0 && attendances.length > 0) {
        // Fallback to daily standard if clock sessions were simple day checks
        actualHours = attendances.length * 9;
      }

      const shortfallHours = Math.max(0, expectedHoursTotal - actualHours);
      const overtimeHours = Math.max(0, actualHours - expectedHoursTotal);

      const baseSalary = Number(emp.salary || 30000);
      const hourlyRate = baseSalary / expectedHoursTotal;

      // Additions & Deductions
      const otsPay = Math.round(overtimeHours * hourlyRate * 1.25); // OTS bonus
      const shortfallDeduction = Math.round(shortfallHours * hourlyRate);

      const rec = new SalaryRecord({
        employee: emp._id,
        month,
        year: Number(year),
        baseSalary,
        expectedWorkingHours: expectedHoursTotal,
        actualApprovedHours: actualHours,
        shortfallHours,
        overtimeHours,
        ots: otsPay,
        deductions: shortfallDeduction,
        deductionReason: shortfallHours > 0 ? `${shortfallHours} shortfall hours` : '',
        status: 'pending',
      });

      await rec.save();
      generated.push(rec);
    }

    res.json({
      success: true,
      message: `Generated payroll for ${generated.length} employees. ${skipped.length} skipped.`,
      generated,
      skipped,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approvePayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SalaryRecord.findById(id).populate('employee', 'name email');
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    record.status = 'approved';
    record.approvedBy = req.user?._id;
    record.approvedAt = new Date();
    await record.save();

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'approve',
      entityType: 'SalaryRecord',
      entityId: record._id,
      description: `Approved payroll for ${record.employee?.name} (₹${record.netSalary}) for ${record.month}`,
      changes: record.toObject(),
    });

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payPayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentAccount, paymentMethod = 'Bank Transfer', paymentDate = new Date() } = req.body;

    const record = await SalaryRecord.findById(id).populate('employee', 'name');
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (record.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This payroll record is already paid' });
    }

    await assertPeriodNotLocked(paymentDate);

    record.status = 'paid';
    record.paidAmount = record.netSalary;
    record.paymentDate = new Date(paymentDate);
    record.paymentMethod = paymentMethod;
    if (paymentAccount) record.paymentAccount = paymentAccount;
    await record.save();

    // Outflow reduces account balance without creating a duplicate salary expense
    if (record.paymentAccount) {
      await reconcileAccountBalance(record.paymentAccount);
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'pay',
      entityType: 'SalaryRecord',
      entityId: record._id,
      description: `Paid salary of ₹${record.netSalary} to ${record.employee?.name} (${paymentMethod})`,
      changes: record.toObject(),
    });

    res.json({ success: true, record });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const createPayrollRecord = async (req, res) => {
  try {
    const {
      employee,
      month,
      year = new Date().getFullYear(),
      baseSalary,
      expectedWorkingHours = 234,
      actualApprovedHours = 234,
      shortfallHours = 0,
      overtimeHours = 0,
      ots = 0,
      additions = 0,
      additionReason = '',
      deductions = 0,
      deductionReason = '',
      netSalary,
      status = 'pending',
      paymentAccount,
      paymentMethod = 'Bank Transfer',
      notes = '',
    } = req.body;

    if (!employee || !month) {
      return res.status(400).json({ success: false, message: 'Employee and month are required' });
    }

    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].indexOf(month);
    const periodDate = new Date(Number(year), monthIndex >= 0 ? monthIndex : 0, 15);
    await assertPeriodNotLocked(periodDate);

    // Check if employee already has a record for this month & year
    const existing = await SalaryRecord.findOne({
      employee,
      month,
      year: Number(year),
    });

    const parsedBase = Number(baseSalary || 0);
    const parsedAdditions = Number(additions || ots || 0);
    const parsedDeductions = Number(deductions || 0);
    const computedNet = netSalary !== undefined && netSalary !== ''
      ? Number(netSalary)
      : Math.max(0, parsedBase + parsedAdditions - parsedDeductions);

    let record;
    if (existing) {
      existing.baseSalary = parsedBase;
      existing.expectedWorkingHours = Number(expectedWorkingHours);
      existing.actualApprovedHours = Number(actualApprovedHours);
      existing.shortfallHours = Number(shortfallHours);
      existing.overtimeHours = Number(overtimeHours);
      existing.ots = parsedAdditions;
      existing.deductions = parsedDeductions;
      existing.deductionReason = deductionReason || additionReason || existing.deductionReason;
      existing.netSalary = computedNet;
      if (notes) existing.notes = notes;
      if (status) existing.status = status;
      record = await existing.save();
    } else {
      record = new SalaryRecord({
        employee,
        month,
        year: Number(year),
        baseSalary: parsedBase,
        expectedWorkingHours: Number(expectedWorkingHours),
        actualApprovedHours: Number(actualApprovedHours),
        shortfallHours: Number(shortfallHours),
        overtimeHours: Number(overtimeHours),
        ots: parsedAdditions,
        deductions: parsedDeductions,
        deductionReason: deductionReason || additionReason || '',
        netSalary: computedNet,
        status: status || 'pending',
        paymentAccount: paymentAccount || undefined,
        paymentMethod: paymentMethod || 'Bank Transfer',
        notes: notes || '',
      });
      await record.save();
    }

    if (record.status === 'paid' && record.paymentAccount) {
      await reconcileAccountBalance(record.paymentAccount);
    }

    await record.populate('employee', 'name email department position salary');
    if (record.paymentAccount) {
      await record.populate('paymentAccount', 'accountName');
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: existing ? 'update' : 'create',
      entityType: 'SalaryRecord',
      entityId: record._id,
      description: `Manual payroll entry for ${record.employee?.name || 'Employee'}: Net ₹${record.netSalary} for ${record.month} ${record.year}`,
      changes: record.toObject(),
    });

    res.status(existing ? 200 : 201).json({ success: true, record });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updatePayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      baseSalary,
      additions,
      ots,
      additionReason,
      deductions,
      deductionReason,
      netSalary,
      status,
      expectedWorkingHours,
      actualApprovedHours,
      notes,
    } = req.body;

    const record = await SalaryRecord.findById(id).populate('employee', 'name email');
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].indexOf(record.month);
    const periodDate = new Date(record.year, monthIndex >= 0 ? monthIndex : 0, 15);
    await assertPeriodNotLocked(periodDate);

    if (baseSalary !== undefined) record.baseSalary = Number(baseSalary);
    if (additions !== undefined || ots !== undefined) record.ots = Number(additions ?? ots);
    if (deductions !== undefined) record.deductions = Number(deductions);
    if (deductionReason !== undefined) record.deductionReason = deductionReason;
    if (expectedWorkingHours !== undefined) record.expectedWorkingHours = Number(expectedWorkingHours);
    if (actualApprovedHours !== undefined) record.actualApprovedHours = Number(actualApprovedHours);
    if (notes !== undefined) record.notes = notes;
    if (status !== undefined) record.status = status;

    if (netSalary !== undefined) {
      record.netSalary = Number(netSalary);
    } else {
      record.netSalary = Math.max(0, record.baseSalary + (record.ots || 0) - (record.deductions || 0));
    }

    await record.save();

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'update',
      entityType: 'SalaryRecord',
      entityId: record._id,
      description: `Updated payroll for ${record.employee?.name} (${record.month} ${record.year}) to Net ₹${record.netSalary}`,
      changes: record.toObject(),
    });

    res.json({ success: true, record });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deletePayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SalaryRecord.findById(id).populate('employee', 'name');
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (record.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot delete an already disbursed payroll record. Revert payment first.' });
    }

    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].indexOf(record.month);
    const periodDate = new Date(record.year, monthIndex >= 0 ? monthIndex : 0, 15);
    await assertPeriodNotLocked(periodDate);

    await SalaryRecord.findByIdAndDelete(id);

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'delete',
      entityType: 'SalaryRecord',
      entityId: id,
      description: `Deleted payroll entry for ${record.employee?.name} (${record.month} ${record.year})`,
    });

    res.json({ success: true, message: 'Payroll record deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getEmployeesForPayroll = async (req, res) => {
  try {
    const employees = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    })
      .select('_id name email role department position salary phone')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 8. CLIENT COST ALLOCATION & PROFITABILITY
// =============================================

export const getClientProfitability = async (req, res) => {
  try {
    const { servicePeriod, clientId } = req.query;
    const report = await computeClientProfitabilityReport({ servicePeriod, clientId });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCostAllocation = async (req, res) => {
  try {
    const {
      client,
      servicePeriod,
      costType = 'direct',
      activityDeliverable,
      employee,
      quantityOrHours,
      costRate,
      allocatedAmount,
      sourceExpense,
      sourcePayroll,
      allocationRule = 'manual',
      notes,
    } = req.body;

    const amount = Number(allocatedAmount);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Allocated amount must be positive' });
    }
    if (!client || !servicePeriod || !activityDeliverable) {
      return res.status(400).json({ success: false, message: 'Client, service period, and activity are required' });
    }

    // Validation:
    // If allocated from a source Expense, ensure total allocated does not exceed the source amount
    if (sourceExpense) {
      const srcExp = await Expense.findById(sourceExpense);
      if (srcExp) {
        const existingAllocations = await CostAllocation.find({ sourceExpense });
        const alreadyAllocated = existingAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
        if (alreadyAllocated + amount > srcExp.amount) {
          return res.status(400).json({
            success: false,
            message: `Allocated amount (₹${amount}) plus existing allocations (₹${alreadyAllocated}) exceeds the source expense amount (₹${srcExp.amount}).`,
          });
        }
      }
    }

    const allocation = await CostAllocation.create({
      client,
      servicePeriod,
      costType,
      activityDeliverable,
      employee: employee || null,
      quantityOrHours: Number(quantityOrHours || 1),
      costRate: Number(costRate || 0),
      allocatedAmount: amount,
      sourceExpense: sourceExpense || null,
      sourcePayroll: sourcePayroll || null,
      allocationRule,
      notes: notes || '',
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, allocation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCostAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    await CostAllocation.findByIdAndDelete(id);
    res.json({ success: true, message: 'Allocation removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 9. FOUNDER ACCOUNTS
// =============================================

export const getFounderTransactions = async (req, res) => {
  try {
    const { founderName } = req.query;
    const filter = {};
    if (founderName && founderName !== 'all') filter.founderName = founderName;

    const transactions = await FounderTransaction.find(filter)
      .populate('account', 'accountName accountType')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .lean();

    // Calculate balances per founder:
    // Capital Balance = Capital Introduced - Drawings + Profit Allocation
    // Loan Balance = Loan to Company - Loan Repayments
    const founders = ['Dinesh M', 'Sathish Kumar'];
    const summary = {};

    founders.forEach((f) => {
      summary[f] = {
        founderName: f,
        capitalIntroduced: 0,
        drawings: 0,
        loanToCompany: 0,
        loanRepayments: 0,
        profitAllocations: 0,
        netCapitalBalance: 0,
        netLoanBalance: 0,
      };
    });

    const allTxns = await FounderTransaction.find().lean();
    allTxns.forEach((tx) => {
      const f = tx.founderName;
      if (!summary[f]) {
        summary[f] = {
          founderName: f,
          capitalIntroduced: 0,
          drawings: 0,
          loanToCompany: 0,
          loanRepayments: 0,
          profitAllocations: 0,
          netCapitalBalance: 0,
          netLoanBalance: 0,
        };
      }
      const amt = Number(tx.amount || 0);
      if (tx.transactionType === 'capital_introduced') summary[f].capitalIntroduced += amt;
      else if (tx.transactionType === 'drawings') summary[f].drawings += amt;
      else if (tx.transactionType === 'loan_to_company') summary[f].loanToCompany += amt;
      else if (tx.transactionType === 'loan_repayment') summary[f].loanRepayments += amt;
      else if (tx.transactionType === 'profit_allocation') summary[f].profitAllocations += amt;
    });

    Object.values(summary).forEach((f) => {
      f.netCapitalBalance = f.capitalIntroduced - f.drawings + f.profitAllocations;
      f.netLoanBalance = f.loanToCompany - f.loanRepayments;
    });

    res.json({
      success: true,
      transactions,
      foundersSummary: Object.values(summary),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFounderTransaction = async (req, res) => {
  try {
    const {
      founderName,
      date,
      transactionType,
      amount,
      account,
      paymentMode = 'Bank Transfer',
      reference,
      notes,
      proofUrl,
    } = req.body;

    const amt = Number(amount);
    if (amt <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }

    await assertPeriodNotLocked(date || new Date());

    // Determine direction of money movement
    let direction = 'inflow';
    if (transactionType === 'capital_introduced' || transactionType === 'loan_to_company') {
      direction = 'inflow'; // Money into company
    } else if (transactionType === 'drawings' || transactionType === 'loan_repayment' || transactionType === 'profit_distribution') {
      direction = 'outflow'; // Money out of company to founder
    } else if (transactionType === 'profit_allocation') {
      direction = 'none'; // Accounting allocation only, no cash movement
    }

    const tx = await FounderTransaction.create({
      founderName,
      date: date ? new Date(date) : new Date(),
      transactionType,
      direction,
      amount: amt,
      account: account || null,
      paymentMode: direction === 'none' ? 'Journal/None' : paymentMode,
      reference: reference || '',
      notes: notes || '',
      proofUrl: proofUrl || '',
      createdBy: req.user?._id,
    });

    // Reconcile linked bank/cash account if cash moved
    if (account && direction !== 'none') {
      await reconcileAccountBalance(account);
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'create',
      entityType: 'FounderTransaction',
      entityId: tx._id,
      description: `Founder ${transactionType} entry for ${founderName}: ₹${amt} (${direction})`,
      changes: tx.toObject(),
    });

    res.status(201).json({ success: true, transaction: tx });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// =============================================
// 10. FORECAST & REPORTS
// =============================================

export const getReceivablesAgingReport = async (req, res) => {
  try {
    const aging = await computeReceivablesAging();
    res.json({ success: true, ...aging });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCashForecastReport = async (req, res) => {
  try {
    const { scenario = 'expected' } = req.query;
    const forecast = await computeSixMonthCashForecast({ scenario });
    res.json({ success: true, ...forecast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyCashbookReport = async (req, res) => {
  try {
    const { startDate, endDate, accountId, sortOrder = 'desc' } = req.query;
    const matchRange = {};
    if (startDate || endDate) {
      if (startDate) matchRange.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchRange.$lte = end;
      }
    } else {
      // Default to current month
      const now = new Date();
      matchRange.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
      matchRange.$lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [payments, expenses, salaries, transfersIn, transfersOut, founderInflows, founderOutflows] = await Promise.all([
      Payment.find({ status: 'paid', receivedDate: matchRange, ...(accountId ? { destinationAccount: accountId } : {}) })
        .populate('client', 'name company')
        .populate('destinationAccount', 'accountName')
        .lean(),
      Expense.find({ paymentStatus: 'paid', date: matchRange, ...(accountId ? { fundingAccount: accountId } : {}) })
        .populate('vendor client', 'name company')
        .populate('fundingAccount', 'accountName')
        .lean(),
      SalaryRecord.find({ status: 'paid', createdAt: matchRange, ...(accountId ? { paymentAccount: accountId } : {}) })
        .populate('employee', 'name')
        .populate('paymentAccount', 'accountName')
        .lean(),
      InternalTransfer.find({ date: matchRange, ...(accountId ? { toAccount: accountId } : {}) })
        .populate('fromAccount toAccount', 'accountName')
        .lean(),
      InternalTransfer.find({ date: matchRange, ...(accountId ? { fromAccount: accountId } : {}) })
        .populate('fromAccount toAccount', 'accountName')
        .lean(),
      FounderTransaction.find({ direction: 'inflow', date: matchRange, ...(accountId ? { account: accountId } : {}) })
        .lean(),
      FounderTransaction.find({ direction: 'outflow', date: matchRange, ...(accountId ? { account: accountId } : {}) })
        .lean(),
    ]);

    // Build timeline items sorted by date
    const items = [];

    payments.forEach((p) => {
      items.push({
        date: p.receivedDate || p.createdAt,
        type: 'Inflow',
        category: 'Client Receipt',
        entity: p.client?.company || p.client?.name || 'Client',
        account: p.destinationAccount?.accountName || 'Bank',
        amount: Number(p.amount || 0),
        reference: p.reference || '',
      });
    });

    expenses.forEach((e) => {
      items.push({
        date: e.date || e.createdAt,
        type: 'Outflow',
        category: `Expense: ${e.category}`,
        entity: e.vendor || e.title,
        account: e.fundingAccount?.accountName || 'Bank',
        amount: Number(e.amount || 0),
        reference: e.title || '',
      });
    });

    salaries.forEach((s) => {
      items.push({
        date: s.paymentDate || s.createdAt,
        type: 'Outflow',
        category: 'Salary Payroll',
        entity: s.employee?.name || 'Employee',
        account: s.paymentAccount?.accountName || 'Bank',
        amount: Number(s.paidAmount || s.netSalary || 0),
        reference: `Salary for ${s.month}`,
      });
    });

    transfersIn.forEach((t) => {
      items.push({
        date: t.date,
        type: 'Inflow',
        category: 'Internal Transfer In',
        entity: `From ${t.fromAccount?.accountName}`,
        account: t.toAccount?.accountName || 'Bank',
        amount: Number(t.amount || 0),
        reference: t.reference || '',
      });
    });

    transfersOut.forEach((t) => {
      items.push({
        date: t.date,
        type: 'Outflow',
        category: 'Internal Transfer Out',
        entity: `To ${t.toAccount?.accountName}`,
        account: t.fromAccount?.accountName || 'Bank',
        amount: Number(t.amount || 0) + Number(t.bankFee || 0),
        reference: t.reference || '',
      });
    });

    founderInflows.forEach((f) => {
      items.push({
        date: f.date,
        type: 'Inflow',
        category: `Founder: ${f.transactionType}`,
        entity: f.founderName,
        account: 'Bank',
        amount: Number(f.amount || 0),
        reference: f.reference || '',
      });
    });

    founderOutflows.forEach((f) => {
      items.push({
        date: f.date,
        type: 'Outflow',
        category: `Founder: ${f.transactionType}`,
        entity: f.founderName,
        account: 'Bank',
        amount: Number(f.amount || 0),
        reference: f.reference || '',
      });
    });

    items.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const totalInflow = items.filter((i) => i.type === 'Inflow').reduce((sum, i) => sum + i.amount, 0);
    const totalOutflow = items.filter((i) => i.type === 'Outflow').reduce((sum, i) => sum + i.amount, 0);

    res.json({
      success: true,
      items,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyProfitAndLossReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const y = Number(year);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const monthlyPnl = [];

    for (let m = 0; m < 12; m++) {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

      // Invoices
      const invoices = await Invoice.find({
        status: { $nin: ['draft', 'void', 'cancelled'] },
        invoiceDate: { $gte: start, $lte: end },
      }).lean();

      let serviceRevenue = 0;
      let passThroughBudget = 0;
      invoices.forEach((inv) => {
        serviceRevenue += Number(inv.serviceRevenue ?? inv.subtotal ?? 0);
        passThroughBudget += Number(inv.passThroughAdBudget || 0);
      });

      // Operational Expenses
      const expenses = await Expense.find({
        approvalStatus: { $ne: 'rejected' },
        date: { $gte: start, $lte: end },
      }).lean();

      let directCosts = 0;
      let overheadCosts = 0;
      expenses.forEach((e) => {
        const amt = Number(e.amount || 0);
        if (e.costType === 'client_project') directCosts += amt;
        else overheadCosts += amt;
      });

      // Salaries
      const salaries = await SalaryRecord.find({
        status: { $in: ['approved', 'paid'] },
        createdAt: { $gte: start, $lte: end },
      }).lean();

      const salaryCosts = salaries.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
      const totalOverhead = overheadCosts + salaryCosts;
      const totalCosts = directCosts + totalOverhead;
      const netProfit = serviceRevenue - totalCosts;

      monthlyPnl.push({
        monthIndex: m + 1,
        monthName: monthNames[m],
        serviceRevenue,
        passThroughBudget,
        directCosts,
        grossContribution: serviceRevenue - directCosts,
        overheadCosts: totalOverhead,
        salaryExpenses: salaryCosts,
        otherOverhead: overheadCosts,
        totalCosts,
        netProfit,
        marginPercent: serviceRevenue > 0 ? Number(((netProfit / serviceRevenue) * 100).toFixed(1)) : null,
      });
    }

    const totalServiceRevenue = monthlyPnl.reduce((sum, m) => sum + m.serviceRevenue, 0);
    const totalCostsAll = monthlyPnl.reduce((sum, m) => sum + m.totalCosts, 0);
    const totalNetProfit = totalServiceRevenue - totalCostsAll;

    res.json({
      success: true,
      year: y,
      totalServiceRevenue,
      totalCosts: totalCostsAll,
      totalNetProfit,
      annualMargin: totalServiceRevenue > 0 ? Number(((totalNetProfit / totalServiceRevenue) * 100).toFixed(1)) : null,
      monthlyBreakdown: monthlyPnl,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 11. PERIOD CLOSE & SETTINGS
// =============================================

export const getPeriodLocks = async (req, res) => {
  try {
    const locks = await PeriodLock.find().sort({ period: -1 }).lean();
    res.json({ success: true, locks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePeriodLock = async (req, res) => {
  try {
    const { period, isLocked, reason } = req.body;
    if (!period) return res.status(400).json({ success: false, message: 'Period string required (YYYY-MM)' });

    const [y, m] = period.split('-');
    let lock = await PeriodLock.findOne({ period });

    if (!lock) {
      lock = new PeriodLock({
        period,
        year: Number(y),
        month: m,
      });
    }

    if (isLocked) {
      lock.isLocked = true;
      lock.lockedAt = new Date();
      lock.lockedBy = req.user?._id;
    } else {
      lock.isLocked = false;
      lock.reopenedAt = new Date();
      lock.reopenedBy = req.user?._id;
      lock.reopenReason = reason || 'Reopened by Admin';
    }

    await lock.save();

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: isLocked ? 'period_lock' : 'period_unlock',
      entityType: 'PeriodLock',
      entityId: lock._id,
      referenceNumber: period,
      description: `${isLocked ? 'Locked' : 'Reopened'} accounting period ${period}`,
      changes: { period, isLocked, reason },
    });

    res.json({ success: true, lock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceAuditLogs = async (req, res) => {
  try {
    const logs = await FinanceAuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceBudgets = async (req, res) => {
  try {
    const budgets = await FinanceBudget.find().sort({ year: -1, month: -1 }).lean();
    res.json({ success: true, budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setFinanceBudget = async (req, res) => {
  try {
    const { category, month, year, monthlyBudget, thresholdPercentage } = req.body;
    const filter = { category, month, year: Number(year) };
    const update = {
      monthlyBudget: Number(monthlyBudget),
      thresholdPercentage: Number(thresholdPercentage || 80),
      createdBy: req.user?._id,
    };

    const budget = await FinanceBudget.findOneAndUpdate(filter, update, { upsert: true, new: true });
    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
