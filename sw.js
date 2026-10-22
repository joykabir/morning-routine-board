// Service worker: caches the whole app so it loads with no network.
//
// Bump CACHE whenever any file changes. The new version installs on the next
// load after deploy and takes over on the launch after that.

const CACHE = 'mrb-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './src/app.js',
  './src/board.js',
  './src/day.js',
  './src/emoji.js',
  './src/model.js',
  './src/settings.js',
  './src/store.js',
  './src/view.js'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
