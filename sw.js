/* sw.js — the "service worker". It saves a copy of every app file on the phone
   so Dugout works with no internet (e.g. a gym with bad signal).

   How updates work: every time you open Dugout with internet, it loads the newest
   files straight from GitHub, so you always jump right to the latest version (never
   an older one, and never one update at a time). The saved copy is only used when
   you're offline or the connection is too slow. If a new version comes out while
   Dugout is open, the app switches over by itself (see "Updates" in app.js).

   When you change the app: set VERSION below to the same number as APP_VERSION in
   app.js. If you add a new file, add its name to FILES too. */

const VERSION = '2.1.0';
const CACHE = 'dugout-' + VERSION;
const FILES = [
  './',
  './index.html',
  './styles.css',
  './plan.js',
  './meals.js',
  './foods.js',
  './exercises.js',
  './db.js',
  './app.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];
const INDEX = './index.html';
const SLOW = 3500;     // ms to wait for the internet before using the saved copy

// Install: download and save every file (fresh from the server, not the browser's cache).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// A new version took over: delete old saved copies and tell open windows which version this is.
const tellVersion = client => client.postMessage({ type: 'dugout-version', version: VERSION });
const dropOldCopies = () => caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Versions before 2.1 (saved as "dugout-v1" … "dugout-v6") can't switch over by themselves,
    // so windows still showing one are reloaded onto this version, once.
    const fromOld = (await caches.keys()).some(k => /^dugout-v\d+$/.test(k));
    await dropOldCopies();
    await self.clients.claim();
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      if (fromOld && 'navigate' in client) client.navigate(client.url).catch(() => tellVersion(client));
      else tellVersion(client);
    }
  })());
});
// The app asks every time it opens. (Tidying up here too catches a copy the old version was
// still saving while this one took over.)
self.addEventListener('message', event => {
  if (event.data !== 'version?') return;
  if (event.source) tellVersion(event.source);
  event.waitUntil(dropOldCopies());
});

// Every request: the newest file from the internet first (and save it), the saved copy if
// you're offline or the internet is too slow.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube etc. go straight to the internet

  const isPage = req.mode === 'navigate';
  const key = isPage ? INDEX : req;
  const fromNetwork = fetch(isPage ? INDEX : req, { cache: 'no-cache' }).then(async res => {
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(key, res.clone());
    }
    return res;
  });
  event.respondWith((async () => {
    let timer;
    const slow = new Promise(resolve => { timer = setTimeout(resolve, SLOW, null); });
    try {
      const res = await Promise.race([fromNetwork, slow]);
      if (res && res.ok) return res;
    } catch (e) { /* offline */ } finally { clearTimeout(timer); }
    const saved = await caches.match(key, { ignoreSearch: true });
    if (saved) return saved;
    try { return await fromNetwork; } catch (e) { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
  })());
  event.waitUntil(fromNetwork.catch(() => {}));   // finish saving the new copy even if we answered from the saved one
});
