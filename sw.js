/* Офлайн-режим.

   Стратегия сознательно разная:
   - разметка, стили и скрипты — сначала сеть, кэш как запасной вариант.
     Иначе после обновления приложение открывалось бы старым до второго запуска.
   - остальное (иконки, манифест) — сначала кэш, так быстрее.
   Без интернета работает всё равно всё: сеть просто падает, и отдаётся кэш. */

const CACHE = 'fit-v5';
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
  './js/food-plus.js',
  './js/notes.js',
  './js/stats.js',
  './js/timer.js',
  './js/report.js',
  './js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function freshFirst(req) {
  return fetch(req)
    .then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || caches.match('./index.html')));
}

function cacheFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    return fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Open Food Facts и Telegram SDK — мимо кэша

  const isCode = req.mode === 'navigate' || /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
  e.respondWith(isCode ? freshFirst(req) : cacheFirst(req));
});
