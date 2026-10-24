import cron from 'node-cron';
import Attendance from '../models/attendance.model.js';
import DomainRenewal from '../models/domainRenewal.model.js';
import Invoice from '../models/invoice.model.js';
import Lead from '../models/lead.model.js';
import Notification from '../models/notification.model.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Subscription from '../models/subscription.model.js';
import FinanceBudget from '../models/financeBudget.model.js';
import Loan from '../models/loan.model.js';
import { createNotification } from '../utils/notification.js';
import { sendWhatsAppMessage } from './whatsapp.service.js';

/**
 * Check and send morning attendance reminders to employees who have not clocked in
 * Scheduled up to 10:30 AM morning (9:00, 9:15, 9:30, 9:45, 10:00, 10:15, 10:25, 10:30 AM)
 * On Sunday, skipped automatically because Sunday is a default weekly holiday.
 */
export const checkAndSendAttendanceReminders = async (io, options = {}) => {
  try {
    console.log('CRON: Running morning attendance reminder check (up to 10:30 AM cutoff)...');

    const now = new Date();
    // 0 is Sunday in JavaScript Date
    if (now.getDay() === 0 && !options.isTest) {
      console.log('CRON: Today is Sunday (Weekly Holiday). Skipping morning attendance reminders.');
      return { sentCount: 0, skipped: true, reason: 'Sunday is a weekly holiday' };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Find all active internal team members (all internal roles except client/referral)
    const eligibleUsers = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    }).select('_id name role email phone');

    if (!eligibleUsers.length) {
      console.log('CRON: No active eligible users found for attendance reminders.');
      return { sentCount: 0, checkedCount: 0 };
    }

    // 2. Find attendance records already marked for today
    const markedAttendances = await Attendance.find({
      date: { $gte: start, $lte: end },
      $or: [
        { clockIn: { $exists: true, $ne: null } },
        { status: { $in: ['present', 'leave', 'holiday', 'work_from_home'] } },
        { 'sessions.0': { $exists: true } },
      ],
    }).select('user status');

    const markedUserIds = new Set(markedAttendances.map((a) => a.user.toString()));

    // 3. Filter users who have NOT marked attendance yet
    const pendingUsers = eligibleUsers.filter((u) => !markedUserIds.has(u._id.toString()));

    console.log(`CRON: Attendance check: ${pendingUsers.length} of ${eligibleUsers.length} users have not marked attendance today.`);

    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Determine message and urgency based on time approaching 10:30 AM cutoff
    let title = '⏰ Attendance Reminder (10:30 AM Cutoff)';
    let messageTemplate = (userName) =>
      `Good morning ${userName}! Please remember to clock in. The daily cutoff is 10:30 AM, after which you will be automatically marked absent.`;

    if (hours === 10 && minutes >= 25) {
      title = '🚨 Final Warning: Clock In Before 10:30 AM!';
      messageTemplate = (userName) =>
        `URGENT ${userName}! 10:30 AM cutoff is right now. Clock in immediately or you will be automatically marked absent for today!`;
    } else if (hours === 10 || (hours === 9 && minutes >= 45)) {
      title = '⚠️ Urgent Attendance Reminder: 10:30 AM Cutoff';
      messageTemplate = (userName) =>
        `Good morning ${userName}! You have not clocked in yet. You must clock in before 10:30 AM to avoid being automatically marked absent.`;
    }

    let sentCount = 0;
    const notifiedUserIds = new Set();

    for (const user of pendingUsers) {
      await createNotification(
        {
          recipient: user._id,
          type: 'attendance_reminder',
          title,
          message: messageTemplate(user.name),
          link: '/attendance',
          metadata: {
            reminderType: 'morning_attendance',
            cutoff: '10:30 AM',
            date: start.toISOString().slice(0, 10),
            time: timeString,
          },
        },
        io
      );

      notifiedUserIds.add(user._id.toString());
      sentCount++;
    }

    // 4. If options.testUser provided (manual trigger / test button), ensure caller ALWAYS receives reminder
    if (options.testUser && !notifiedUserIds.has(options.testUser._id?.toString())) {
      const testUser = options.testUser;
      await createNotification(
        {
          recipient: testUser._id,
          type: 'attendance_reminder',
          title: `${title} (Verified)`,
          message: messageTemplate(testUser.name),
          link: '/attendance',
          metadata: {
            reminderType: 'morning_attendance_test',
            cutoff: '10:30 AM',
            date: start.toISOString().slice(0, 10),
            time: timeString,
            isTest: true,
          },
        },
        io
      );
      sentCount++;
    }

    return { sentCount, pendingCount: pendingUsers.length, totalChecked: eligibleUsers.length };
  } catch (error) {
    console.error('CRON Error (Attendance Reminders):', error);
    return { error: error.message };
  }
};

