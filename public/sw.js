const CACHE_NAME = 'societyapp-v4';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
    '/offline.html',
    '/manifest.json',
    '/favicon.ico',
    '/assets/dist/output.css',
    '/assets/js/dropdown.js',
    '/assets/js/offline.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Lexend:wght@300;400;500;600;700;800&display=swap',
    'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // 1. Navigation requests (HTML pages): ALWAYS network-first, NEVER cache HTML to prevent stale CSRF tokens
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
        return;
    }

    // 2. API & Auth routes: ALWAYS network, never cached
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
        return;
    }

    // 3. External assets or non-origin: let browser handle directly unless in cache
    if (url.origin !== location.origin && !url.hostname.includes('googleapis') && !url.hostname.includes('gstatic') && !url.hostname.includes('unpkg')) {
        return;
    }

    // 4. Static assets (CSS, JS, images, fonts): Cache-first with network fallback
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            });
        }).catch(() => {
            if (request.destination === 'image') {
                return new Response('', { status: 404, statusText: 'Not Found' });
            }
            return caches.match(OFFLINE_URL);
        })
    );
});

self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const options = {
        body: data.message || 'New notification from SocietyApp',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/auth/login'
        }
    };
    event.waitUntil(
        self.registration.showNotification(data.title || 'SocietyApp', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
