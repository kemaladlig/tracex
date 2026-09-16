const CACHE_NAME = 'tracex-v2-shell';
const SHELL_ASSETS = ['/', '/index.html', '/icon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first for dynamic and API calls, Cache-first for static shell assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept WebSocket, Binance API, or external on-chain data
  if (
    url.protocol === 'wss:' ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('binance.com') ||
    url.hostname.includes('alternative.me') ||
    url.hostname.includes('bitcoin-data.com') ||
    url.hostname.includes('coinlore.net')
  ) {
    return;
  }

  // Static shell assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
