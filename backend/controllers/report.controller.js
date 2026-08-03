// =============================================
// REPORT CONTROLLER - Analytics & Dashboards
// =============================================

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
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: periodStart, $lte: periodEnd } }),
      Lead.countDocuments({ stage: 'won', updatedAt: { $gte: periodStart, $lte: periodEnd } }),
      Client.countDocuments(),
      Client.countDocuments({ status: { $in: ['active', 'Active'] } }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Task.countDocuments({ parent: null }),
      Task.countDocuments({ dueDate: { $lt: now }, status: { $nin: ['done', 'approved'] } }),
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
            status: { $in: ['sent', 'viewed', 'partially_paid'] },
          },
        },
        {
          $group: {
            _id: null,
            pendingBalance: { $sum: { $ifNull: ['$balanceAmount', 0] } },
          },
        },
      ]),
    ]);

    // Lead stage funnel
    const stageFunnel = await Lead.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);

    // Monthly revenue for chart based on selected date period
    let chartStartDate = periodStart;
    if (period === 'monthly' || period === 'weekly') {
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (period === 'allTime') {
      chartStartDate = new Date(0);
    }

    const revenueChart = await Invoice.aggregate([
      { $match: { status: 'paid', paidDate: { $gte: chartStartDate, $lte: periodEnd } } },
      { $group: { _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } }, revenue: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Task status breakdown
    const taskBreakdown = await Task.aggregate([
      { $match: { parent: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const thisMonthRev = monthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : 0;
    const totalAdsBudget = adBudgetTotals[0]?.totalAdsBudget || 0;
    const totalIncome = allTimeRevenue[0]?.total || 0;
    const totalExpenses = totalExpensesData[0]?.total || 0;
    const netProfit = thisMonthRev - totalExpenses;
    const remainingAmount = thisMonthRev - totalExpenses - totalAdsBudget;
    const pendingBalance = pendingBalanceAgg[0]?.pendingBalance || 0;

    res.json({
      success: true,
      periodStart,
      periodEnd,
      stats: {
        totalLeads, newLeadsThisMonth, wonLeads,
        conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
        totalClients, activeClients,
        totalProjects, activeProjects,
        totalTasks, overdueTasks,
        totalPending: isManager ? 0 : pendingBalance,
        grossAmount: isManager ? 0 : thisMonthRev,
        monthRevenue: isManager ? 0 : thisMonthRev,
        revenueGrowth: isManager ? 0 : revenueGrowth,
        totalIncome: isManager ? 0 : totalIncome,
        totalExpenses: isManager ? 0 : totalExpenses,
        totalAdsBudget,
        netProfit: isManager ? 0 : netProfit,
        remainingAmount: isManager ? 0 : remainingAmount,
        totalUsers,
        expiringRenewalsCount: expiringRenewals.length,
      },
      charts: { stageFunnel, revenueChart: isManager ? [] : revenueChart, taskBreakdown },
      renewals: expiringRenewals,
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

    const [myTasks, overdueTasks, todayAttendance, completedThisWeek, weeklyLoggedUpdates, personalTasksThisWeek, recentEodReports, sops] = await Promise.all([
      Task.find({ assignedTo: req.user._id, status: { $nin: ['done'] }, parent: null })
        .populate('project', 'name')
        .sort({ dueDate: 1 })
        .limit(10),
      Task.countDocuments({ assignedTo: req.user._id, dueDate: { $lt: new Date() }, status: { $nin: ['done', 'approved'] } }),
      Attendance.findOne({ user: req.user._id, date: today }),
      Task.countDocuments({ assignedTo: req.user._id, status: 'done', completedAt: { $gte: weekStart } }),
      Task.countDocuments({
        assignedTo: req.user._id,
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
    ]);

    res.json({
      success: true,
      myTasks,
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
