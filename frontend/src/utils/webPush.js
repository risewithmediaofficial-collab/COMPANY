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
 * Check if the current browser environment supports native Web Push
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
 * Check if running on iOS (iPhone / iPad)
 */
export const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

/**
 * Check if running as an installed standalone PWA
 */
export const isStandalonePWA = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
};

/**
 * Check if current device is iOS and requires 'Add to Home Screen' before Web Push is possible
 * (Apple iOS 16.4+ only enables PushManager for Home Screen web apps)
 */
export const isIOSRequiresHomeInstall = () => {
  return isIOSDevice() && !isStandalonePWA();
};

/**
 * Get current browser notification permission: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export const getWebPushPermission = () => {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Get the active service worker registration (scope: /)
 */
export const getServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker is not supported in this browser.');
  }

  let reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) {
    reg = await navigator.serviceWorker.getRegistration();
  }
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Wait until the service worker is active and controlling
  await navigator.serviceWorker.ready;
  return reg;
};

/**
 * Get the current active PushSubscription from the service worker
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
 * Check if an existing subscription matches the configured VAPID public key
 */
const doesKeyMatch = (subscription, expectedPublicKey) => {
  if (!subscription || !subscription.options || !subscription.options.applicationServerKey) {
    return true; // Cannot determine, assume valid
  }
  try {
    const currentKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
    const expectedKeyBytes = urlBase64ToUint8Array(expectedPublicKey);
    if (currentKeyBytes.length !== expectedKeyBytes.length) return false;
    for (let i = 0; i < currentKeyBytes.length; i++) {
      if (currentKeyBytes[i] !== expectedKeyBytes[i]) return false;
    }
    return true;
  } catch (_e) {
    return true;
  }
};

/**
 * Get the configured VAPID public key from environment
 */
export const getVapidPublicKey = () => {
  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    'BKwkgrewQmAAflMVBGwXiK-MRe6MbZl6DNxH18aOwIU-mNTukiW3hLOTGcxdplps7T8NlcteaEVar_5zP6KlYMs'
  );
};

/**
 * Subscribe to Web Push notifications using VAPID public key
 * Request permission ONLY on explicit user gesture
 */
export const subscribeToWebPush = async () => {
  if (isIOSRequiresHomeInstall()) {
    toast.info('iPhone/iPad Setup Required', {
      description: 'Tap Share (square with arrow) at the bottom of Safari, tap "Add to Home Screen", then open RiseWithMedia from your Home Screen to enable notifications.',
      duration: 8000,
    });
    return { success: false, reason: 'ios_install_required' };
  }

  if (!isWebPushSupported()) {
    toast.error('Browser push notifications are not supported in this browser.');
    return { success: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'denied') {
    toast.error('Notifications are blocked by your browser.', {
      description: 'Click the tune/lock icon in your URL address bar to change Notification permissions to "Allow".',
      duration: 6000,
    });
    return { success: false, reason: 'denied' };
  }

  if (permission === 'default') {
    permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission was not granted.');
      return { success: false, reason: permission };
    }
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    toast.error('VAPID public key is missing from environment configuration.');
    return { success: false, reason: 'missing_vapid_key' };
  }

  try {
    const reg = await getServiceWorkerRegistration();
    let subscription = await reg.pushManager.getSubscription();

    // If existing subscription was registered with a different key, unsubscribe first
    if (subscription && !doesKeyMatch(subscription, vapidPublicKey)) {
      console.log('[WebPush] VAPID key changed, resubscribing device...');
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }

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

    toast.success('Push notifications active on this device!', {
      description: 'You will receive alerts even when the website or PWA is closed.',
    });
    return { success: true, subscription, data: response.data };
  } catch (err) {
    console.error('Failed to subscribe to Web Push:', err);
    toast.error(`Failed to enable push notifications: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Reconcile subscription on app launch / login
 * Silently syncs existing subscription with backend if permission was already granted
 */
export const reconcilePushSubscription = async () => {
  if (!isWebPushSupported()) return { success: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { success: false, reason: 'not_granted' };

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { success: false, reason: 'missing_key' };

  try {
    const reg = await getServiceWorkerRegistration();
    let subscription = await reg.pushManager.getSubscription();

    if (subscription && !doesKeyMatch(subscription, vapidPublicKey)) {
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (subscription) {
      await api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });
      return { success: true, subscription };
    }
  } catch (err) {
    console.warn('[WebPush] Background reconciliation notice:', err.message);
  }
  return { success: false };
};

/**
 * Unsubscribe from Web Push notifications and unbind device from backend
 */
export const unsubscribeFromWebPush = async () => {
  if (!isWebPushSupported()) return { success: false };

  try {
    const reg = await getServiceWorkerRegistration();
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      await api
        .post('/notifications/unsubscribe', { endpoint: subscription.endpoint })
        .catch((e) => console.warn('Backend unsubscribe notice:', e.message));

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
 * Send a test push notification with optional delay for closed-tab verification
 * @param {number} delaySeconds - e.g. 10 or 30 seconds to allow closing tab/app before push arrives
 */
export const sendTestPushNotification = async (delaySeconds = 0) => {
  try {
    const res = await api.post('/notifications/test-push', { delaySeconds });
    if (delaySeconds > 0) {
      toast.success(res.data?.message || `Test push scheduled in ${delaySeconds}s!`, {
        description: 'Close this tab or app now. The notification will arrive in the background.',
        duration: 8000,
      });
    } else {
      toast.success(res.data?.message || 'Test push notification sent!');
    }
    return res.data;
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to send test push notification');
    throw err;
  }
};

/**
 * Fetch push diagnostics from backend and client environment
 */
export const fetchPushDiagnostics = async () => {
  let backendData = null;
  try {
    const res = await api.get('/notifications/diagnostics');
    backendData = res.data?.data || null;
  } catch (_e) {
    // Non-blocking
  }

  const existingSub = await getExistingPushSubscription();

  return {
    isSupported: isWebPushSupported(),
    permission: getWebPushPermission(),
    isStandalone: isStandalonePWA(),
    isIOS: isIOSDevice(),
    isIOSRequiresInstall: isIOSRequiresHomeInstall(),
    hasSubscription: Boolean(existingSub),
    subscriptionEndpoint: existingSub ? new URL(existingSub.endpoint).hostname : null,
    backend: backendData,
  };
};