/**
 * Automatically mark employees as absent if they have failed to clock in by 10:30 AM.
 * Scheduled to run at 10:31 AM Monday - Saturday.
 * Skipped on Sundays because Sunday is a default weekly holiday.
 */
export const autoMarkAbsentForUnclockedUsers = async (io, options = {}) => {
  try {
    console.log('CRON: Running 10:30 AM auto-absent cutoff check for unclocked staff...');

    const now = new Date();
    // Sunday check
    if (now.getDay() === 0 && !options.isTest) {
      console.log('CRON: Today is Sunday (Weekly Holiday). Skipping auto-absent cutoff check.');
      return { markedCount: 0, skipped: true, reason: 'Sunday is a weekly holiday' };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Eligible active internal users
    const eligibleUsers = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    }).select('_id name role email phone');

    if (!eligibleUsers.length) {
      console.log('CRON: No active eligible users found for auto-absent check.');
      return { markedCount: 0, totalChecked: 0 };
    }

    // 2. Fetch existing attendances for today
    const existingAttendances = await Attendance.find({
      date: { $gte: start, $lte: end },
    });

    const attendanceByUser = new Map();
    existingAttendances.forEach((att) => {
      attendanceByUser.set(att.user.toString(), att);
    });

    let markedCount = 0;
    const markedUsers = [];

    for (const user of eligibleUsers) {
      const att = attendanceByUser.get(user._id.toString());

      // If user has clocked in or has approved leave/holiday/WFH, skip
      if (att) {
        const hasClockedIn = Boolean(att.clockIn || (att.sessions && att.sessions.some((s) => s.clockIn)));
        const isApprovedExcusal = Boolean(att.approvalStatus === 'approved' && ['leave', 'holiday', 'work_from_home'].includes(att.status));
        const isPendingRequest = Boolean(att.approvalStatus === 'pending');

        if (hasClockedIn || isApprovedExcusal || isPendingRequest) {
          continue;
        }
        // If already marked absent
        if (att.status === 'absent') {
          continue;
        }
      }

      // Automatically mark as absent
      await Attendance.findOneAndUpdate(
        { user: user._id, date: start },
        {
          $set: {
            status: 'absent',
            requestedStatus: 'absent',
            approvalStatus: 'approved',
            isApproved: true,
            notes: 'Automatically marked absent: Failed to clock in by 10:30 AM cutoff',
            clockIn: null,
            clockOut: null,
            totalHours: 0,
            sessions: [],
          },
        },
        { upsert: true, new: true }
      );

      markedCount++;
      markedUsers.push({ id: user._id, name: user.name });

      // Send immediate in-app notification to the employee
      await createNotification(
        {
          recipient: user._id,
          type: 'attendance',
          title: 'Marked Absent (10:30 AM Cutoff) ❌',
          message: `Dear ${user.name}, you have been automatically marked absent today because no clock-in was recorded before the 10:30 AM cutoff.`,
          link: '/attendance',
          metadata: {
            autoAbsent: true,
            cutoff: '10:30 AM',
            date: start.toISOString().slice(0, 10),
          },
        },
        io
      );
    }

    // 3. Test user notification if manually triggered
    if (options.testUser && options.isTest) {
      await createNotification(
        {
          recipient: options.testUser._id,
          type: 'attendance',
          title: 'Auto-Absent Process Verified (10:30 AM)',
          message: `The 10:30 AM auto-absent cutoff executed successfully. ${markedCount} unclocked staff marked absent out of ${eligibleUsers.length} total.`,
          link: '/attendance',
          metadata: { isTest: true, markedCount },
        },
        io
      );
    }

    // 4. Notify managers and admins if any staff were marked absent
    if (markedCount > 0) {
      const managers = await User.find({
        role: { $in: ['superAdmin', 'admin', 'manager', 'organizationOwner'] },
        isActive: true,
      }).select('_id');

      const namesSummary =
        markedUsers.slice(0, 5).map((u) => u.name).join(', ') +
        (markedUsers.length > 5 ? ` +${markedUsers.length - 5} more` : '');

      for (const mgr of managers) {
        await createNotification(
          {
            recipient: mgr._id,
            type: 'attendance',
            title: 'Auto-Absent Daily Report (10:30 AM Cutoff)',
            message: `${markedCount} employee(s) were automatically marked absent today for missing the 10:30 AM cutoff: ${namesSummary}.`,
            link: '/attendance',
            metadata: {
              autoAbsentSummary: true,
              count: markedCount,
            },
          },
          io
        );
      }
    }

    console.log(`CRON: Auto-absent cutoff check completed. ${markedCount} employee(s) marked absent.`);
    return { markedCount, totalChecked: eligibleUsers.length, markedUsers };
  } catch (error) {
    console.error('CRON Error (Auto-Absent):', error);
    return { error: error.message };
  }
};

