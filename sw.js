const CACHE_NAME = '999-sim-cache-v1';

// These are the core local files the app needs to load offline
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 1. INSTALL EVENT - Pre-cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE EVENT - Clean up old caches when a new version is released
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. FETCH EVENT - Serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return the cached response if we have it (Instant loading)
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise, fetch from the network
                return fetch(event.request).then((networkResponse) => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                        return networkResponse;
                    }

                    // Dynamically cache external libraries (Tailwind, Fonts, jsPDF) so they work offline later
                    const requestUrl = new URL(event.request.url);
                    const hostname = requestUrl.hostname;
                    const allowedCdnHosts = [
                        'cdn.tailwindcss.com',
                        'fonts.googleapis.com',
                        'fonts.gstatic.com',
                        'cdnjs.cloudflare.com'
                    ];
                    if (allowedCdnHosts.includes(hostname)) {
                        
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }

                    return networkResponse;
                }).catch((error) => {
                    console.error('[Service Worker] Network fetch failed, offline mode active.', error);
                    // If you wanted to serve a custom "Offline" HTML page, you would do it here.
                });
            })
    );
});