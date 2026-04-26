/**
 * Service Worker — Cache-first for app shell, network-first for API
 */
const CACHE_NAME = 'fieldpulse-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/design-system.css',
  '/css/components.css',
  '/css/components-ext.css',
  '/css/layout.css',
  '/js/utils/uuid.js',
  '/js/utils/gps.js',
  '/js/db.js',
  '/js/components/toast.js',
  '/js/components/signature-pad.js',
  '/js/components/photo-capture.js',
  '/js/components/connection-indicator.js',
  '/js/sync.js',
  '/js/views/login.js',
  '/js/views/dashboard.js',
  '/js/views/submissions.js',
  '/js/views/capture.js',
  '/js/views/routes.js',
  '/js/views/history.js',
  '/js/views/settings.js',
  '/js/router.js',
  '/js/app.js',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API requests — network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
