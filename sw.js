// Service worker: tiene in cache tutta la console, così funziona anche senza rete.
// Quando cambia un file, aumenta VERSION: i telefoni scaricano di nuovo tutto.
const VERSION = 'arcade-v101';
// File della console. I giochi non sono qui: si leggono da games/catalog.json, così aggiungerne uno
// non richiede di toccare questo file (basta aumentare VERSION).
const BASE = [
  './', 'index.html', 'shell.css', 'shell.js', 'fx.js', 'art.js', 'art3d.js', 'cards.js', 'avatars.js', 'manifest.webmanifest',
  'icon.svg', 'art/fur.jpg','art/margot-bed.jpg','art/margot-sun.jpg','art/margot-blanket.jpg', 'art/margot-face.jpg', 'art/margot-3q.jpg', 'art/margot-sleep.jpg', 'art/margot-avatar.jpg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'games/catalog.json',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // cache: 'reload' salta la cache del browser: GitHub Pages tiene i file ~10 minuti e altrimenti si salverebbe la versione vecchia.
    await Promise.all(BASE.map(u => c.add(new Request(u, { cache: 'reload' }))));
    try {
      const cat = await (await fetch('games/catalog.json', { cache: 'reload' })).json();
      // Un gioco che non si scarica non deve impedire l'installazione di tutto il resto.
      await Promise.allSettled(cat.games.map(f => c.add(new Request('games/' + f, { cache: 'reload' }))));
    } catch (err) {}
    await self.skipWaiting();
  })());
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
