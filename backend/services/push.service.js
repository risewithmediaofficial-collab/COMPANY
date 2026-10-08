// =============================================
// WEB PUSH NOTIFICATION SERVICE
// =============================================
import webpush from 'web-push';
import User from '../models/user.model.js';
import { loadEnv } from '../config/env.js';

let isConfigured = false;

export const initWebPush = () => {
  loadEnv();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  let rawEmail = process.env.VAPID_EMAIL || 'risewithmediaofficial@gmail.com';
  const email = rawEmail.startsWith('mailto:') || rawEmail.startsWith('https://') 
    ? rawEmail 
    : `mailto:${rawEmail}`;

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(email, publicKey, privateKey);
      isConfigured = true;
      console.log('✅ Web Push initialized with VAPID keys');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize Web Push VAPID details:', err.message);
      return false;
    }
  } else {
    console.warn('⚠️ Web Push VAPID keys missing in environment variables');
    return false;
  }
};

// Initialize immediately upon loading
initWebPush();

/**
 * Send Web Push notification to all subscribed devices of a user
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {object} payload - { title, body, icon, badge, link, eventId }
 */
export const sendPushToUser = async (userId, payload = {}) => {
  if (!userId) return { success: false, reason: 'Missing userId' };

  if (!isConfigured) {
    initWebPush();
    if (!isConfigured) {
      return { success: false, reason: 'Web push is not configured' };
    }
  }

  try {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return { success: false, reason: 'No subscriptions found for user' };
    }

    const pushPayload = JSON.stringify({
      title: payload.title || 'Agency CRM Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      link: payload.link || payload.url || '/',
      url: payload.link || payload.url || '/',
      eventId: payload.eventId || payload.id || `notif-${Date.now()}`,
      timestamp: Date.now(),
    });

    const staleEndpoints = [];

    const results = await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          };
          return await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (err) {
          // HTTP 404 or 410 indicates expired or unregistered subscription
          if (err.statusCode === 404 || err.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error(`[WebPush] Failed for endpoint ${sub.endpoint?.slice(0, 35)}...:`, err.message);
          }
          throw err;
        }
      })
    );

    // Remove expired or unsubscribed endpoints
    if (staleEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: { endpoint: { $in: staleEndpoints } },
        },
      });
      console.log(`[WebPush] Removed ${staleEndpoints.length} expired subscription(s) for user ${userId}`);
    }

    const deliveredCount = results.filter((r) => r.status === 'fulfilled').length;
    return { success: true, deliveredCount, total: user.pushSubscriptions.length };
  } catch (error) {
    console.error('[WebPush] Error in sendPushToUser:', error.message);
    return { success: false, error: error.message };
  }
};

export default {
  initWebPush,
  sendPushToUser,
};
