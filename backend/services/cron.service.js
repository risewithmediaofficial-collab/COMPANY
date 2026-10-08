import cron from 'node-cron';
import Attendance from '../models/attendance.model.js';
import DomainRenewal from '../models/domainRenewal.model.js';
import Invoice from '../models/invoice.model.js';
import Lead from '../models/lead.model.js';
import Notification from '../models/notification.model.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';
import { sendWhatsAppMessage } from './whatsapp.service.js';

/**
 * Check and send morning attendance reminders to employees who have not clocked in
 * Scheduled 5 times between 9:00 AM and 9:30 AM (9:00, 9:07, 9:15, 9:22, 9:30 AM)
 */
export const checkAndSendAttendanceReminders = async (io) => {
  try {
    console.log('CRON: Running 9:00 - 9:30 AM attendance reminder check...');

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Find all active employees, staff, managers
    const eligibleUsers = await User.find({
      isActive: true,
      role: { $in: ['employee', 'staff', 'manager', 'accountManager', 'editor', 'scriptWriter', 'videographer'] },
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

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let sentCount = 0;
    for (const user of pendingUsers) {
      await createNotification({
        recipient: user._id,
        type: 'attendance_reminder',
        title: '⏰ Attendance Reminder',
        message: `Good morning ${user.name}! You haven't marked attendance today (${timeString}). Please clock in before 9:30 AM.`,
        link: '/attendance',
        metadata: {
          reminderType: 'morning_attendance',
          date: start.toISOString().slice(0, 10),
          time: timeString,
        },
      }, io);

      sentCount++;
    }

    return { sentCount, pendingCount: pendingUsers.length, totalChecked: eligibleUsers.length };
  } catch (error) {
    console.error('CRON Error (Attendance Reminders):', error);
    return { error: error.message };
  }
};

export const initCronJobs = (io) => {
  console.log('Initializing cron jobs...');

  // Morning Attendance Reminders: 9:00 AM, 9:07 AM, 9:15 AM, 9:22 AM, 9:30 AM (5 times total)
  cron.schedule('0,7,15,22,30 9 * * *', async () => {
    await checkAndSendAttendanceReminders(io);
  });

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

  console.log('Cron jobs initialized.');
};
