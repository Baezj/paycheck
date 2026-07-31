// Pay & Bills service worker — v2
// Network-first with a short timeout, cache fallback.
// - With signal: you always get the newest version immediately (no "one launch behind").
// - Bad signal or offline: after 2.5s it falls back to the last good cached copy.
const CACHE = 'paybills-v2';

self.addEventListener('install', (e) => {
  // Pre-cache the shell so offline works even before the first full visit
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './icon.png']).catch(() => {})));
  self.skipWaiting(); // new versions take over immediately
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      resolve(res);
    }, (err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    networkWithTimeout(e.request, 2500)
      .catch(() => caches.match(e.request))
      .then((res) => res || fetch(e.request)) // nothing cached yet: let the network take as long as it needs
  );
});