/**
 * Automatically record Sunday as a default weekly holiday for all active staff.
 * Scheduled to run every Sunday at 00:01 AM (1 0 * * 0).
 */
export const autoMarkSundayHolidays = async (io, options = {}) => {
  try {
    console.log('CRON: Ensuring default Sunday weekly holiday for staff...');

    const now = new Date();
    if (now.getDay() !== 0 && !options.isTest) {
      return { markedCount: 0, skipped: true, reason: 'Not Sunday' };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const eligibleUsers = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    }).select('_id name');

    let markedCount = 0;

    for (const user of eligibleUsers) {
      // Don't overwrite if employee already clocked in for special overtime work on Sunday
      const existing = await Attendance.findOne({
        user: user._id,
        date: { $gte: start, $lte: end },
      });

      if (
        existing &&
        (existing.clockIn || (existing.sessions && existing.sessions.length > 0) || existing.status === 'present')
      ) {
        continue;
      }

      await Attendance.findOneAndUpdate(
        { user: user._id, date: start },
        {
          $set: {
            status: 'holiday',
            requestedStatus: 'none',
            approvalStatus: 'approved',
            isApproved: true,
            notes: 'Sunday Weekly Holiday',
            totalHours: 0,
            sessions: [],
          },
        },
        { upsert: true, new: true }
      );
      markedCount++;
    }

    console.log(`CRON: Default Sunday weekly holiday recorded for ${markedCount} staff members.`);
    return { markedCount, totalChecked: eligibleUsers.length };
  } catch (error) {
    console.error('CRON Error (Sunday Holiday):', error);
    return { error: error.message };
  }
};

/**
 * Check and send evening reminders to employees between 6:00 PM and 6:30 PM:
 * 1. Clock out attendance (logout attendance)
 * 2. Submit EOD (End of Day) report
 * Scheduled 5 times: 6:00, 6:07, 6:15, 6:22, and 6:30 PM (18:00, 18:07, 18:15, 18:22, 18:30)
 */
