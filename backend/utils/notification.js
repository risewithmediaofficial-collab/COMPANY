// =============================================
// NOTIFICATION UTILITY
// =============================================

import Notification from '../models/notification.model.js';

export const createNotification = async ({ recipient, sender, type, title, message, link, metadata }, io) => {
  try {
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

    return notification;
  } catch (error) {
    console.error('❌ Notification creation failed:', error.message);
  }
};
