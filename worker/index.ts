/// <reference lib="webworker" />

// Custom push notification handler for service worker
// This file is automatically included by @ducanh2912/next-pwa

const sw = self as any;

sw.addEventListener('push', (event: any) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Trinity Prayer House';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'tph-notification',
    renotify: true,
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    sw.registration.showNotification(title, options)
  );
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(sw.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return sw.clients.openWindow(url);
    })
  );
});
