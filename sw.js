// The Visual Suffering - service worker
// On purpose, this ONLY caches static media: icons, images, and the
// background music. It never caches index.html (or anything else that
// counts as "the code") so every visit always gets the latest logic -
// no stale-app-shell problems, no manual cache-busting needed on deploy.
const CACHE_NAME = 'visual-suffering-media-v1';

const MEDIA_PATTERNS = [
  /\.png$/i, /\.jpg$/i, /\.jpeg$/i, /\.gif$/i, /\.webp$/i, /\.svg$/i, /\.ico$/i,
  /\.mp3$/i, /\.wav$/i, /\.ogg$/i, /\.m4a$/i
];

function isMediaRequest(req){
  const url = new URL(req.url);
  return MEDIA_PATTERNS.some((re) => re.test(url.pathname));
}

const PRECACHE = [
  './pwaimage.png',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './favicon-48.png',
  './Curquis%20Groove.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Everything that isn't an icon/image/song - the HTML page, its inline
  // JS/CSS, manifest.json, fonts, whatever - is deliberately left alone and
  // goes straight to the network, uncached, every time.
  if (!isMediaRequest(req)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
