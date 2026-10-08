// =============================================
// NOTIFICATION CONTROLLER
// =============================================

import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';
import { sendPushToUser } from '../services/push.service.js';

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    const notification = await createNotification({
      recipient: req.user._id,
      sender: req.user._id,
      type: 'system',
      title: '🔔 Test Notification',
      message: 'Real-time and browser desktop notifications are connected successfully!',
      link: '/settings',
    });
    res.json({ success: true, message: 'Test notification triggered', notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription payload. Endpoint and keys are required.' });
    }

    const userId = req.user._id;

    // Remove any existing subscription with this same endpoint to avoid duplicates
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: subscription.endpoint } },
    });

    // Add updated subscription record
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime || null,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
            userAgent: req.headers['user-agent'] || '',
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Push subscription registered successfully',
      deviceCount: updatedUser.pushSubscriptions?.length || 1,
    });
  } catch (error) {
    console.error('Error registering push subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    if (endpoint) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint } },
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        $set: { pushSubscriptions: [] },
      });
    }

    res.json({ success: true, message: 'Push subscription removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendTestPushNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await sendPushToUser(userId, {
      title: '🔔 Test Web Push Notification',
      body: 'Browser Web Push is working seamlessly with VAPID keys!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      link: '/settings',
      eventId: `test-push-${Date.now()}`,
    });

    if (!result.success && result.reason === 'No subscriptions found for user') {
      return res.status(404).json({
        success: false,
        message: 'No push subscriptions found for your account. Please click "Enable Notifications" first.',
      });
    }

    res.json({
      success: true,
      message: `Test push sent to ${result.deliveredCount || 0} active device(s)`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
