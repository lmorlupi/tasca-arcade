// Service worker: tiene in cache tutta la console, così funziona anche senza rete.
// Quando cambia un file, aumenta VERSION: i telefoni scaricano di nuovo tutto.
const VERSION = 'gameboy-v3';
const FILES = [
  './', 'index.html', 'shell.css', 'shell.js', 'manifest.webmanifest',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'games/blocks.js', 'games/barrel-climb.js', 'games/mouse-quest.js', 'games/tilt-ball.js',
  'games/flick-hoops.js', 'games/slide-2048.js', 'games/space-raiders.js', 'games/galaxy-strike.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Prima la cache; se manca il file va in rete e lo salva. Offline le pagine ricadono su index.html.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
  );
});
