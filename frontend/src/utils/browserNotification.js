import { toast } from 'sonner';

/**
 * Check if the browser supports native desktop push notifications
 */
export const isBrowserNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current browser notification permission state: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export const getBrowserNotificationPermission = () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission from the user
 */
export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    toast.error('Browser push notifications are not supported in this browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Desktop push notifications enabled successfully!');
      await sendBrowserNotification({
        title: '🔔 Desktop Notifications Active',
        message: 'You will now receive desktop alerts for real-time CRM updates, tasks, and leads.',
      });
    } else if (permission === 'denied') {
      toast.error('Notification permission was blocked. Click the lock/tune icon near your browser address bar to allow notifications.');
    }
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'default';
  }
};

/**
 * Send a native browser desktop push notification
 */
export const sendBrowserNotification = async ({ title, message, link, icon, tag } = {}) => {
  if (!isBrowserNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notifOptions = {
      body: message || '',
      icon: icon || '/branding/logo.png',
      badge: '/branding/logo.png',
      tag: tag || `crm-notif-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: {
        url: link || '/',
      },
    };

    // First try via Service Worker registration (most reliable on modern Chrome, Edge & Android)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title || 'New CRM Alert', notifOptions);
          return true;
        }
      } catch (_swErr) {
        // Fall back to standard Notification constructor
      }
    }

    // Fall back to window.Notification
    const notification = new Notification(title || 'New CRM Alert', notifOptions);

    if (link) {
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        window.location.href = link;
        notification.close();
      };
    }

    return notification;
  } catch (error) {
    console.error('Failed to trigger browser notification:', error);
    return null;
  }
};
