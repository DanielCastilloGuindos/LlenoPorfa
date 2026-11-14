// Service Worker for llenoPorfa PWA
const CACHE_NAME = 'llenoporfa-v1.1';
const API_CACHE_NAME = 'llenoporfa-api-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-512.png',
  '/icons/icon.svg',
];

// Install: pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME && name !== API_CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: smart network-first for API, cache-first / stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API calls (/api/stations and /api/filters) -> NetworkFirst with offline cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          // If successful 200, cache it
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return networkResponse;
          }

          // If upstream/server error (500, 502, 504), check if we have cached data to serve as fallback
          if (networkResponse && networkResponse.status >= 500) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            if (url.pathname.includes('/api/stations')) {
              const apiCache = await caches.open(API_CACHE_NAME);
              const keys = await apiCache.keys();
              for (const key of keys) {
                if (key.url.includes('/api/stations')) {
                  const fallbackStationRes = await apiCache.match(key);
                  if (fallbackStationRes) return fallbackStationRes;
                }
              }
            }
            // No cache available: pass through original server error response (e.g. 502 with JSON error body)
            return networkResponse;
          }

          return networkResponse;
        })
        .catch(async () => {
          // Network failed (offline / network error)
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If exact query didn't match, try to return any cached stations response
          const apiCache = await caches.open(API_CACHE_NAME);
          const keys = await apiCache.keys();
          for (const key of keys) {
            if (key.url.includes('/api/stations')) {
              const fallbackStationRes = await apiCache.match(key);
              if (fallbackStationRes) return fallbackStationRes;
            }
          }
          return new Response(
            JSON.stringify({
              ok: false,
              code: 'OFFLINE',
              error: 'Sin conexión a internet (modo offline)',
              offline: true,
              stations: [],
              count: 0,
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        })
    );
    return;
  }

  // 2. Static Assets (Vite chunks, CSS, JS, fonts, images) -> StaleWhileRevalidate
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Navigation / HTML -> NetworkFirst falling back to cached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/');
        return cached || (await caches.match(request));
      })
    );
    return;
  }

  // Default
  event.respondWith(
    caches.match(request).then((res) => res || fetch(request))
  );
});
