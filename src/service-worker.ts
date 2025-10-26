/**
 * Service Worker for POS Grocery PWA
 * Implements offline support with background sync for sales
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

interface Clients {
  claim(): Promise<void>;
  matchAll(): Promise<ServiceWorkerClient[]>;
  openWindow(url: string): Promise<any>;
}

interface ServiceWorkerClient {
  id: string;
  type: 'window' | 'worker' | 'sharedworker';
  url: string;
  postMessage(message: any): void;
}

interface ServiceWorkerEvent extends Event {
  waitUntil(promise: Promise<any>): void;
  tag?: string;
  data?: {
    type?: string;
    json(): any;
  };
  notification?: {
    close(): void;
  };
  action?: string;
  request?: Request;
}

declare const self: ServiceWorkerGlobalScope & {
  addEventListener: typeof addEventListener;
  skipWaiting: () => Promise<void>;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  __WB_MANIFEST: any[];
};

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync plugin for offline sales
const bgSyncPlugin = new BackgroundSyncPlugin('sales-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    console.log('Background sync: Processing queued sales...');
    let entry;
    while (entry = await queue.shiftRequest()) {
      try {
        await fetch(entry.request);
        console.log('Background sync: Sale synced successfully');
      } catch (error) {
        console.error('Background sync: Failed to sync sale', error);
        // Re-queue the request for retry
        await queue.unshiftRequest(entry);
        break;
      }
    }
  }
});

// Cache app shell and static assets
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate({
    cacheName: 'app-shell',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache API responses with stale-while-revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.searchParams.has('page'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
);

// Cache products API specifically
registerRoute(
  ({ url }) => url.pathname === '/api/products',
  new StaleWhileRevalidate({
    cacheName: 'products-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 10, // 10 minutes
      }),
    ],
  })
);

// Cache static assets (CSS, JS, images)
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script' || 
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Handle sales API with background sync
registerRoute(
  ({ url, request }) => 
    url.pathname === '/api/sales' && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'sales-cache',
    plugins: [
      bgSyncPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200, 201],
      }),
    ],
  })
);

// Handle other API calls with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-network-first',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200, 201, 404],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
);

// Handle offline page
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Skip waiting and claim clients immediately
self.addEventListener('message', (event: MessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle install event
self.addEventListener('install', (event: any) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event: any) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle background sync
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sales-queue') {
    console.log('Service Worker: Background sync triggered for sales');
    event.waitUntil(
      (async () => {
        // The actual sync logic is handled by the BackgroundSyncPlugin
        console.log('Service Worker: Sales sync completed');
      })()
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event: any) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: any) => {
  event.notification?.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Handle fetch events for offline detection
self.addEventListener('fetch', (event: any) => {
  // Update online status
  if (event.request.url.includes('/api/')) {
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // Notify all clients that we're online
            const clients = await self.clients.matchAll();
            clients.forEach((client: any) => {
              client.postMessage({
                type: 'ONLINE_STATUS',
                online: true
              });
            });
          }
        } catch (error) {
          // Notify all clients that we're offline
          const clients = await self.clients.matchAll();
          clients.forEach((client: any) => {
            client.postMessage({
              type: 'ONLINE_STATUS',
              online: false
            });
          });
        }
      })()
    );
  }
});

// Export for testing
export {};
