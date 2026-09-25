const CACHE_NAME = 'tracex-v6-smart-assistant';
const STATIC_ASSETS = ['/icon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass WebSocket, Binance API, or external live financial streams
  if (
    url.protocol === 'wss:' ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('binance.com') ||
    url.hostname.includes('alternative.me') ||
    url.hostname.includes('bitcoin-data.com') ||
    url.hostname.includes('coinlore.net') ||
    url.hostname.includes('coingecko.com') ||
    url.hostname.includes('stablecoins.llama.fi')
  ) {
    return;
  }

  // 2. Navigation / HTML requests: STALE-WHILE-REVALIDATE for 0ms instant startup
  // Returns cached shell immediately from local disk (0ms launch delay), updates cache in background
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const backgroundFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // If shell is in cache, deliver immediately for 0ms launch
        if (cachedResponse) {
          return cachedResponse;
        }

        // First launch fallback
        return backgroundFetch;
      })
    );
    return;
  }

  // 3. Static Assets (CSS, JS, Fonts, Images)
  // Network first with cache fallback to avoid serving 404 chunks
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and revalidate in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});
