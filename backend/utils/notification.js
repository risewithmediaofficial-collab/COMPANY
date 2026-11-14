// =============================================
// NOTIFICATION UTILITY
// =============================================

import Notification from '../models/notification.model.js';
import { sendPushToUser } from '../services/push.service.js';

export const createNotification = async ({ recipient, sender, type, title, message, link, metadata }, io) => {
  try {
    // Super Admin & Organization Owner do not need attendance login or cutoff notifications
    const isAttendanceOrCutoff =
      ['attendance_reminder', 'eod_clockout_reminder', 'clockout_reminder', 'eod_reminder'].includes(type) ||
      metadata?.autoAbsent ||
      metadata?.cutoff ||
      metadata?.reminderType === 'morning_attendance' ||
      /cutoff|clock in|marked absent/i.test(String(title || '')) ||
      /cutoff|clock in|marked absent/i.test(String(message || ''));

    if (isAttendanceOrCutoff && recipient) {
      const User = (await import('../models/user.model.js')).default;
      const targetUser = await User.findById(recipient).select('role').lean();
      if (targetUser && ['superAdmin', 'organizationOwner'].includes(targetUser.role)) {
        return null;
      }
    }

    const notification = await Notification.create({ recipient, sender, type, title, message, link, metadata });

    // Emit real-time notification via Socket.io
    const socketIo = io || global.io;
    if (socketIo && typeof socketIo.sendToUser === 'function') {
      socketIo.sendToUser(recipient.toString(), 'newNotification', {
        _id: notification._id,
        type,
        title,
        message,
        link,
        metadata,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    // Deliver native browser Web Push notification for background/closed tab
    sendPushToUser(recipient, {
      title: title || 'New CRM Notification',
      body: message || '',
      icon: '/branding/rise-with-media-logo.png',
      badge: '/branding/rise-with-media-logo.png',
      link: link || '/',
      eventId: notification._id?.toString(),
    }).catch((pushErr) => {
      console.warn('Web push delivery skipped/failed:', pushErr.message);
    });

    return notification;
  } catch (error) {
    console.error('❌ Notification creation failed:', error.message);
  }
};
