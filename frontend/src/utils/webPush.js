import api from '../api';
import { toast } from 'sonner';

/**
 * Convert a URL-safe base64 string to a Uint8Array for PushManager applicationServerKey
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser supports ServiceWorker, PushManager, and Notification
 */
export const isWebPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Get current browser notification permission: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export const getWebPushPermission = () => {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Get the active service worker registration (reuses existing or registers /sw.js)
 */
export const getServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker is not supported in this browser.');
  }

  let reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) {
    reg = await navigator.serviceWorker.getRegistration();
  }
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  await navigator.serviceWorker.ready;
  return reg;
};

/**
 * Check if the browser already has an active push subscription
 */
export const getExistingPushSubscription = async () => {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await getServiceWorkerRegistration();
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('Error checking existing push subscription:', err);
    return null;
  }
};

/**
 * Subscribe to Web Push notifications using VAPID public key
 * Reuses existing subscription if already available, otherwise subscribes
 */
export const subscribeToWebPush = async () => {
  if (!isWebPushSupported()) {
    toast.error('Browser push notifications are not supported in this browser.');
    return { success: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'denied') {
    toast.error('Notification permission is blocked. Click the lock/settings icon near your address bar to allow notifications.');
    return { success: false, reason: 'denied' };
  }

  if (permission === 'default') {
    permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission was not granted.');
      return { success: false, reason: permission };
    }
  }

  const vapidPublicKey =
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    'BKwkgrewQmAAflMVBGwXiK-MRe6MbZl6DNxH18aOwIU-mNTukiW3hLOTGcxdplps7T8NlcteaEVar_5zP6KlYMs';

  if (!vapidPublicKey) {
    toast.error('VAPID public key is missing from environment configuration.');
    return { success: false, reason: 'missing_vapid_key' };
  }

  try {
    const reg = await getServiceWorkerRegistration();

    // Reuse existing subscription if already available
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // Persist subscription in database for authenticated user
    const response = await api.post('/notifications/subscribe', {
      subscription: subscription.toJSON(),
    });

    toast.success('Web Push notifications enabled successfully!');
    return { success: true, subscription, data: response.data };
  } catch (err) {
    console.error('Failed to subscribe to Web Push:', err);
    toast.error(`Failed to enable push notifications: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Unsubscribe from Web Push notifications and remove endpoint from backend
 */
export const unsubscribeFromWebPush = async () => {
  if (!isWebPushSupported()) return { success: false };

  try {
    const reg = await getServiceWorkerRegistration();
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      await api.post('/notifications/unsubscribe', {
        endpoint: subscription.endpoint,
      }).catch((e) => console.warn('Backend unsubscribe failed:', e.message));

      await subscription.unsubscribe();
    } else {
      await api.post('/notifications/unsubscribe', {}).catch(() => {});
    }

    toast.info('Push notifications disabled on this device.');
    return { success: true };
  } catch (err) {
    console.error('Failed to unsubscribe from Web Push:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Trigger a protected test action that sends a notification only to currently authenticated user
 */
export const sendTestPushNotification = async () => {
  try {
    const res = await api.post('/notifications/test-push');
    toast.success(res.data?.message || 'Test push notification sent! Check your system notifications.');
    return res.data;
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to send test push notification');
    throw err;
  }
};
