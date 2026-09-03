// =============================================
// PORTAL CONTROLLER - Client Portal API
// =============================================

import Client from '../models/client.model.js';
import ContentItem from '../models/contentItem.model.js';
import ReportingEntry from '../models/reportingEntry.model.js';
import Task from '../models/task.model.js';
import Invoice from '../models/invoice.model.js';
import Project from '../models/project.model.js';
import Finance from '../models/finance.model.js';
import PaymentNote from '../models/paymentNote.model.js';
import Payment from '../models/payment.model.js';
import Referral from '../models/referral.model.js';
import CallHistory from '../models/callHistory.model.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';
import Notification from '../models/notification.model.js';
import Campaign from '../models/smm/campaign.model.js';
import SmmAdSpend from '../models/smm/smmAdSpend.model.js';

// Helper: get client from logged-in user
const getClientFromUser = async (userId) => {
  const client = await Client.findOne({ userId }).populate('assignedManager', 'name email avatar');
  return client;
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getPortalDashboard = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req);
    
    const [
      totalContent,
      pendingApproval,
      approvedContent,
      doneContent,
      activeProjects,
      openInvoices,
      recentContent,
    ] = await Promise.all([
      ContentItem.countDocuments(scope),
      ContentItem.countDocuments({ ...scope, status: 'Send to Client', approved: false }),
      ContentItem.countDocuments({ ...scope, approved: true }),
      ContentItem.countDocuments({ ...scope, status: 'Done' }),
      Project.find({ ...scope, status: { $in: ['active', 'in_progress'] } }).select('name status progress dueDate startDate description category proposalText'),
      Invoice.find({ ...scope, status: { $in: ['sent', 'overdue'] } }).select('invoiceNumber total dueDate status').sort({ dueDate: 1 }).limit(5),
      ContentItem.find(scope).sort({ updatedAt: -1 }).limit(10).populate('assignedEditor', 'name avatar'),
    ]);

    // Status breakdown for chart
    const statusBreakdown = await ContentItem.aggregate([
      { $match: scope },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Client Ad Budget: Monthly Budget, Daily Budget, Amount Added, Balance, and Notes
    let adBudget = { monthlyBudget: 0, dailyBudget: 0, amountAdded: 0, balance: 0, notes: '', campaignCount: 0 };
    try {
      const client = await getClientFromUser(req.user._id);
      if (client) {
        const clientCampaigns = await Campaign.find({ client: client._id });
        const mBudget = clientCampaigns.reduce((sum, c) => sum + (c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.amountAdded || 0), 0);
        const dBudget = clientCampaigns.reduce((sum, c) => sum + (c.dailyBudget || 0), 0);
        const added = clientCampaigns.reduce((sum, c) => sum + (c.amountAdded || 0), 0);
        const spent = clientCampaigns.reduce((sum, c) => sum + (c.amountSpent || 0), 0);
        const bal = Math.max(0, added - spent);
        const latestSpendLog = await SmmAdSpend.findOne({ client: client._id }).sort({ date: -1 });
        adBudget = {
          monthlyBudget: mBudget,
          dailyBudget: dBudget,
          amountAdded: added,
          amountSpent: spent,
          balance: bal,
          notes: latestSpendLog?.notes || clientCampaigns[0]?.internalNotes || 'Budget on track',
          campaignCount: clientCampaigns.length,
        };
      }
    } catch (e) {
      console.error('Error fetching client adBudget for portal dashboard:', e);
    }

    res.json({
      success: true,
      stats: {
        totalContent,
        pendingApproval,
        approvedContent,
        doneContent,
        activeProjects: activeProjects.length,
        openInvoices: openInvoices.length,
      },
      adBudget,
      activeProjects,
      openInvoices,
      recentContent,
      statusBreakdown,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CONTENT ITEMS ─────────────────────────────────────────────────────────────

export const getContentItems = async (req, res) => {
  try {
    const { status, view, search, platform, priority, page = 1, limit = 50 } = req.query;

    let filter = withWorkspaceScope(req);

    if (view === 'review') {
      filter.status = 'Send to Client';
      filter.approved = false;
    } else if (view === 'done') {
      filter.status = 'Done';
    } else if (status) {
      filter.status = status;
    }

    if (platform) filter.platform = platform;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { taskName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ContentItem.find(filter)
        .populate('assignedEditor', 'name avatar')
        .populate('approvedBy', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ContentItem.countDocuments(filter),
    ]);

    res.json({ success: true, items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContentItem = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });

    const item = await ContentItem.findOne(scope)
      .populate('assignedEditor', 'name avatar email')
      .populate('approvedBy', 'name');

    if (!item) return res.status(404).json({ success: false, message: 'Content item not found' });

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveContentItem = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    const item = await ContentItem.findOne(scope);
    if (!item) return res.status(404).json({ success: false, message: 'Content item not found' });

    item.approved = true;
    item.status = 'Approved';
    item.approvedBy = req.user._id;
    item.approvedAt = new Date();
    item.clientFeedback = req.body.feedback || '';
    await item.save();

    try {
      await Notification.create({
        user: item.assignedEditor,
        title: 'Content Approved',
        message: `"${item.taskName}" has been approved by the client.`,
        type: 'success',
        link: `/tasks`,
      });
    } catch (_) {}

    res.json({ success: true, item, message: 'Content approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestRevision = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    const item = await ContentItem.findOne(scope);
    if (!item) return res.status(404).json({ success: false, message: 'Content item not found' });

    item.status = 'Revision Requested';
    item.approved = false;
    item.clientFeedback = req.body.feedback || '';
    item.revisionCount = (item.revisionCount || 0) + 1;
    await item.save();

    try {
      await Notification.create({
        user: item.assignedEditor,
        title: 'Revision Requested',
        message: `"${item.taskName}" needs revision. Feedback: ${req.body.feedback || 'No feedback provided'}`,
        type: 'warning',
        link: `/tasks`,
      });
    } catch (_) {}

    res.json({ success: true, item, message: 'Revision requested successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addContentFeedback = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    const item = await ContentItem.findOne(scope);
    if (!item) return res.status(404).json({ success: false, message: 'Content item not found' });

    item.clientFeedback = req.body.feedback;
    await item.save();

    res.json({ success: true, item, message: 'Feedback added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REPORTING ─────────────────────────────────────────────────────────────────

export const getReportingData = async (req, res) => {
  try {
    const { year, clientId } = req.query;
    const targetYear = year || new Date().getFullYear().toString();
    
    const extraScope = {};
    if (req.user.role === 'client') {
      const client = await getClientFromUser(req.user._id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client profile not found' });
      }
      extraScope.client = client._id;
      extraScope.showToClient = true;
    } else if (clientId) {
      extraScope.client = clientId;
    }

    const scope = withWorkspaceScope(req, {
      month: { $regex: `^${targetYear}` },
      ...extraScope,
    });

    const entries = await ReportingEntry.find(scope).sort({ month: 1 });

    const totals = entries.reduce(
      (acc, e) => ({
        adSpend: acc.adSpend + e.adSpend,
        optIns: acc.optIns + e.optIns,
        callsBooked: acc.callsBooked + e.callsBooked,
        newClients: acc.newClients + e.newClients,
        cashCollected: acc.cashCollected + e.cashCollected,
        totalRevenue: acc.totalRevenue + e.totalRevenue,
      }),
      { adSpend: 0, optIns: 0, callsBooked: 0, newClients: 0, cashCollected: 0, totalRevenue: 0 }
    );

    const latest = entries[entries.length - 1];
    const previous = entries[entries.length - 2];
    let growth = {};
    if (latest && previous) {
      const calc = (curr, prev) => prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : 0;
      growth = {
        adSpend: calc(latest.adSpend, previous.adSpend),
        optIns: calc(latest.optIns, previous.optIns),
        callsBooked: calc(latest.callsBooked, previous.callsBooked),
        newClients: calc(latest.newClients, previous.newClients),
        cashCollected: calc(latest.cashCollected, previous.cashCollected),
        totalRevenue: calc(latest.totalRevenue, previous.totalRevenue),
      };
    }

    res.json({ success: true, entries, totals, growth, latestMonth: latest || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Manage Content Items ─────────────────────────────────────────────

export const createContentItem = async (req, res) => {
  try {
    const item = await ContentItem.create({
      ...req.body,
      assignedEditor: req.user._id,
      approved: false,
    });

    const populated = await item.populate('assignedEditor', 'name avatar');
    res.status(201).json({ success: true, item: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateContentItem = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    const item = await ContentItem.findOneAndUpdate(scope, req.body, { new: true })
      .populate('assignedEditor', 'name avatar');
    if (!item) return res.status(404).json({ success: false, message: 'Content item not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteContentItem = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    await ContentItem.findOneAndDelete(scope);
    res.json({ success: true, message: 'Content item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Manage Reporting Entries ─────────────────────────────────────────

export const createReportingEntry = async (req, res) => {
  try {
    const entry = await ReportingEntry.create({
      ...req.body,
      client: req.body.client || req.body.clientId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReportingEntry = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    const entry = await ReportingEntry.findOneAndUpdate(
      scope,
      {
        ...req.body,
        client: req.body.client || req.body.clientId,
      },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReportingEntry = async (req, res) => {
  try {
    const scope = withWorkspaceScope(req, { _id: req.params.id });
    await ReportingEntry.findOneAndDelete(scope);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CLIENT INVOICES ──────────────────────────────────────────────────────────

export const getClientInvoices = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user._id);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const invoices = await Invoice.find({
      ...withWorkspaceScope(req),
      client: client._id,
    })
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const financeRecords = await Finance.find({
      ...withWorkspaceScope(req),
      clientId: client._id,
    })
      .populate('projectId', 'name')
      .sort({ updatedAt: -1 });

    const invoiceIds = invoices.map((item) => item._id);
    const financeIds = financeRecords.map((item) => item._id);

    const [payments, paymentNotes] = await Promise.all([
      Payment.find({ invoice: { $in: invoiceIds } }).sort({ paidAt: -1 }),
      PaymentNote.find({ financeId: { $in: financeIds }, visibleToClient: true }).sort({ paymentDate: -1 }),
    ]);

    const paymentMap = payments.reduce((acc, item) => {
      const key = item.invoice?.toString();
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

    const noteMap = paymentNotes.reduce((acc, item) => {
      const key = item.financeId?.toString();
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

    const invoicePayload = invoices.map((invoice) => ({
      ...invoice.toObject(),
      projectName: invoice.project?.name || '',
      paymentHistory: paymentMap[invoice._id.toString()] || [],
    }));

    const financePayload = financeRecords.map((record) => ({
      ...record.toObject(),
      projectName: record.projectName || record.projectId?.name || '',
      paymentHistory: noteMap[record._id.toString()] || [],
    }));

    res.json({ success: true, invoices: invoicePayload, financeRecords: financePayload, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientFinanceOverview = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user._id);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const [financeRecords, referrals, callHistory] = await Promise.all([
      Finance.find({ ...withWorkspaceScope(req), clientId: client._id }).sort({ updatedAt: -1 }),
      Referral.find({ ...withWorkspaceScope(req), clientId: client._id }).sort({ createdAt: -1 }),
      CallHistory.find({ ...withWorkspaceScope(req), clientId: client._id, visibleToClient: true }).sort({ callDate: -1 }).limit(20),
    ]);

    res.json({ success: true, financeRecords, referrals, callHistory, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CLIENT PROJECTS ──────────────────────────────────────────────────────────

export const getClientProjects = async (req, res) => {
  try {
    const projects = await Project.find(withWorkspaceScope(req))
      .populate('assignedTeam', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientTasks = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user._id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found' });
    }

    const { status, taskCategory, taskType } = req.query;
    const filter = {
      ...withWorkspaceScope(req),
      client: client._id,
      isClientVisible: true,
    };

    if (status) filter.status = status;
    if (taskCategory) filter.taskCategory = taskCategory;
    if (taskType) filter.taskType = taskType;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name avatar')
      .populate('clientResponseBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({ success: true, tasks, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CLIENT AD BUDGET ─────────────────────────────────────────────────────────

export const getClientAdBudget = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user._id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found' });
    }

    const campaigns = await Campaign.find({ client: client._id })
      .select('name platform objective status dailyBudget lifetimeBudget amountAdded amountSpent remainingBalance internalNotes')
      .sort({ updatedAt: -1 });

    const spendLogs = await SmmAdSpend.find({ client: client._id })
      .populate('campaign', 'name platform')
      .populate('ad', 'name')
      .sort({ date: -1 })
      .limit(50);

    const totalMonthlyBudget = campaigns.reduce((sum, c) => sum + (c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.amountAdded || 0), 0);
    const totalDailyBudget = campaigns.reduce((sum, c) => sum + (c.dailyBudget || 0), 0);
    const totalAdded = campaigns.reduce((sum, c) => sum + (c.amountAdded || 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.amountSpent || 0), 0);
    const totalBalance = Math.max(0, totalAdded - totalSpent);

    const latestLog = spendLogs[0];
    const generalNote = latestLog?.notes || campaigns.find(c => c.internalNotes)?.internalNotes || 'Monthly ad budget active and monitored.';

    res.json({
      success: true,
      data: {
        totals: {
          monthlyBudget: totalMonthlyBudget,
          dailyBudget: totalDailyBudget,
          amountAdded: totalAdded,
          amountSpent: totalSpent,
          balance: totalBalance,
          notes: generalNote,
        },
        campaigns: campaigns.map(c => ({
          _id: c._id,
          name: c.name,
          platform: c.platform,
          objective: c.objective,
          status: c.status,
          monthlyBudget: c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.amountAdded || 0,
          dailyBudget: c.dailyBudget || 0,
          amountAdded: c.amountAdded || 0,
          amountSpent: c.amountSpent || 0,
          balance: c.remainingBalance ?? Math.max(0, (c.amountAdded || 0) - (c.amountSpent || 0)),
          notes: c.internalNotes || '',
        })),
        recentLogs: spendLogs.map(l => ({
          _id: l._id,
          date: l.date,
          campaignName: l.campaign?.name || 'Campaign',
          adName: l.ad?.name || 'All Creatives',
          amountAdded: l.amountAdded || 0,
          amountSpent: l.amountSpent || 0,
          balance: l.balance || 0,
          notes: l.notes || '',
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
