// Kill switch for the retired seQRets web app.
//
// Browsers that installed the web app re-check /sw.js on their next visit.
// This replacement deletes the old offline copy, unregisters itself, and
// reloads open tabs so they show the holding page. It never caches anything.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      })
  );
});
