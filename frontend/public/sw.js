const CACHE_NAME = 'sc-banking-v4';
const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/standardcharted.png',
    '/logo.png',
    '/favicon.ico',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching offline assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    globalThis.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Removing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    globalThis.clients.claim();
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // 1. Only handle GET requests
    if (event.request.method !== 'GET') return;

    // 2. CRITICAL: Skip ALL third-party requests (PostHog, Stytch, Google, etc.)
    // Intercepting these on mobile causes iOS Chrome/Safari to crash the tab.
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    const destination = event.request.destination;
    const isStaticAsset =
        destination === 'style' ||
        destination === 'script' ||
        destination === 'image' ||
        destination === 'font';

    if (!isStaticAsset) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request)
                .then((response) => {
                    if (response?.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return new Response('', { status: 204 });
                });
        })
    );
});
