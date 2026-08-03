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
      toast.success('Web push notifications enabled successfully!');
      sendBrowserNotification({
        title: '🔔 Notifications Active',
        message: 'You will now receive desktop push alerts for tasks, updates, and messages.',
      });
    } else if (permission === 'denied') {
      toast.error('Notification permission was blocked in your browser settings.');
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
export const sendBrowserNotification = ({ title, message, link, icon, tag }) => {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notifOptions = {
      body: message || '',
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `crm-notif-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
    };

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
