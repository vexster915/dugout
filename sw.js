/* sw.js — the "service worker". It saves a copy of every app file on the phone
   so Dugout opens instantly and works with no internet (e.g. a gym with bad signal).

   How updates work: the app always opens from the saved copy, then quietly checks
   GitHub for newer files in the background. New files are used the NEXT time you
   open the app. (Settings → "Check for updates" forces it right away.)

   If you ever add a new file to the app, add its name to FILES below and change
   CACHE to a new name (e.g. 'dugout-v2'). */

const CACHE = 'dugout-v3';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './plan.js',
  './db.js',
  './app.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];
const INDEX = './index.html';

// First install: download and save every file.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// A new version took over: delete old saved copies.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Every request: answer from the saved copy right away, refresh it in the background.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube etc. go straight to the internet

  const isPage = req.mode === 'navigate';
  const key = isPage ? INDEX : req;

  const fromNetwork = fetch(isPage ? INDEX : req, { cache: 'no-cache' })
    .then(async res => {
      if (res && res.ok) {
        const copy = res.clone();
        const cache = await caches.open(CACHE);
        await cache.put(key, copy);
      }
      return res;
    });

  event.respondWith(
    caches.match(key, { ignoreSearch: true }).then(cached =>
      cached || fromNetwork.catch(() =>
        isPage ? caches.match(INDEX) : new Response('Offline', { status: 503, statusText: 'Offline' })
      )
    )
  );
  event.waitUntil(fromNetwork.catch(() => {}));
});
