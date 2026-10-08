// Progressive Web App (PWA) & Browser Web Push Service Worker
// Version: 1.2.0 - Native Web Push Integration

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Handle incoming Web Push notifications ──────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data = { title: 'CRM Notification', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Agency CRM Notification';
  const destinationUrl = data.link || data.url || '/';
  const eventId = data.eventId || data.id || `push-${Date.now()}`;

  const options = {
    body: data.body || data.message || 'You have a new update in your CRM workspace.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: eventId,
    renotify: true,
    data: {
      url: destinationUrl,
      destinationUrl,
      eventId,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if user currently has an app window active and focused
      const isFocused = windowClients.some(
        (client) => client.focused && client.visibilityState === 'visible'
      );

      // If user is actively focused, Socket.IO in-app toast handles visual alert
      // When backgrounded, minimized, or browser tab is closed, show OS notification
      if (!isFocused) {
        return self.registration.showNotification(title, options);
      }
    })
  );
});

// ── Handle notification click ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const rawUrl = event.notification.data?.destinationUrl || event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to find an existing open window under the same origin and focus it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is currently open, open a new window to the destination URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
