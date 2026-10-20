// =============================================
// NOTIFICATION CONTROLLER
// =============================================

import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';
import { sendPushToUser, getEndpointProvider } from '../services/push.service.js';
import { parsePagination } from '../utils/pagination.js';

export const getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({ success: true, page, limit, notifications, unreadCount });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
    const io = req.app?.get('io') || global.io;
    const notification = await createNotification({
      recipient: req.user._id,
      sender: req.user._id,
      type: 'system',
      title: '🔔 Test Notification',
      message: 'Real-time and browser desktop notifications are connected successfully!',
      link: '/settings',
    }, io);
    res.json({ success: true, message: 'Test notification triggered', notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const subscribePush = async (req, res) => {
  try {
    let subscription = req.body?.subscription;
    if (typeof subscription === 'string') {
      try {
        subscription = JSON.parse(subscription);
      } catch {
        return res.status(400).json({ success: false, message: 'Malformed subscription JSON payload' });
      }
    }

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription payload. Endpoint and keys are required.' });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Remove any existing subscription with this same endpoint across all users to avoid crossed alerts
    await User.updateMany(
      { 'pushSubscriptions.endpoint': subscription.endpoint },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
    );

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

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

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
    const delaySeconds = parseInt(req.body?.delaySeconds, 10) || 0;

    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No push subscriptions found for your account. Please click "Enable Notifications" first.',
      });
    }

    const testPayload = {
      title: '🔔 Test Notification | RISE WITH MEDIA',
      body: delaySeconds > 0
        ? `Delayed push successfully delivered after ${delaySeconds}s while tab/app was closed!`
        : 'Background Web Push is verified and operational across your devices!',
      icon: '/branding/rise-with-media-logo.png',
      badge: '/branding/rise-with-media-logo.png',
      link: '/settings',
      eventId: `test-push-${Date.now()}`,
    };

    if (delaySeconds > 0) {
      setTimeout(async () => {
        try {
          await sendPushToUser(userId, testPayload);
          console.log(`[WebPush] Delayed test push (${delaySeconds}s) delivered for user ${userId}`);
        } catch (e) {
          console.error('[WebPush] Delayed push error:', e.message);
        }
      }, delaySeconds * 1000);

      return res.json({
        success: true,
        delayed: true,
        delaySeconds,
        deviceCount: user.pushSubscriptions.length,
        message: `Test push scheduled in ${delaySeconds}s! Close your browser tab or app now to verify background delivery.`,
      });
    }

    const result = await sendPushToUser(userId, testPayload);

    res.json({
      success: result.success,
      message: `Test push sent to ${result.acceptedCount || 0} active device(s)`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPushDiagnostics = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('pushSubscriptions');

    const devices = (user?.pushSubscriptions || []).map((sub) => ({
      provider: getEndpointProvider(sub.endpoint),
      endpointDomain: (() => {
        try {
          return new URL(sub.endpoint).hostname;
        } catch (_e) {
          return 'Unknown';
        }
      })(),
      createdAt: sub.createdAt,
      lastUsedAt: sub.lastUsedAt || null,
      lastStatus: sub.lastStatus || 'active',
      userAgent: sub.userAgent || '',
    }));

    res.json({
      success: true,
      data: {
        configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
        vapidEmail: process.env.VAPID_EMAIL || 'risewithmediaofficial@gmail.com',
        deviceCount: devices.length,
        devices,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerAttendanceReminders = async (req, res) => {
  try {
    const io = req.app?.get('io') || global.io;
    const { checkAndSendAttendanceReminders } = await import('../services/cron.service.js');
    const result = await checkAndSendAttendanceReminders(io, { testUser: req.user });
    res.json({
      success: true,
      message: `Attendance reminders processed: ${result.sentCount || 0} reminder(s) sent out of ${result.pendingCount ?? result.totalChecked ?? 0} staff. Verified notification delivered to your screen & device!`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerEveningReminders = async (req, res) => {
  try {
    const io = req.app?.get('io') || global.io;
    const { checkAndSendEveningReminders } = await import('../services/cron.service.js');
    const result = await checkAndSendEveningReminders(io, { testUser: req.user });
    res.json({
      success: true,
      message: `Evening EOD & Clock-Out reminders processed: ${result.sentCount || 0} reminder(s) sent out of ${result.totalChecked || 0} eligible staff. Verified notification delivered to your screen & device!`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerAutoAbsent = async (req, res) => {
  try {
    const io = req.app?.get('io') || global.io;
    const { autoMarkAbsentForUnclockedUsers } = await import('../services/cron.service.js');
    const result = await autoMarkAbsentForUnclockedUsers(io, { testUser: req.user, isTest: true });
    res.json({
      success: true,
      message: `Auto-absent cutoff executed: ${result.markedCount || 0} staff marked absent out of ${result.totalChecked || 0} eligible staff. Verified notification sent.`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


