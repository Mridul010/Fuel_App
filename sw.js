const CACHE_NAME = 'fuelrate-v9';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/prices.js',
  './img/icon.png',
  './manifest.json'
];
const REMOTE_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap',
  'https://unpkg.com/lucide@latest',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(LOCAL_ASSETS);
      // A single unreachable CDN must not fail the whole install
      await Promise.all(REMOTE_ASSETS.map(url =>
        cache.add(new Request(url, { mode: 'no-cors' })).catch(() => {})
      ));
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For data, HTML, JS, CSS — ALWAYS Network-First so updates propagate fast
  if (url.pathname.endsWith('prices.js') || url.pathname.endsWith('app.js') ||
      url.pathname.endsWith('style.css') || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(fetchRes => {
          const copy = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return fetchRes;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request).then(res => {
            if (res) return res;
            if (event.request.mode === 'navigate') return caches.match('./index.html');
            return Response.error();
          });
        })
    );
  } else {
    // For images, fonts, css, js - Cache-First, fallback to Network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(fetchRes => {
            const copy = fetchRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            return fetchRes;
          });
        })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'REFRESH') {
    caches.open(CACHE_NAME).then(async cache => {
      const keys = await cache.keys();
      await Promise.all(keys.filter(k => k.url.includes('prices.js')).map(k => cache.delete(k)));
    });
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});
