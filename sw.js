/*
 * Prova brevemente la rete per avere i file aggiornati; se è lenta o assente,
 * apre subito la copia salvata e aggiorna la cache quando la rete risponde.
 */
const VERSION = 'novello-v35';
const FILES = ['./', 'index.html', 'musica.html', 'styles.css', 'app.js', 'config.js', 'mappa-catignano.webp'];
const NETWORK_TIMEOUT = 1200;
const BACKGROUND_TIMEOUT = 10000;

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
    let finishBackground;
    let background = new Promise(resolve => finishBackground = resolve);
    e.waitUntil(background);
    e.respondWith((async () => {
        try {
            let c = await caches.open(VERSION);
            let cached = await c.match(key, {ignoreSearch: true});
            // La richiesta continua anche se scade il timeout, così può aggiornare
            // la cache per la prossima apertura mentre questa usa la copia offline.
            let controller = new AbortController();
            let abortTimer = setTimeout(() => controller.abort(), BACKGROUND_TIMEOUT);
            let network = fetch(e.request, {cache: 'no-cache', signal: controller.signal}).then(async response => {
                if (response.ok) await c.put(key, response.clone());
                return response;
            }).catch(() => null).finally(() => {
                clearTimeout(abortTimer);
                finishBackground()
            });
            if (!cached) return (await network) || Response.error();
            let timeout = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_TIMEOUT));
            let response = await Promise.race([network, timeout]);
            return response || cached;
        } catch (error) {
            finishBackground();
            throw error;
        }
    })())
});
