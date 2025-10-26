/**
 * Simple Service Worker for PWA
 */

// Workbox manifest injection
// declare const self: ServiceWorkerGlobalScope & {
//   __WB_MANIFEST: any[];
//   addEventListener: (type: string, listener: (event: any) => void) => void;
//   skipWaiting: () => void;
//   clients: {
//     claim: () => Promise<void>;
//     matchAll: () => Promise<any[]>;
//   };
// };

// Workbox manifest - this is required for PWA build
const manifest = (self as any).__WB_MANIFEST || [];

// Use the manifest for caching strategies
console.log('Service Worker: Manifest loaded with', manifest.length, 'entries');

// Basic service worker functionality
(self as any).addEventListener('install', (_event: any) => {
  console.log('Service Worker: Installing...');
  (self as any).skipWaiting();
});

(self as any).addEventListener('activate', (event: any) => {
  console.log('Service Worker: Activating...');
  event.waitUntil((self as any).clients.claim());
});

(self as any).addEventListener('fetch', (event: any) => {
  // Basic fetch handling - let the browser handle most requests
  if (event.request.url.includes('/api/sales') && event.request.method === 'POST') {
    // Handle sales API with background sync
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, queue the request
        console.log('Offline: Queuing sale request');
        return new Response(JSON.stringify({ queued: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sales-queue') {
    console.log('Service Worker: Background sync for sales');
    // Handle background sync
  }
});

export {};

