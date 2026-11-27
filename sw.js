const cachePrefix = 'advent-shell-';
const version = cachePrefix + 'v7';
const assets = ['./index.html', './calendar.js', './push.js', './attendance.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(version).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(cachePrefix) && key !== version)
      .map(key => caches.delete(key))
  )));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isShell = assets.some(asset => new URL(asset, self.registration.scope).href === url.href);
  if (event.request.method !== 'GET' || (!isShell && event.request.mode !== 'navigate')) return;
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(event.request).catch(() => caches.open(version).then(cache =>
    cache.match(event.request.mode === 'navigate' ? './index.html' : event.request)
  )));
});