export const checkAndSendEveningReminders = async (io, options = {}) => {
  try {
    console.log('CRON: Running 6:00 - 6:30 PM evening clock-out & EOD report check...');

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Find all active internal team members (all internal roles except client/referral)
    const eligibleUsers = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    }).select('_id name role email phone');

    if (!eligibleUsers.length) {
      console.log('CRON: No active eligible users found for evening reminders.');
      return { sentCount: 0, checkedCount: 0 };
    }

    // 2. Fetch today's attendance records for all users
    const todayAttendances = await Attendance.find({
      date: { $gte: start, $lte: end },
    }).select('user clockIn clockOut sessions status eodReport');

    const attendanceByUser = new Map();
    for (const att of todayAttendances) {
      attendanceByUser.set(att.user.toString(), att);
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let sentCount = 0;
    const remindersSent = [];
    const notifiedUserIds = new Set();

    for (const user of eligibleUsers) {
      const att = attendanceByUser.get(user._id.toString());

      // If user is on approved leave or holiday, skip
      if (att && ['leave', 'holiday'].includes(att.status)) {
        continue;
      }

      // Check if user clocked in today
      const hasClockedIn = Boolean(att?.clockIn || (att?.sessions && att.sessions.length > 0));

      // Check if user is still clocked in (open session or no clockOut)
      const hasOpenSession = att?.sessions && att.sessions.some((s) => !s.clockOut);
      const isStillClockedIn = hasClockedIn && (hasOpenSession || !att?.clockOut);

      // Check if EOD report is submitted
      const hasEodReport = Boolean(att?.eodReport?.submittedAt || att?.eodReport?.summary?.trim());

      // If both clock-out and EOD are satisfied, no reminder needed
      let needsClockOut = isStillClockedIn;
      let needsEod = !hasEodReport;

      if (!needsClockOut && !needsEod) {
        continue;
      }

      let title = '📋 Evening Reminder: Clock Out & EOD';
      let message = `Good evening ${user.name}! Please remember to submit your EOD report and clock out for today.`;

      if (needsClockOut && !needsEod) {
        title = '⏱️ Evening Reminder: Clock Out Attendance';
        message = `Good evening ${user.name}! Your shift is still active. Please remember to clock out.`;
      } else if (!needsClockOut && needsEod) {
        title = '📋 Evening Reminder: Submit EOD Report';
        message = `Good evening ${user.name}! You haven't submitted your EOD report today. Please submit it before wrapping up.`;
      }

      await createNotification({
        recipient: user._id,
        type: 'eod_clockout_reminder',
        title,
        message,
        link: '/attendance',
        metadata: {
          reminderType: 'evening_eod_clockout',
          date: start.toISOString().slice(0, 10),
          time: timeString,
          needsClockOut,
          needsEod,
        },
      }, io);

      notifiedUserIds.add(user._id.toString());
      sentCount++;
      remindersSent.push({
        userId: user._id,
        name: user.name,
        needsClockOut,
        needsEod,
      });
    }

    // 3. If options.testUser provided (manual trigger / test button), ensure caller ALWAYS receives EOD reminder
    if (options.testUser && !notifiedUserIds.has(options.testUser._id?.toString())) {
      const testUser = options.testUser;
      await createNotification({
        recipient: testUser._id,
        type: 'eod_clockout_reminder',
        title: '📋 Evening Reminder: Submit EOD & Clock Out (Verified)',
        message: `Good evening ${testUser.name}! Please remember to submit your daily EOD report and clock out for today.`,
        link: '/attendance',
        metadata: {
          reminderType: 'evening_eod_clockout_test',
          date: start.toISOString().slice(0, 10),
          time: timeString,
          needsClockOut: true,
          needsEod: true,
          isTest: true,
        },
      }, io);
      sentCount++;
      remindersSent.push({
        userId: testUser._id,
        name: testUser.name,
        needsClockOut: true,
        needsEod: true,
      });
    }

    console.log(`CRON: Evening reminders sent to ${sentCount} user(s).`);
    return { sentCount, totalChecked: eligibleUsers.length, remindersSent };
  } catch (error) {
    console.error('CRON Error (Evening Reminders):', error);
    return { error: error.message };
  }
};

