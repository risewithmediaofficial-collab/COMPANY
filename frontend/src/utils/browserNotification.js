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

import { subscribeToWebPush } from './webPush';

/**
 * Request notification permission from the user and register Web Push subscription
 */
export const requestBrowserNotificationPermission = async () => {
  return await subscribeToWebPush();
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
