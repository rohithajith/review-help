/* Legacy cleanup worker.
 * If an old CRA service worker is still registered, this script clears caches
 * and unregisters itself so the app uses fresh network assets.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (_) {
      // no-op
    }

    try {
      await self.registration.unregister();
    } catch (_) {
      // no-op
    }

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});
