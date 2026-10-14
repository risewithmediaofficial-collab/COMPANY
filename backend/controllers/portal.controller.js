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
import SmmMonthlyTracker from '../models/smm/smmMonthlyTracker.model.js';
import SmmClient from '../models/smm/smmClient.model.js';
import { parsePagination } from '../utils/pagination.js';

// Helper: get client from logged-in user (supports both userId and clientId)
const getClientFromUser = async (userOrId) => {
  const userId = userOrId?._id || userOrId;
  let client = await Client.findOne({ userId }).populate('assignedManager', 'name email avatar');
  if (!client && userOrId?.clientId) {
    client = await Client.findById(userOrId.clientId).populate('assignedManager', 'name email avatar');
  }
  if (!client && userOrId?.email) {
    client = await Client.findOne({ email: userOrId.email }).populate('assignedManager', 'name email avatar');
  }
  return client;
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getPortalDashboard = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found' });
    }

    const clientId = client._id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // 1. Client Projects & Project Metrics
    const clientProjects = await Project.find({ client: clientId })
      .select('name status progress dueDate startDate description category proposalText')
      .sort({ createdAt: -1 });

    const totalProjects = clientProjects.length;
    const activeProjects = clientProjects.filter(p => ['active', 'in_progress', 'planning'].includes(p.status));
    const completedProjects = clientProjects.filter(p => ['completed', 'done'].includes(p.status));

    // 2. Client Tasks & Task Metrics: show all tasks under this client or this client's projects
    const projectIds = clientProjects.map((p) => p._id);
    const clientTasks = await Task.find({
      $or: [
        { client: clientId },
        { project: { $in: projectIds } },
      ],
    })
      .select('taskTitle title status priority dueDate taskCategory taskType deliverables files attachments assignedPersonName project')
      .populate('project', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    const totalTasks = clientTasks.length;
    const completedTasks = clientTasks.filter(t => ['done', 'approved', 'completed', 'Completed', 'Done', 'Approved'].includes(t.status)).length;
    const inProgressTasks = clientTasks.filter(t => ['in_progress', 'on_process', 'review', 'In Progress', 'Internal Approval', 'review_required', 'rework'].includes(t.status)).length;
    const reviewTasks = clientTasks.filter(t => ['client_approval', 'waiting_for_client', 'Client Approval'].includes(t.status)).length;
    const pendingTasks = clientTasks.filter(t => ['todo', 'To Do', 'Task Received'].includes(t.status)).length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Client Invoices (Exclusively client's individual invoices: Quoted, Paid, Balance Due)
    const clientInvoices = await Invoice.find({ client: clientId })
      .populate('project', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    const totalQuoted = clientInvoices.reduce((sum, item) => sum + Number(item.totalAmount || item.total || 0), 0);
    const totalPaid = clientInvoices.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const balanceDue = clientInvoices.reduce((sum, item) => sum + Number(item.balanceAmount !== undefined ? item.balanceAmount : Math.max(0, (item.totalAmount || item.total || 0) - (item.paidAmount || 0))), 0);
    const openInvoices = clientInvoices.filter(item => ['sent', 'overdue', 'partially_paid', 'draft'].includes(String(item.status).toLowerCase()));
    const overdueInvoices = clientInvoices.filter(item => String(item.status).toLowerCase() === 'overdue' || (item.dueDate && new Date(item.dueDate) < now && String(item.status).toLowerCase() !== 'paid'));

    // 4. Content Items overview
    const [
      totalContent,
      pendingApproval,
      approvedContent,
      doneContent,
      recentContent,
    ] = await Promise.all([
      ContentItem.countDocuments({ client: clientId }),
      ContentItem.countDocuments({ client: clientId, status: 'Send to Client', approved: false }),
      ContentItem.countDocuments({ client: clientId, approved: true }),
      ContentItem.countDocuments({ client: clientId, status: 'Done' }),
      ContentItem.find({ client: clientId }).sort({ updatedAt: -1 }).limit(10).populate('assignedEditor', 'name avatar'),
    ]);

    // 5. SMM Deliverables this Month: Posts, Reels, Stories (Planned vs Posted)
    let tracker = await SmmMonthlyTracker.findOne({
      client: clientId,
      month: currentMonth,
      year: currentYear,
      isExcluded: { $ne: true },
    }).lean();

    if (!tracker && client.company) {
      const smmC = await SmmClient.findOne({
        companyName: { $regex: new RegExp(`^${client.company.trim()}$`, 'i') }
      }).lean();
      if (smmC) {
        tracker = await SmmMonthlyTracker.findOne({
          client: smmC._id,
          month: currentMonth,
          year: currentYear,
          isExcluded: { $ne: true },
        }).lean();
      }
    }

    let trackerReelsPlanned = 0;
    let trackerPostsPlanned = 0;
    let trackerStoriesPlanned = 0;
    let trackerReelsDone = 0;
    let trackerPostsDone = 0;
    let trackerStoriesDone = 0;

    if (tracker) {
      const planStr = tracker.plan || '';
      const rMatch = planStr.match(/(\d+)\s*R/i);
      if (rMatch) trackerReelsPlanned = parseInt(rMatch[1], 10);
      const pMatch = planStr.match(/(\d+)\s*P/i);
      if (pMatch) trackerPostsPlanned = parseInt(pMatch[1], 10);

      const sPlanStr = tracker.storyPlan || '';
      const sMatch = sPlanStr.match(/(\d+)/);
      trackerStoriesPlanned = sMatch ? parseInt(sMatch[1], 10) : daysInMonth;

      (tracker.days || []).forEach(day => {
        if (Array.isArray(day.items) && day.items.length > 0) {
          day.items.forEach(item => {
            if (item.status === 'done') {
              if (item.type === 'reel') trackerReelsDone++;
              else if (item.type === 'post') trackerPostsDone++;
              else if (item.type === 'story') trackerStoriesDone++;
            }
          });
        } else {
          if (day.postStatus === 'done') {
            if (/R/i.test(day.postLabel || '')) trackerReelsDone++;
            else trackerPostsDone++;
          }
          if (day.storyStatus === 'done') {
            trackerStoriesDone++;
          }
        }
      });
    }

    // Deliverables text fallback on Client record (e.g. "15 Reels, 4 Posts, 30 Stories")
    const dStr = (client.deliverables || client.servicePlan || '').toLowerCase();
    const dReelMatch = dStr.match(/(\d+)\s*(?:reel|r\b)/i);
    const dPostMatch = dStr.match(/(\d+)\s*(?:post|p\b|graphic)/i);
    const dStoryMatch = dStr.match(/(\d+)\s*(?:story|stories|s\b)/i);

    const deliverablesReelsPlanned = dReelMatch ? parseInt(dReelMatch[1], 10) : 0;
    const deliverablesPostsPlanned = dPostMatch ? parseInt(dPostMatch[1], 10) : 0;
    const deliverablesStoriesPlanned = dStoryMatch ? parseInt(dStoryMatch[1], 10) : 0;

    // Content items posted in the current month
    const contentThisMonth = await ContentItem.find({
      client: clientId,
      $or: [
        { datePosted: { $gte: startOfMonth, $lte: endOfMonth } },
        { createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
        { scheduledFor: { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    }).lean();

    const ciReelsPosted = contentThisMonth.filter(i => ['Reel', 'Video'].includes(i.contentType) && ['Posted', 'Done'].includes(i.status)).length;
    const ciPostsPosted = contentThisMonth.filter(i => ['Post', 'Carousel'].includes(i.contentType) && ['Posted', 'Done'].includes(i.status)).length;
    const ciStoriesPosted = contentThisMonth.filter(i => i.contentType === 'Story' && ['Posted', 'Done'].includes(i.status)).length;

    const reelsPlanned = Math.max(trackerReelsPlanned, deliverablesReelsPlanned);
    const postsPlanned = Math.max(trackerPostsPlanned, deliverablesPostsPlanned);
    const storiesPlanned = Math.max(trackerStoriesPlanned, deliverablesStoriesPlanned, (reelsPlanned || postsPlanned ? daysInMonth : 0));

    const reelsPosted = Math.max(trackerReelsDone, ciReelsPosted);
    const postsPosted = Math.max(trackerPostsDone, ciPostsPosted);
    const storiesPosted = Math.max(trackerStoriesDone, ciStoriesPosted);

    const totalDeliverablesPlanned = reelsPlanned + postsPlanned + storiesPlanned;
    const totalDeliverablesPosted = reelsPosted + postsPosted + storiesPosted;
    const smmCompletionRate = totalDeliverablesPlanned > 0
      ? Math.min(100, Math.round((totalDeliverablesPosted / totalDeliverablesPlanned) * 100))
      : 0;

    const smmMetrics = {
      month: now.toLocaleString('en-US', { month: 'long' }),
      year: currentYear,
      daysInMonth,
      reels: {
        planned: reelsPlanned,
        posted: reelsPosted,
        pending: Math.max(0, reelsPlanned - reelsPosted),
      },
      posts: {
        planned: postsPlanned,
        posted: postsPosted,
        pending: Math.max(0, postsPlanned - postsPosted),
      },
      stories: {
        planned: storiesPlanned,
        posted: storiesPosted,
        pending: Math.max(0, storiesPlanned - storiesPosted),
      },
      total: {
        planned: totalDeliverablesPlanned,
        posted: totalDeliverablesPosted,
        pending: Math.max(0, totalDeliverablesPlanned - totalDeliverablesPosted),
        completionRate: smmCompletionRate,
      },
    };

    // 6. Client Ad Budget & Active Campaigns
    const clientCampaigns = await Campaign.find({ client: clientId }).sort({ updatedAt: -1 }).lean();
    const mBudget = clientCampaigns.reduce((sum, c) => sum + (c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.amountAdded || 0), 0);
    const dBudget = clientCampaigns.reduce((sum, c) => sum + (c.dailyBudget || 0), 0);
    const added = clientCampaigns.reduce((sum, c) => sum + (c.amountAdded || 0), 0);
    const spent = clientCampaigns.reduce((sum, c) => sum + (c.amountSpent || 0), 0);
    const bal = Math.max(0, added - spent);
    const latestSpendLog = await SmmAdSpend.findOne({ client: clientId }).sort({ date: -1 }).lean();

    const adBudget = {
      monthlyBudget: mBudget,
      dailyBudget: dBudget,
      amountAdded: added,
      amountSpent: spent,
      balance: bal,
      notes: latestSpendLog?.notes || clientCampaigns[0]?.internalNotes || 'Budget on track',
      campaignCount: clientCampaigns.length,
      campaigns: clientCampaigns.map(c => ({
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
      })),
    };

    res.json({
      success: true,
      client: {
        _id: client._id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        logo: client.logo,
        onboardingSteps: client.onboardingSteps,
        assignedManager: client.assignedManager,
        deliverables: client.deliverables,
        servicePlan: client.servicePlan,
      },
      stats: {
        totalContent,
        pendingApproval,
        approvedContent,
        doneContent,
        activeProjects: activeProjects.length,
        openInvoices: openInvoices.length,
      },
      projectMetrics: {
        total: totalProjects,
        active: activeProjects.length,
        completed: completedProjects.length,
        projects: clientProjects,
      },
      taskMetrics: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        review: reviewTasks,
        pending: pendingTasks,
        completionRate: taskCompletionRate,
        tasks: clientTasks.slice(0, 10),
      },
      smmMetrics,
      tracker: tracker ? {
        _id: tracker._id,
        plan: tracker.plan,
        storyPlan: tracker.storyPlan,
        team: tracker.team,
        month: tracker.month || currentMonth,
        year: tracker.year || currentYear,
        days: tracker.days || [],
      } : null,
      adBudget,
      invoiceMetrics: {
        totalQuoted,
        totalPaid,
        balanceDue,
        openCount: openInvoices.length,
        overdueCount: overdueInvoices.length,
        recentInvoices: clientInvoices.slice(0, 5),
      },
      activeProjects,
      openInvoices,
      recentContent,
    });
  } catch (error) {
    console.error('getPortalDashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CONTENT ITEMS ─────────────────────────────────────────────────────────────

export const getContentItems = async (req, res) => {
  try {
    const { status, view, search, platform, priority } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

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

    const [items, total] = await Promise.all([
      ContentItem.find(filter)
        .populate('assignedEditor', 'name avatar')
        .populate('approvedBy', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentItem.countDocuments(filter),
    ]);

    res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
      const client = await getClientFromUser(req.user);
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
    const client = await getClientFromUser(req.user);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const invoices = await Invoice.find({
      client: client._id,
    })
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

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
    const client = await getClientFromUser(req.user);
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
    const client = await getClientFromUser(req.user);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const projects = await Project.find({ client: client._id })
      .populate('assignedTeam', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientTasks = async (req, res) => {
  try {
    const client = await getClientFromUser(req.user);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found' });
    }

    const { status, taskCategory, taskType } = req.query;
    const clientProjects = await Project.find({ client: client._id }).select('_id');
    const projectIds = clientProjects.map((p) => p._id);

    const filter = {
      $or: [
        { client: client._id },
        { project: { $in: projectIds } },
      ],
    };

    if (status) filter.status = status;
    if (taskCategory) filter.taskCategory = taskCategory;
    if (taskType) filter.taskType = taskType;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name avatar')
      .populate('project', 'name')
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
    const client = await getClientFromUser(req.user);
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
