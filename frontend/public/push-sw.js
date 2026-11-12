/* Push reminders, loaded into the generated service worker (see vite.config.ts).
 * The server sends JSON: { title, body, url, tag }. Tapping a reminder opens
 * (or focuses) the app at `url`, marked so the app can count reminder opens. */
const DEFAULT_URL = '/today';

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: data.url || DEFAULT_URL },
  };
  if (data.tag) options.tag = data.tag;
  event.waitUntil(self.registration.showNotification(data.title || 'FitMind AI', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || DEFAULT_URL;
  const target = new URL(path, self.location.origin);
  target.searchParams.set('from', 'reminder');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.navigate(target.href).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
