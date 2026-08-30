/* Офлайн-режим: кэшируем всё приложение при первом открытии */
const CACHE = 'fit-v1';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './report.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/store.js',
  './js/food-db.js',
  './js/parser.js',
  './js/workouts.js',
  './js/food.js',
  './js/notes.js',
  './js/report.js',
  './js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // telegram sdk и прочее — мимо кэша

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
