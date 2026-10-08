// =============================================
// WEB PUSH NOTIFICATION SERVICE (VAPID)
// Supports Android, Windows, macOS, and iOS PWA
// =============================================
import webpush from 'web-push';
import User from '../models/user.model.js';
import { loadEnv } from '../config/env.js';

let isConfigured = false;

/**
 * Initialize web-push with VAPID credentials
 */
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

// Initialize on module load
initWebPush();

/**
 * Helper to identify the push service provider from the endpoint URL (for logs/diagnostics)
 */
export const getEndpointProvider = (endpoint = '') => {
  if (!endpoint) return 'Unknown';
  if (endpoint.includes('fcm.googleapis.com')) return 'Google FCM (Android / Chrome)';
  if (endpoint.includes('push.apple.com')) return 'Apple APNs (iPhone / iPad / Safari)';
  if (endpoint.includes('notify.windows.com')) return 'Microsoft WNS (Windows / Edge)';
  if (endpoint.includes('mozilla.com')) return 'Mozilla Autopush (Firefox)';
  try {
    return new URL(endpoint).hostname;
  } catch (_e) {
    return 'WebPush Gateway';
  }
};

/**
 * Send push notification to a single subscription with bounded exponential backoff
 */
const sendPushWithRetry = async (subscription, payloadString, options, maxRetries = 3) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await webpush.sendNotification(subscription, payloadString, options);
      return {
        success: true,
        statusCode: response.statusCode || 201,
        endpoint: subscription.endpoint,
        attempt: attempt + 1,
      };
    } catch (err) {
      const statusCode = err.statusCode || 0;

      // 404 Not Found or 410 Gone = subscription has expired or unregistered
      if (statusCode === 404 || statusCode === 410) {
        return {
          success: false,
          expired: true,
          statusCode,
          endpoint: subscription.endpoint,
          error: 'Subscription expired or unregistered',
        };
      }

      // Check if non-retryable client error (e.g. 400 Bad Request, 401 Unauthorized)
      if (statusCode >= 400 && statusCode < 429) {
        return {
          success: false,
          expired: false,
          statusCode,
          endpoint: subscription.endpoint,
          error: err.message,
        };
      }

      attempt++;

      if (attempt >= maxRetries) {
        return {
          success: false,
          expired: false,
          statusCode,
          endpoint: subscription.endpoint,
          error: `Failed after ${maxRetries} attempts: ${err.message}`,
        };
      }

      // Determine retry delay: respect Retry-After header or exponential backoff
      let delayMs = 1000 * Math.pow(2, attempt);
      const retryAfterHeader = err.headers?.['retry-after'];
      if (retryAfterHeader) {
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
          delayMs = Math.min(parsedSeconds * 1000, 10000);
        }
      }
      delayMs = Math.min(delayMs, 8000);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Send Web Push notification to all subscribed devices of a user
 * Fully durable: does NOT require an active React session or Socket.IO connection.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {object} payload - { title, body, message, link, url, icon, badge, eventId, topic }
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

    const title = payload.title || '🔔 RISE WITH MEDIA Alert';
    const body = payload.body || payload.message || 'You have a new update in your CRM workspace.';
    const link = payload.link || payload.url || '/';
    const eventId = payload.eventId || payload.id || `notif-${Date.now()}`;
    const icon = payload.icon || '/branding/rise-with-media-logo.png';
    const badge = payload.badge || '/branding/rise-with-media-logo.png';

    const pushPayload = JSON.stringify({
      title,
      body,
      icon,
      badge,
      link,
      url: link,
      eventId,
      timestamp: Date.now(),
    });

    // RFC 8030 Web Push Protocol headers:
    // TTL = 86400 (24 hours): Holds message at APNs/FCM gateway if device is asleep or screen off
    // Urgency = high: Direct real-time wakeup for mobile devices
    const pushOptions = {
      TTL: 86400,
      urgency: 'high',
      topic: (payload.topic || 'crm-alert').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32),
      headers: {
        Urgency: 'high',
      },
    };

    const staleEndpoints = [];
    const successfulEndpoints = [];

    const deliveryPromises = user.pushSubscriptions.map(async (sub) => {
      const subscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      const result = await sendPushWithRetry(subscriptionObj, pushPayload, pushOptions, 3);

      if (result.expired) {
        staleEndpoints.push(sub.endpoint);
      } else if (result.success) {
        successfulEndpoints.push(sub.endpoint);
      } else {
        console.warn(`[WebPush] Failed for ${getEndpointProvider(sub.endpoint)}:`, result.error);
      }

      return result;
    });

    const results = await Promise.all(deliveryPromises);

    // Auto-prune expired (404/410) subscriptions from database
    if (staleEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: { endpoint: { $in: staleEndpoints } },
        },
      });
      console.log(`[WebPush] Removed ${staleEndpoints.length} expired subscription(s) for user ${userId}`);
    }

    // Record last push timestamp on user model for diagnostics
    if (successfulEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'pushSubscriptions.$[elem].lastUsedAt': new Date(),
          'pushSubscriptions.$[elem].lastStatus': 'accepted',
        },
      }, {
        arrayFilters: [{ 'elem.endpoint': { $in: successfulEndpoints } }],
      }).catch(() => {});
    }

    const acceptedCount = results.filter((r) => r.success).length;
    return {
      success: acceptedCount > 0,
      acceptedCount,
      totalDevices: user.pushSubscriptions.length,
      results: results.map((r) => ({
        provider: getEndpointProvider(r.endpoint),
        status: r.success ? 'accepted' : r.expired ? 'expired' : 'failed',
        statusCode: r.statusCode,
      })),
    };
  } catch (error) {
    console.error('[WebPush] Error in sendPushToUser:', error.message);
    return { success: false, error: error.message };
  }
};

export default {
  initWebPush,
  sendPushToUser,
  getEndpointProvider,
};
