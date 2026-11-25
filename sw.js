// Service Worker — JLPT Study & Quiz App
// Cache Version v27.1: Vibrant Navbar badges & Real-time review updates
const CACHE_VERSION = 'jlpt-v27.1';
const PRECACHE = [
  './',
  './index.html?v=26',
  './flashcard.html?v=26',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './css/shared.css?v=26',
  './css/quiz.css?v=26',
  './css/flashcard.css?v=26',
  './js/utils.js?v=26',
  './js/nav.js?v=26',
  './js/backup.js?v=26',
  './js/changelog.js?v=26',
  './js/tts.js?v=26',
  './js/quiz-engine.js?v=26',
  './js/quiz-words.js?v=26',
  './js/flashcard.js?v=26',
  './data/kanji.js?v=26',
  './data/vocab5.js?v=26',
  './data/kana.js?v=26',
  './data/grammar5.js?v=26',
  './data/scenes.js?v=26'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(err => console.warn('Precache partial fail:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-First strategy: always fetch fresh file when online, fallback to cache when offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html?v=26') || caches.match('./index.html');
          }
          return null;
        });
      })
  );
});