export const initCronJobs = (io) => {
  console.log('Initializing cron jobs...');
  const cronTz = process.env.TZ || 'Asia/Kolkata';

  // Morning Attendance Reminders (Monday to Saturday):
  // 9:00 AM, 9:15 AM, 9:30 AM, 9:45 AM
  cron.schedule(
    '0,15,30,45 9 * * 1-6',
    async () => {
      await checkAndSendAttendanceReminders(io);
    },
    { timezone: cronTz }
  );

  // Reminders up to 10:30 AM morning (10:00, 10:15, 10:25, 10:30 AM)
  cron.schedule(
    '0,15,25,30 10 * * 1-6',
    async () => {
      await checkAndSendAttendanceReminders(io);
    },
    { timezone: cronTz }
  );

  // Automatic Cutoff at 10:31 AM: Auto-mark absent if failed to login/clock in by 10:30 AM
  cron.schedule(
    '31 10 * * 1-6',
    async () => {
      await autoMarkAbsentForUnclockedUsers(io);
    },
    { timezone: cronTz }
  );

  // Default Sunday Weekly Holiday: Runs every Sunday at 00:01 AM (skips unclocked staff on Sundays)
  cron.schedule(
    '1 0 * * 0',
    async () => {
      await autoMarkSundayHolidays(io);
    },
    { timezone: cronTz }
  );

  // Evening Clock-Out & EOD Report Reminders: 6:00 PM, 6:07 PM, 6:15 PM, 6:22 PM, 6:30 PM (5 times total)
  cron.schedule(
    '0,7,15,22,30 18 * * *',
    async () => {
      await checkAndSendEveningReminders(io);
    },
    { timezone: cronTz }
  );

  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('CRON: Checking for leads needing follow-up today...');

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const leadsToFollowUp = await Lead.find({
        followUpDate: { $gte: start, $lte: end },
        isConverted: false,
      }).populate('assignedTo', 'name email phone');

      for (const lead of leadsToFollowUp) {
        if (!lead.assignedTo) continue;

        await createNotification({
          recipient: lead.assignedTo._id,
          type: 'lead_assigned',
          title: 'Follow-up Reminder',
          message: `You have a scheduled follow-up with lead: ${lead.name} today.`,
          link: `/crm/leads/${lead._id}`,
        }, io);

        if (lead.assignedTo.phone) {
          await sendWhatsAppMessage(
            lead.assignedTo.phone,
            `Hello ${lead.assignedTo.name}, reminder to follow up with Lead: *${lead.name}* today.`
          );
        }
      }
    } catch (error) {
      console.error('CRON Error (Follow-ups):', error);
    }
  });

  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('CRON: Checking for tasks due today...');

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const tasksDueToday = await Task.find({
        dueDate: { $gte: start, $lte: end },
        status: { $ne: 'done' },
      }).populate('assignedTo', 'name phone');

      for (const task of tasksDueToday) {
        for (const user of task.assignedTo) {
          await createNotification({
            recipient: user._id,
            type: 'task_assigned',
            title: 'Task Deadline Today',
            message: `The task "${task.title}" is due today.`,
            link: '/tasks',
          }, io);

          if (user.phone) {
            await sendWhatsAppMessage(
              user.phone,
              `Reminder: Task *${task.title}* is due today.`
            );
          }
        }
      }
    } catch (error) {
      console.error('CRON Error (Task Deadlines):', error);
    }
  });

  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('CRON: Checking for overdue invoices...');
      const today = new Date();

      const overdueInvoices = await Invoice.find({
        dueDate: { $lt: today },
        status: { $nin: ['paid', 'cancelled'] },
      }).populate('client', 'name phone email');

      for (const invoice of overdueInvoices) {
        if (invoice.status !== 'overdue') {
          invoice.status = 'overdue';
          await invoice.save();
        }

        if (invoice.client?.phone) {
          await sendWhatsAppMessage(
            invoice.client.phone,
            `Dear ${invoice.client.name}, this is a gentle reminder that Invoice *${invoice.invoiceNumber}* for Rs.${invoice.total} is currently overdue. Please arrange payment at your earliest convenience.`
          );
        }
      }
    } catch (error) {
      console.error('CRON Error (Overdue Invoices):', error);
    }
  });

  cron.schedule('0 7 * * *', async () => {
    try {
      console.log('CRON: Checking for upcoming renewal expiries...');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const reminderEnd = new Date(todayStart);
      reminderEnd.setDate(reminderEnd.getDate() + 7);
      reminderEnd.setHours(23, 59, 59, 999);
      const reminderDateKey = todayStart.toISOString().slice(0, 10);

      await DomainRenewal.updateMany(
        { expiryDate: { $lt: todayStart }, status: { $in: ['active', 'pending'] } },
        { $set: { status: 'expired' } }
      );

      const expiringRecords = await DomainRenewal.find({
        expiryDate: { $gte: todayStart, $lte: reminderEnd },
        status: { $in: ['active', 'pending'] },
      }).populate('clientId', 'name company');

      for (const record of expiringRecords) {
        const recipients = await User.find({
          organizationId: record.organizationId,
          role: { $in: ['superAdmin', 'manager'] },
          isActive: true,
        }).select('_id');

        const daysLeft = Math.ceil((new Date(record.expiryDate).getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
        const clientName = record.clientId?.company || record.clientId?.name || 'No client';

        for (const recipient of recipients) {
          const existingNotification = await Notification.findOne({
            recipient: recipient._id,
            type: 'general',
            'metadata.domainRenewalId': record._id.toString(),
            'metadata.reminderDate': reminderDateKey,
          });

          if (existingNotification) continue;

          await createNotification({
            recipient: recipient._id,
            type: 'general',
            title: 'Renewal Expiry Reminder',
            message: `${record.itemName} for ${clientName} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
            link: '/domain-renewals',
            metadata: {
              domainRenewalId: record._id.toString(),
              reminderDate: reminderDateKey,
              daysLeft,
            },
          }, io);
        }
      }
    } catch (error) {
      console.error('CRON Error (Renewal Expiry):', error);
    }
  });

  // Daily Finance Reminders: Invoice Due Dates, Recurring Subscriptions, and Budget Thresholds
  cron.schedule('30 8 * * *', async () => {
    try {
      console.log('CRON: Checking Finance alerts and reminders...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = today.toISOString().slice(0, 10);

      // 1. Invoices reminders: 7 days before, on due date, 3 days overdue, weekly thereafter
      const activeInvoices = await Invoice.find({
        workflowStatus: 'issued',
        status: { $nin: ['paid', 'cancelled', 'void'] },
      }).populate('client', 'name phone email');

      for (const inv of activeInvoices) {
        if (!inv.dueDate) continue;
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let reminderType = null;
        let messageText = null;

        if (diffDays === 7) {
          reminderType = 'invoice_due_in_7_days';
          messageText = `Invoice #${inv.invoiceNumber} is due in 7 days (${inv.client?.name || 'Client'}).`;
        } else if (diffDays === 0) {
          reminderType = 'invoice_due_today';
          messageText = `Invoice #${inv.invoiceNumber} is due today (${inv.client?.name || 'Client'}).`;
        } else if (diffDays === -3) {
          reminderType = 'invoice_overdue_3_days';
          messageText = `Invoice #${inv.invoiceNumber} is 3 days overdue (${inv.client?.name || 'Client'}).`;
        } else if (diffDays < -3 && Math.abs(diffDays) % 7 === 0) {
          reminderType = `invoice_overdue_${Math.abs(diffDays)}_days`;
          messageText = `Invoice #${inv.invoiceNumber} is ${Math.abs(diffDays)} days overdue (${inv.client?.name || 'Client'}).`;
        }

        if (reminderType) {
          const managers = await User.find({
            organizationId: inv.organizationId,
            role: { $in: ['superAdmin', 'manager', 'financeManager'] },
            isActive: true,
          }).select('_id');

          for (const mgr of managers) {
            const alreadySent = await Notification.findOne({
              recipient: mgr._id,
              'metadata.invoiceId': inv._id.toString(),
              'metadata.reminderType': reminderType,
              'metadata.reminderDate': todayKey,
            });
            if (alreadySent) continue;

            await createNotification({
              recipient: mgr._id,
              type: 'general',
              title: 'Invoice Due Reminder',
              message: messageText,
              link: '/finance/invoices',
              metadata: {
                invoiceId: inv._id.toString(),
                reminderType,
                reminderDate: todayKey,
              },
            }, io);
          }
        }
      }

      // 2. Subscription renewals within lead days
      const activeSubs = await Subscription.find({ status: 'active' });
      for (const sub of activeSubs) {
        if (!sub.nextRenewalDate) continue;
        const leadDays = sub.reminderLeadDays || 5;
        const renewalDate = new Date(sub.nextRenewalDate);
        renewalDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft >= 0 && daysLeft <= leadDays) {
          const managers = await User.find({
            organizationId: sub.organizationId,
            role: { $in: ['superAdmin', 'manager', 'financeManager'] },
            isActive: true,
          }).select('_id');

          for (const mgr of managers) {
            const alreadySent = await Notification.findOne({
              recipient: mgr._id,
              'metadata.subscriptionId': sub._id.toString(),
              'metadata.reminderDate': todayKey,
            });
            if (alreadySent) continue;

            await createNotification({
              recipient: mgr._id,
              type: 'general',
              title: 'Subscription Renewal Alert',
              message: `Recurring subscription for "${sub.serviceName}" is renewing in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
              link: '/finance/forecast-reports',
              metadata: {
                subscriptionId: sub._id.toString(),
                reminderDate: todayKey,
              },
            }, io);
          }
        }
      }

      // 3. Budget threshold warnings (spent >= 80% of limit)
      const currentMonthKey = today.toISOString().slice(0, 7);
      const budgets = await FinanceBudget.find({ period: currentMonthKey });
      for (const b of budgets) {
        if (b.limitAmount > 0 && (b.spentAmount / b.limitAmount) >= 0.8) {
          const pct = Math.round((b.spentAmount / b.limitAmount) * 100);
          const managers = await User.find({
            organizationId: b.organizationId,
            role: { $in: ['superAdmin', 'manager', 'financeManager'] },
            isActive: true,
          }).select('_id');

          for (const mgr of managers) {
            const alreadySent = await Notification.findOne({
              recipient: mgr._id,
              'metadata.budgetId': b._id.toString(),
              'metadata.reminderDate': todayKey,
            });
            if (alreadySent) continue;

            await createNotification({
              recipient: mgr._id,
              type: 'general',
              title: 'Budget Alert',
              message: `Budget for "${b.category}" has reached ${pct}% of its limit (₹${b.spentAmount.toLocaleString('en-IN')} / ₹${b.limitAmount.toLocaleString('en-IN')}).`,
              link: '/finance/settings',
              metadata: {
                budgetId: b._id.toString(),
                reminderDate: todayKey,
              },
            }, io);
          }
        }
      }

      // 4. Loan EMI reminders (notifies 2 days before due date & on due date)
      await checkAndSendLoanReminders(io);
    } catch (err) {
      console.error('CRON Error (Finance Reminders):', err);
    }
  }, { timezone: cronTz });

  // 5. Active Task Completion Timers: Check every minute for overdue tasks
  cron.schedule('* * * * *', async () => {
    try {
      await checkOverdueTaskTimers(io);
    } catch (err) {
      console.error('CRON Error (Overdue Tasks Timer):', err);
    }
  }, { timezone: cronTz });

  console.log('Cron jobs initialized.');
};

/**
 * Check active task completion timers and flag overdue tasks.
 * Sends notifications to employee and manager when timer expires.
 */
export const checkOverdueTaskTimers = async (io) => {
  try {
    const now = new Date();
    const overdueTasks = await Task.find({
      isAccepted: true,
      isOverdue: false,
      timerExpiresAt: { $ne: null, $lt: now },
      status: { $nin: ['completed', 'done', 'approved', 'rejected'] },
    }).populate('assignedTo', 'name email phone').populate('assignedManager', 'name email phone');

    for (const task of overdueTasks) {
      task.isOverdue = true;
      task.overdueAt = now;
      task.overdueNotified = true;

      const allocatedStr = `${task.allocatedHours || 0}h ${task.allocatedMinutes || 0}m`;
      const deadlineStr = task.timerExpiresAt
        ? new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'target time';

      task.taskNotes = task.taskNotes || [];
      task.taskNotes.push({
        content: `🚨 [OVERDUE ALERT] Completion timer expired at ${deadlineStr} (Allocated: ${allocatedStr}). Marked as OVERDUE. Submission with reason required.`,
        authorName: 'System / Timer',
        createdAt: now,
      });

      await task.save();

      const recipients = [];
      if (Array.isArray(task.assignedTo)) {
        recipients.push(...task.assignedTo.map((u) => u._id));
      }
      if (task.assignedManager) {
        recipients.push(task.assignedManager._id || task.assignedManager);
      }
      if (task.createdBy) {
        recipients.push(task.createdBy);
      }

      const uniqueRecipients = [...new Set(recipients.map((id) => id.toString()))];

      for (const recipientId of uniqueRecipients) {
        await createNotification({
          recipient: recipientId,
          type: 'task_overdue',
          title: `🚨 Task Overdue: "${task.title}"`,
          message: `Timer expired for task "${task.title}". The allocated time of ${allocatedStr} has elapsed. Please submit with a reason.`,
          link: `/tasks?open=${task._id}`,
          metadata: {
            taskId: task._id,
            allocatedHours: task.allocatedHours,
            allocatedMinutes: task.allocatedMinutes,
            timerExpiresAt: task.timerExpiresAt,
          },
        }, io);
      }

      if (io) {
        io.emit?.('taskUpdated', {
          taskId: task._id,
          isOverdue: true,
          overdueAt: now,
        });
      }
    }
  } catch (error) {
    console.error('CRON Error (checkOverdueTaskTimers):', error.message);
  }
};

/**
 * Check and send loan EMI reminders:
 * Reminds managers/admins in notifications 2 days before payment date (and on due date).
 */
export const checkAndSendLoanReminders = async (io) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);

    const activeLoans = await Loan.find({ status: 'active' });
    let sentCount = 0;

    for (const loan of activeLoans) {
      if (!loan.nextPaymentDate) continue;

      const dueDate = new Date(loan.nextPaymentDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Trigger reminder 2 days before due date (diffDays === 2) and on due date (diffDays === 0)
      if (diffDays === 2 || diffDays === 0) {
        const reminderType = diffDays === 2 ? 'loan_emi_due_2_days' : 'loan_emi_due_today';
        const title = diffDays === 2
          ? `💳 Loan EMI Due in 2 Days: ${loan.loanName}`
          : `💳 Loan EMI Due Today: ${loan.loanName}`;

        const formattedDueDate = dueDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const emiDisplay = loan.emiAmount ? `₹${Number(loan.emiAmount).toLocaleString('en-IN')}` : 'EMI';
        const message = diffDays === 2
          ? `Upcoming EMI of ${emiDisplay} for ${loan.lender || 'Lender'} (${loan.loanName}) is due in 2 days on ${formattedDueDate}.`
          : `Loan EMI of ${emiDisplay} for ${loan.lender || 'Lender'} (${loan.loanName}) is due today!`;

        const managers = await User.find({
          ...(loan.organizationId ? { organizationId: loan.organizationId } : {}),
          role: { $in: ['superAdmin', 'admin', 'manager', 'financeManager', 'organizationOwner'] },
          isActive: true,
        }).select('_id');

        for (const mgr of managers) {
          const alreadySent = await Notification.findOne({
            recipient: mgr._id,
            'metadata.loanId': loan._id.toString(),
            'metadata.reminderType': reminderType,
            'metadata.reminderDate': todayKey,
          });

          if (alreadySent) continue;

          await createNotification(
            {
              recipient: mgr._id,
              type: 'general',
              title,
              message,
              link: '/finance?tab=loans',
              metadata: {
                loanId: loan._id.toString(),
                reminderType,
                reminderDate: todayKey,
                diffDays,
              },
            },
            io
          );
          sentCount++;
        }
      }
    }

    if (sentCount > 0) {
      console.log(`CRON: Loan EMI reminders dispatched to ${sentCount} recipient(s).`);
    }
    return { sentCount, totalActiveChecked: activeLoans.length };
  } catch (error) {
    console.error('CRON Error (Loan Reminders):', error);
    return { error: error.message };
  }
};
