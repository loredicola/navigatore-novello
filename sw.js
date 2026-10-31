/*
 * Service worker: prova prima a caricare la versione dal server e la salva
 * nella cache. Se il server non è raggiungibile, usa la copia offline.
 */
const VERSION = 'novello-v30';
const FILES = ['./', 'index.html', 'musica.html', 'styles.css', 'app.js', 'config.js', 'mappa-catignano.webp'];

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
    e.respondWith((async () => {
        let c = await caches.open(VERSION);
        try {
            // Chiede al browser di ricontrollare la risposta HTTP in cache.
            let response = await fetch(e.request, {cache: 'no-cache'});
            if (response.ok) await c.put(key, response.clone());
            return response
        } catch (err) {
            let cached = await c.match(key, {ignoreSearch: true});
            if (cached) return cached;
            throw err
        }
    })())
});
