/* ========================================================
   Service Worker for PWA — Học Từ Vựng Tiếng Nhật
   Supports 100% Offline Learning with Network-First Strategy
   ======================================================== */

const CACHE_NAME = 'webtiengnhat-v8';

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/data_n3.js',
    './manifest.json',
    './assets/icon-180.png',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate: Clean up old caches immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Xóa cache cũ:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch: Network First, falling back to cache (Optimal for instant updates + offline support)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
