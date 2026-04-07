const CACHE_NAME = 'fuelrate-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/prices.js',
  './img/icon.svg',
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            // Don't cache third party API calls wildly, but app assets are fine
            if(event.request.url.startsWith(self.location.origin)) {
               cache.put(event.request.url, fetchRes.clone());
            }
            return fetchRes;
          });
        });
      }).catch(() => {
        // Fallback for offline mode, specifically for the main page
        if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
      })
  );
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
