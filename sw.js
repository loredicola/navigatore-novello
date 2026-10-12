/*
 * Service worker: alla prima apertura salva sul telefono tutti i file del navigatore.
 * Dalle aperture successive la pagina parte subito dalla cache anche senza rete,
 * e in background scarica le versioni aggiornate (si vedono all'apertura dopo).
 *
 * Se cambi i file e vuoi forzare l'aggiornamento, incrementa VERSION.
 */
const VERSION = 'novello-v4';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'mappa-catignano.webp'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()))
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
        .then(() => self.clients.claim()))
});

self.addEventListener('fetch', e => {
    let url = new URL(e.request.url);
    // L'editor deve vedere sempre i file aggiornati: niente cache
    if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('editor') || e.request.referrer.includes('editor')) return;
    // index.html?totem=... usa la stessa copia in cache di index.html
    let key = e.request.mode === 'navigate' ? new Request(url.pathname) : e.request;
    e.respondWith(caches.open(VERSION).then(async c => {
        let cached = await c.match(key, {ignoreSearch: true});
        let fresh = fetch(e.request).then(r => {
            if (r.ok) c.put(key, r.clone());
            return r
        });
        if (cached) {
            e.waitUntil(fresh.catch(() => null));
            return cached
        }
        return fresh
    }))
});
