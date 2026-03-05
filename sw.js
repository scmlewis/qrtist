/**
 * Service Worker for QR Code Generator
 * Provides offline support and caching for the application
 * GitHub Pages optimized with automatic cache busting
 */

const CACHE_VERSION = 'v6'; // Increment this to bust all caches
const CACHE_NAME = 'qrtist-' + CACHE_VERSION;
const RUNTIME_CACHE = 'qrtist-runtime-' + CACHE_VERSION;

const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './qr-bundle.js',
    './qrcode-styling.js'
];

// Install event: cache essential files on first load
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app files...');
            return cache.addAll(FILES_TO_CACHE).catch((err) => {
                console.warn('[SW] Some files could not be cached during install:', err);
                // Don't fail the install if some files can't be cached
                return Promise.resolve();
            });
        })
    );
    // Activate immediately (skip waiting for old SW to be released)
    self.skipWaiting();
});

// Activate event: clean up old caches and update clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            console.log('[SW] Cleaning up old caches...');
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheName.includes(CACHE_VERSION)) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Claim all clients immediately
    self.clients.claim();
});

// Fetch event: cache-first strategy for app, network-first for CDN
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const isExternal = !url.origin.includes(self.location.origin);

    event.respondWith(
        (async () => {
            // Network-first for external CDN resources
            if (isExternal) {
                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse && networkResponse.status === 200) {
                        // Cache successful CDN responses
                        const cache = await caches.open(RUNTIME_CACHE);
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (err) {
                    // Fallback to cache if network fails
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return new Response('Offline - CDN resource unavailable', { status: 503 });
                }
            }

            // Cache-first strategy for app files
            try {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                const networkResponse = await fetch(event.request);
                if (networkResponse && networkResponse.status === 200) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (err) {
                console.warn('[SW] Fetch failed:', err);
                // Return offline fallback
                return new Response(
                    'Offline - app resources not available',
                    { status: 503, statusText: 'Service Unavailable' }
                );
            }
        })()
    );
});
