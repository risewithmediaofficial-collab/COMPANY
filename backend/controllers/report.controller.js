import Lead from '../models/lead.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Invoice from '../models/invoice.model.js';
import Expense from '../models/expense.model.js';
import Attendance from '../models/attendance.model.js';
import DomainRenewal from '../models/domainRenewal.model.js';
import User from '../models/user.model.js';
import CallHistory from '../models/callHistory.model.js';
import SOP from '../models/sop.model.js';
import ActivityLog from '../models/activityLog.model.js';
import TaskNote from '../models/taskNote.model.js';
import DmVideoShoot from '../models/dmVideoShoot.model.js';
import ProjectMonthlyDeliverable from '../models/projectMonthlyDeliverable.model.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getAdminDashboard = async (req, res) => {
  try {
    const isManager = req.user?.role === 'manager';
    const now = new Date();
    const period = req.query.period || 'monthly';
    const { startDate: qStartDate, endDate: qEndDate } = req.query;

    let periodStart, periodEnd, priorPeriodStart, priorPeriodEnd;

    if (qStartDate && qEndDate) {
      periodStart = new Date(qStartDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(qEndDate);
      periodEnd.setHours(23, 59, 59, 999);

      const spanMs = Math.max(86400000, periodEnd.getTime() - periodStart.getTime());
      priorPeriodStart = new Date(periodStart.getTime() - spanMs);
      priorPeriodEnd = new Date(periodStart.getTime() - 1);
    } else if (period === 'weekly') {
      const day = now.getDay();
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(now);

      priorPeriodStart = new Date(periodStart);
      priorPeriodStart.setDate(priorPeriodStart.getDate() - 7);
      priorPeriodEnd = new Date(periodStart);
      priorPeriodEnd.setMilliseconds(-1);
    } else if (period === 'lastMonth') {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      priorPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      priorPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (period === 'yearly') {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now);

      priorPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
      priorPeriodEnd = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999);
    } else if (period === 'allTime') {
      periodStart = new Date(0);
      periodEnd = new Date(now);

      priorPeriodStart = new Date(0);
      priorPeriodEnd = new Date(now);
    } else {
      // 'monthly'
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now);

      priorPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      priorPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // 1. Core KPIs & Counts
    const [
      totalLeads, newLeadsThisMonth, wonLeads,
      totalClients, activeClients,
      totalProjects, activeProjects,
      totalTasks, overdueTasks,
      monthRevenue, lastMonthRevenue,
      allTimeRevenue,
      totalExpensesData,
      adBudgetTotals,
      totalUsers,
      expiringRenewals,
      pendingBalanceAgg,
      pendingNotesCount,
      allProjects,
      allTasks,
      allClients,
      allUsers,
      allVideoShoots,
      leadsList,
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: periodStart, $lte: periodEnd } }),
      Lead.countDocuments({ stage: 'won', updatedAt: { $gte: periodStart, $lte: periodEnd } }),
      Client.countDocuments(),
      Client.countDocuments({ status: { $in: ['active', 'Active'] } }),
      Project.countDocuments(),
      Project.countDocuments({ status: { $in: ['active', 'In Progress'] } }),
      Task.countDocuments({ parent: null }),
      Task.countDocuments({ dueDate: { $lt: now }, status: { $nin: ['done', 'approved', 'Completed', 'Approved'] } }),
      Invoice.aggregate([{ $match: { status: 'paid', paidDate: { $gte: periodStart, $lte: periodEnd } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', paidDate: { $gte: priorPeriodStart, $lte: priorPeriodEnd } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Expense.aggregate([{ $match: { status: { $in: ['approved', 'reimbursed'] }, date: { $gte: periodStart, $lte: periodEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Project.aggregate([
        {
          $group: {
            _id: null,
            totalAdsBudget: { $sum: { $ifNull: ['$budgetDetails.adsAmount', 0] } },
          },
        },
      ]),
      User.countDocuments({ isActive: true }),
      DomainRenewal.find({
        organizationId: req.user.organizationId,
        expiryDate: { $gte: now, $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999) },
        status: { $in: ['active', 'pending'] },
      })
        .populate('clientId', 'name company')
        .sort({ expiryDate: 1 })
        .limit(5),
      Invoice.aggregate([
        {
          $match: {
            status: { $in: ['sent', 'viewed', 'partially_paid', 'Sent', 'Partially Paid'] },
          },
        },
        {
          $group: {
            _id: null,
            pendingBalance: { $sum: { $ifNull: ['$balanceAmount', '$total', 0] } },
          },
        },
      ]),
      TaskNote.countDocuments({ status: 'pending' }).catch(() => 0),
      Project.find({}, 'name status priority startDate dueDate endDate progress budget client').populate('client', 'name company'),
      Task.find({ parent: null }, 'title taskTitle status priority dueDate taskCategory postingPlatforms shootStatus editingStatus reviewStatus postingStatus assignedTo').populate('assignedTo', 'name email avatar role department'),
      Client.find({}, 'name company status monthlyRetainer service createdAt'),
      User.find({ isActive: true }, 'name email role department avatar position'),
      DmVideoShoot.find({}, 'title date status client').catch(() => []),
      Lead.find({}, 'name company stage value createdAt source'),
    ]);

    // 2. Revenue Month-by-Month Trend (Past 6 Months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rawRevenueChart = await Invoice.aggregate([
      { $match: { status: 'paid', paidDate: { $gte: sixMonthsAgo, $lte: periodEnd } } },
      { $group: { _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } }, revenue: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format 6 months continuous array
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthLabel = MONTH_NAMES[d.getMonth()];
      const match = rawRevenueChart.find((r) => r._id.year === y && r._id.month === m);
      revenueTrend.push({
        month: monthLabel,
        year: y,
        revenue: match ? match.revenue : 0,
      });
    }

    // 3. Revenue by Client
    const rawRevenueByClient = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$client', totalRevenue: { $sum: '$total' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);
    const revenueByClient = await Promise.all(
      rawRevenueByClient.map(async (item) => {
        const clientDoc = item._id ? await Client.findById(item._id, 'name company') : null;
        return {
          clientId: item._id,
          name: clientDoc?.company || clientDoc?.name || 'Internal / Direct',
          revenue: item.totalRevenue,
        };
      })
    );

    // 4. Project Health Analysis
    let onTrackProjects = 0;
    let atRiskProjects = 0;
    let delayedProjects = 0;
    const projectStatusCounts = { Planning: 0, 'In Progress': 0, 'On Hold': 0, Completed: 0 };

    allProjects.forEach((p) => {
      const normStatus = p.status === 'in_progress' ? 'In Progress' : p.status === 'on_hold' ? 'On Hold' : p.status === 'planning' ? 'Planning' : p.status === 'completed' ? 'Completed' : 'In Progress';
      projectStatusCounts[normStatus] = (projectStatusCounts[normStatus] || 0) + 1;

      const isDelayed = p.dueDate && new Date(p.dueDate) < now && normStatus !== 'Completed';
      const isAtRisk = normStatus === 'On Hold' || (p.dueDate && new Date(p.dueDate).getTime() - now.getTime() < 7 * 86400000 && (p.progress || 0) < 50);

      if (isDelayed) {
        delayedProjects++;
      } else if (isAtRisk) {
        atRiskProjects++;
      } else {
        onTrackProjects++;
      }
    });

    // 5. Task Status Distribution
    const taskStatusCounts = {
      'To Do': 0,
      'On Process': 0,
      'Waiting for Client': 0,
      'Review Required': 0,
      Completed: 0,
    };
    let pendingApprovals = pendingNotesCount;

    allTasks.forEach((t) => {
      const s = t.status || 'To Do';
      if (s === 'To Do' || s === 'todo' || s === 'pending') taskStatusCounts['To Do']++;
      else if (s === 'On Process' || s === 'in_progress') taskStatusCounts['On Process']++;
      else if (s === 'Waiting for Client' || s === 'waiting_client') {
        taskStatusCounts['Waiting for Client']++;
        pendingApprovals++;
      } else if (s === 'Review Required' || s === 'review' || t.reviewStatus === 'review_ready') {
        taskStatusCounts['Review Required']++;
        pendingApprovals++;
      } else if (s === 'Completed' || s === 'Approved' || s === 'done') {
        taskStatusCounts['Completed']++;
      } else {
        taskStatusCounts['On Process']++;
      }
    });

    // 6. Client Health Analysis
    let healthyClients = 0;
    let attentionClients = 0;
    let atRiskClients = 0;
    const clientStatusBreakdown = { Active: 0, Prospect: 0, Renew: 0, Inactive: 0, Churned: 0 };

    allClients.forEach((c) => {
      const s = c.status || 'Active';
      clientStatusBreakdown[s] = (clientStatusBreakdown[s] || 0) + 1;

      if (s === 'Active') healthyClients++;
      else if (s === 'Prospect' || s === 'Renew') attentionClients++;
      else atRiskClients++;
    });

    // 7. All Users Performance, Workload & Metrics Matrix
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();

    const monthlyDeliverablesList = await ProjectMonthlyDeliverable.find({
      month: currentMonthNum,
      year: currentYearNum,
    }).populate('projectId', 'name client status').lean();

    const allUserMetrics = allUsers.map((u) => {
      const uId = String(u._id);
      const userTasks = allTasks.filter((t) => {
        const isAssigned = (Array.isArray(t.assignedTo) && t.assignedTo.some((a) => String(a._id || a) === uId))
          || String(t.scriptWriterAssigned?._id || t.scriptWriterAssigned) === uId
          || String(t.videographerAssigned?._id || t.videographerAssigned) === uId
          || String(t.editorAssigned?._id || t.editorAssigned) === uId
          || String(t.publisherAssigned?._id || t.publisherAssigned) === uId;
        return isAssigned;
      });

      const totalAssigned = userTasks.length;
      const completed = userTasks.filter((t) => ['Completed', 'Approved', 'done', 'completed'].includes(t.status)).length;
      const inProgress = userTasks.filter((t) => ['On Process', 'in_progress', 'on_process'].includes(t.status)).length;
      const todo = userTasks.filter((t) => ['To Do', 'todo', 'pending'].includes(t.status) || !t.status).length;
      const overdue = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !['Completed', 'Approved', 'done', 'completed'].includes(t.status)).length;
      const overTarget = userTasks.filter((t) => t.isOverTarget).length;
      const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      const activeCount = totalAssigned - completed;

      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || u.position || u.role,
        avatar: u.avatar,
        totalTasks: totalAssigned,
        completedTasks: completed,
        inProgressTasks: inProgress,
        todoTasks: todo,
        overdueTasks: overdue,
        overTargetTasks: overTarget,
        activeTasks: activeCount,
        completionRate,
        workloadPercent: Math.min(Math.round((activeCount / 8) * 100), 100),
      };
    }).sort((a, b) => b.activeTasks - a.activeTasks);

    const teamWorkload = allUserMetrics.slice(0, 8);

    // Active monthly project deliverables quota progress
    const activeProjectDeliverables = monthlyDeliverablesList.map((target) => {
      const projId = String(target.projectId?._id || target.projectId);
      const projName = target.projectId?.name || 'Project';
      const matchingTasks = allTasks.filter((t) => {
        const tProj = String(t.project?._id || t.project);
        if (tProj !== projId) return false;
        const taskType = (t.taskType || '').toLowerCase();
        const contentType = (t.contentType || '').toLowerCase();
        const targetType = (target.contentType || '').toLowerCase();
        return taskType.includes(targetType) || contentType.includes(targetType) || targetType.includes(taskType);
      });
      const currentCount = matchingTasks.length;
      const targetQty = target.targetQuantity || 1;
      return {
        _id: target._id,
        projectId: projId,
        projectName: projName,
        contentType: target.contentType,
        targetQuantity: targetQty,
        currentCount,
        remaining: Math.max(0, targetQty - currentCount),
        isOver: currentCount > targetQty,
        exceededBy: Math.max(0, currentCount - targetQty),
        progressPercent: Math.min(100, Math.round((currentCount / targetQty) * 100)),
      };
    });

    const totalOverTargetTasks = allTasks.filter((t) => t.isOverTarget).length;

    // 8. Content Production Pipeline
    const contentPipeline = {
      ideas: allTasks.filter((t) => t.status === 'To Do' || t.status === 'todo' || t.status === 'pending').length,
      shoot: allVideoShoots.filter((s) => s.status !== 'completed').length || allTasks.filter((t) => t.shootStatus === 'in_progress' || t.shootStatus === 'pending').length,
      editing: allTasks.filter((t) => t.editingStatus === 'in_progress' || t.editingStatus === 'pending' || (t.status === 'On Process' && (t.taskCategory === 'video_content' || t.taskCategory === 'reel' || t.taskType?.toLowerCase().includes('video') || t.taskType?.toLowerCase().includes('reel')))).length,
      review: allTasks.filter((t) => t.status === 'Review Required' || t.reviewStatus === 'review_ready' || t.reviewStatus === 'in_review').length,
      approval: allTasks.filter((t) => t.status === 'Waiting for Client').length,
      published: allTasks.filter((t) => t.status === 'Completed' || t.status === 'Approved' || t.postingStatus === 'published').length,
    };

    // Platform distribution
    const platformCounts = { Instagram: 0, YouTube: 0, LinkedIn: 0, Facebook: 0, Twitter: 0 };
    allTasks.forEach((t) => {
      if (Array.isArray(t.postingPlatforms)) {
        t.postingPlatforms.forEach((p) => {
          const cap = p.charAt(0).toUpperCase() + p.slice(1);
          if (platformCounts[cap] !== undefined) platformCounts[cap]++;
        });
      }
    });

    // 9. Sales Funnel Breakdown
    const salesFunnel = [
      { stage: 'New', label: 'New Leads', count: leadsList.filter((l) => l.stage === 'new').length },
      { stage: 'Contacted', label: 'Contacted', count: leadsList.filter((l) => l.stage === 'contacted').length },
      { stage: 'Qualified', label: 'Qualified', count: leadsList.filter((l) => l.stage === 'qualified').length },
      { stage: 'Meeting', label: 'Meeting Booked', count: leadsList.filter((l) => l.stage === 'meeting_booked').length },
      { stage: 'Proposal', label: 'Proposal Sent', count: leadsList.filter((l) => l.stage === 'proposal_sent').length },
      { stage: 'Won', label: 'Won', count: leadsList.filter((l) => l.stage === 'won').length },
      { stage: 'Lost', label: 'Lost', count: leadsList.filter((l) => l.stage === 'lost').length },
    ];

    const thisMonthRev = monthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : 0;
    const totalAdsBudget = adBudgetTotals[0]?.totalAdsBudget || 0;
    const totalIncome = allTimeRevenue[0]?.total || 0;
    const totalExpenses = totalExpensesData[0]?.total || 0;
    const netProfit = thisMonthRev - totalExpenses;
    const remainingAmount = thisMonthRev - totalExpenses - totalAdsBudget;
    const pendingBalance = pendingBalanceAgg[0]?.pendingBalance || 0;

    const recentActivityLogs = await ActivityLog.find()
      .populate('actor', 'name email avatar role')
      .sort({ createdAt: -1 })
      .limit(15);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.findOne({ user: req.user._id, date: today });

    res.json({
      success: true,
      periodStart,
      periodEnd,
      todayAttendance,
      stats: {
        totalLeads,
        newLeadsThisMonth,
        wonLeads,
        conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
        totalClients,
        activeClients,
        totalProjects,
        activeProjects,
        totalTasks,
        overdueTasks,
        totalOverTargetTasks,
        pendingApprovals,
        totalPending: pendingBalance,
        grossAmount: thisMonthRev,
        monthRevenue: thisMonthRev,
        revenueGrowth,
        totalIncome,
        totalExpenses,
        totalAdsBudget,
        netProfit,
        remainingAmount,
        totalUsers,
        expiringRenewalsCount: expiringRenewals.length,
      },
      visualizations: {
        revenueTrend,
        revenueByClient,
        projectHealth: {
          onTrack: onTrackProjects,
          atRisk: atRiskProjects,
          delayed: delayedProjects,
          byStatus: projectStatusCounts,
        },
        taskDistribution: taskStatusCounts,
        clientHealth: {
          healthy: healthyClients,
          attention: attentionClients,
          atRisk: atRiskClients,
          breakdown: clientStatusBreakdown,
        },
        teamWorkload,
        allUserMetrics,
        activeProjectDeliverables,
        contentPipeline,
        platformCounts,
        salesFunnel,
      },
      renewals: expiringRenewals,
      activityLogs: recentActivityLogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const { entityType, search } = req.query;

    const query = {};
    if (entityType) query.entityType = entityType;
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('actor', 'name email avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getEmployeeDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(Date.now() - 7 * 24 * 3600000);

    const userPos = req.user.position ? req.user.position.toLowerCase() : null;

    const userTaskOr = [
      { assignedTo: req.user._id },
      { scriptWriterAssigned: req.user._id },
      { videographerAssigned: req.user._id },
      { editorAssigned: req.user._id },
      { publisherAssigned: req.user._id },
    ];

    const [
      myTasks,
      overdueTasks,
      todayAttendance,
      completedThisWeek,
      weeklyLoggedUpdates,
      personalTasksThisWeek,
      recentEodReports,
      sops,
      inProgressCount,
      overTargetCount,
      allAssignedCount,
    ] = await Promise.all([
      Task.find({
        $or: userTaskOr,
        status: { $nin: ['done', 'completed', 'approved'] },
      })
        .populate('project', 'name')
        .populate('client', 'name company logo')
        .sort({ createdAt: -1 })
        .limit(20),
      Task.countDocuments({
        $or: userTaskOr,
        dueDate: { $lt: new Date() },
        status: { $nin: ['done', 'completed', 'approved'] },
      }),
      Attendance.findOne({ user: req.user._id, date: today }),
      Task.countDocuments({
        $or: userTaskOr,
        status: { $in: ['done', 'completed', 'approved'] },
        updatedAt: { $gte: weekStart },
      }),
      Task.countDocuments({
        $or: userTaskOr,
        'progressUpdates.workDate': { $gte: weekStart },
      }),
      Task.countDocuments({
        createdBy: req.user._id,
        isPersonalTask: true,
        dueDate: { $gte: weekStart },
      }),
      Attendance.find({
        user: req.user._id,
        'eodReport.submittedAt': { $exists: true },
      })
        .sort({ date: -1 })
        .limit(7),
      SOP.find({
        status: 'active',
        $or: [
          { sopType: 'company' },
          { sopType: 'department' },
          { sopType: 'role_based', role: { $in: [req.user.role, userPos, 'employee', 'all'].filter(Boolean) } },
          { createdBy: req.user._id },
        ],
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(6),
      Task.countDocuments({
        $or: userTaskOr,
        status: { $in: ['On Process', 'in_progress', 'on_process'] },
      }),
      Task.countDocuments({
        $or: userTaskOr,
        isOverTarget: true,
      }),
      Task.countDocuments({
        $or: userTaskOr,
      }),
    ]);

    res.json({
      success: true,
      myTasks,
      assignedTasks: myTasks,
      totalAssignedTasks: allAssignedCount,
      inProgressTasks: inProgressCount,
      overTargetTasks: overTargetCount,
      overdueTasks,
      todayAttendance,
      completedThisWeek,
      weeklyLoggedUpdates,
      personalTasksThisWeek,
      recentEodReports,
      sops,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientDashboard = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id });
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const projects = await Project.find({ client: client._id }).select('name status progress dueDate manager team');
    const invoices = await Invoice.find({ client: client._id }).select('invoiceNumber status total dueDate').sort({ createdAt: -1 }).limit(5);

    let teamUserIds = [];
    if (client.assignedManager) teamUserIds.push(client.assignedManager);
    if (client.assignedTeam && client.assignedTeam.length > 0) {
      teamUserIds.push(...client.assignedTeam);
    }
    projects.forEach((p) => {
      if (p.manager) teamUserIds.push(p.manager);
      if (p.team && p.team.length > 0) teamUserIds.push(...p.team);
    });

    const uniqueTeamIds = [...new Set(teamUserIds.map((id) => id.toString()))];

    const eodFilter = { 'eodReport.submittedAt': { $exists: true } };
    if (uniqueTeamIds.length > 0) {
      eodFilter.user = { $in: uniqueTeamIds };
    }

    const eodReports = await Attendance.find(eodFilter)
      .populate('user', 'name avatar department position role email')
      .sort({ date: -1 })
      .limit(10);

    res.json({ success: true, client, projects, invoices, eodReports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyEmployeeSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const users = await User.find({
      role: { $in: ['employee', 'manager'] },
      isActive: true,
    }).select('name email department role position');

    const reportPromises = users.map(async (userObj) => {
      const [attendanceRecords, callCount] = await Promise.all([
        Attendance.find({
          user: userObj._id,
          date: { $gte: start, $lte: end },
        }),
        CallHistory.countDocuments({
          addedBy: userObj._id,
          callDate: { $gte: start, $lte: end },
        }),
      ]);

      const present = attendanceRecords.filter((r) => r.status === 'present').length;
      const absent = attendanceRecords.filter((r) => r.status === 'absent').length;
      const leave = attendanceRecords.filter((r) => r.status === 'leave').length;
      const holiday = attendanceRecords.filter((r) => r.status === 'holiday').length;
      const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

      return {
        user: userObj,
        present,
        absent,
        leave,
        holiday,
        totalHours: parseFloat(totalHours.toFixed(2)),
        callCount,
      };
    });

    const summary = await Promise.all(reportPromises);

    res.json({ success: true, month: targetMonth, year: targetYear, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
