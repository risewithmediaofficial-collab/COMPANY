// ==============================================================================
// RISE WITH MEDIA - PWA & NATIVE WEB PUSH SERVICE WORKER
// Supports: Android Chrome, Windows Chrome/Edge, macOS, and iOS 16.4+ Safari PWA
// Version: 2.0.0
// ==============================================================================

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old worker to exit
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Immediately take control of all open clients under scope
  event.waitUntil(self.clients.claim());
});

// ── Native Push Event Listener ────────────────────────────────────────────────
// Triggers even when all tabs and the installed PWA are completely closed
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (_jsonErr) {
      try {
        const text = event.data.text();
        data = { title: '🔔 RISE WITH MEDIA Alert', body: text };
      } catch (_textErr) {
        data = { title: '🔔 RISE WITH MEDIA Alert', body: 'New workspace update available.' };
      }
    }
  }

  const title = data.title || '🔔 RISE WITH MEDIA Alert';
  const body = data.body || data.message || 'You have a new update in your CRM workspace.';
  const destinationUrl = data.link || data.url || '/';
  const eventId = data.eventId || data.id || `push-${Date.now()}`;
  const icon = data.icon || '/branding/rise-with-media-logo.png';
  const badge = data.badge || '/branding/rise-with-media-logo.png';

  // Base options supported universally across Android, Windows, macOS, and iOS
  const options = {
    body,
    icon,
    badge,
    tag: eventId, // Deduplicates retried pushes with the same event ID
    renotify: true,
    requireInteraction: false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: destinationUrl,
      destinationUrl,
      eventId,
      timestamp: Date.now(),
    },
  };

  // Add actions ONLY on platforms that support them (Desktop Chrome, Edge)
  // Apple iOS Safari throws TypeError if notification actions are passed!
  try {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    if (!isIOS && 'actions' in Notification.prototype) {
      options.actions = [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ];
    }
  } catch (_e) {
    // If feature check fails, leave actions off to ensure delivery succeeds
  }

  // event.waitUntil MUST wrap showNotification directly so browser does not kill worker
  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch((err) => {
        console.error('[SW] Standard showNotification failed, attempting minimal fallback:', err);
        // Resilient fallback with bare minimum options if system rejected rich options
        return self.registration.showNotification(title, {
          body,
          icon: '/branding/rise-with-media-logo.png',
          tag: eventId,
          data: { url: destinationUrl },
        });
      })
  );
});

// ── Notification Click Handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked 'Dismiss', do nothing
  if (event.action === 'close') {
    return;
  }

  const rawUrl = event.notification.data?.destinationUrl || event.notification.data?.url || '/';

  // Strictly enforce same-origin destination URL
  let targetUrl = self.location.origin + '/';
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.href;
    }
  } catch (_e) {
    targetUrl = self.location.origin + '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing app window is open on this origin, focus and navigate it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      // 2. If no window is currently open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Notification Close Handler (Telemetry) ───────────────────────────────────
self.addEventListener('notificationclose', (_event) => {
  // Silent acknowledgment
});
