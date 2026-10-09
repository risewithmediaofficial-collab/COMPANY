import { toast } from 'sonner';
import { subscribeToWebPush, isWebPushSupported } from './webPush';

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
 * Check if banner notifications are actively enabled and permitted
 */
export const isBannerNotificationEnabled = () => {
  return isBrowserNotificationSupported() && Notification.permission === 'granted';
};

/**
 * Play a gentle, crisp synthesizer chime via Web Audio API (zero external assets, 0ms network latency)
 */
export const playNotificationChime = () => {
  try {
    if (typeof window === 'undefined') return;
    const isMuted = localStorage.getItem('rwm_banner_sound_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic Note 1 (D5 ~ 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);

    // Harmonic Note 2 (A5 ~ 880 Hz) - bell resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (_e) {
    // Autoplay restrictions or unavailable audio context
  }
};

/**
 * Dispatch an In-App Floating Top Banner Notification event across the app
 */
export const triggerBannerNotification = (data = {}) => {
  if (typeof window === 'undefined') return;

  const payload = {
    id: data.id || data._id || `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title || '🔔 RISE WITH MEDIA Notification',
    message: data.message || data.body || '',
    link: data.link || data.url || '/',
    type: data.type || 'system',
    createdAt: data.createdAt || new Date().toISOString(),
  };

  // Play audio chime
  playNotificationChime();

  // Dispatch custom event for BannerNotificationHost
  window.dispatchEvent(
    new CustomEvent('rwm-banner-notification', {
      detail: payload,
    })
  );

  return payload;
};

/**
 * Request notification permission from the user and register Web Push subscription
 */
export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    return {
      permission: 'unsupported',
      success: false,
      message: 'Browser does not support notifications',
    };
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch (err) {
      console.warn('requestPermission error:', err);
    }
  }

  if (permission === 'granted') {
    const subResult = await subscribeToWebPush();

    // Trigger confirmation in-app banner and sound
    triggerBannerNotification({
      title: '🔔 Banner Notifications Enabled!',
      message: 'You will now receive instant desktop and mobile popup banner alerts.',
      link: '/settings',
      type: 'success',
    });

    // Also trigger native desktop banner
    sendBrowserNotification({
      title: '🔔 Banner Notifications Active',
      message: 'Rise With Media CRM banner alerts are successfully enabled on this device.',
      link: '/settings',
    }).catch(() => {});

    return {
      permission: 'granted',
      success: subResult?.success ?? true,
      subscription: subResult?.subscription,
    };
  }

  return {
    permission,
    success: false,
    message: permission === 'denied' ? 'Permission was denied by user' : 'Permission was dismissed',
  };
};

/**
 * Send a native browser desktop / mobile push notification
 * Uses requireInteraction, vibrate, and high urgency for true banner presentation
 */
export const sendBrowserNotification = async ({ title, message, link, icon, tag } = {}) => {
  if (!isBrowserNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  // Play subtle audible chime
  playNotificationChime();

  const cleanIcon = icon || '/branding/rise-with-media-logo.png';
  const notifOptions = {
    body: message || '',
    icon: cleanIcon,
    badge: cleanIcon,
    tag: tag || `crm-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Key: Keeps desktop banner on screen until dismissed or clicked
    vibrate: [250, 100, 250, 100, 250], // Key: Forces mobile Android to show Heads-Up banner
    silent: false,
    timestamp: Date.now(),
    data: {
      url: link || '/',
      destinationUrl: link || '/',
      timestamp: Date.now(),
    },
  };

  // Try via Service Worker registration first (most reliable on modern Chrome, Edge & Android)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title || '🔔 RISE WITH MEDIA Alert', notifOptions);
        return true;
      }
    } catch (_swErr) {
      // Fall through to standard Notification constructor
    }
  }

  // Fall back to window.Notification constructor
  try {
    const notification = new Notification(title || '🔔 RISE WITH MEDIA Alert', notifOptions);

    if (link) {
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (window.location.pathname !== link) {
          window.location.href = link;
        }
        notification.close();
      };
    }

    return notification;
  } catch (error) {
    console.error('Failed to trigger browser notification:', error);
    return null;
  }
};
