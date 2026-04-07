const CACHE_NAME = 'fuelrate-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/prices.js',
  './img/icon.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@600;700;800&display=swap',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For prices.js, index.html, we ALWAYS want Network-First, fallback to Cache.
  if (url.pathname.endsWith('prices.js') || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request).then(res => {
            if (res) return res;
            if (event.request.mode === 'navigate') return caches.match('./index.html');
          });
        })
    );
  } else {
    // For images, fonts, css, js - Cache-First, fallback to Network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(fetchRes => {
            return caches.open(CACHE_NAME).then(cache => {
              if(event.request.url.startsWith(self.location.origin)) {
                 cache.put(event.request.url, fetchRes.clone());
              }
              return fetchRes;
            });
          });
        })
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});
