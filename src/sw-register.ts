/**
 * Service Worker Registration
 * Registers the service worker and handles updates
 */

import { Workbox } from 'workbox-window';

let wb: Workbox | null = null;

if ('serviceWorker' in navigator) {
  wb = new Workbox('/src/service-worker.ts', { scope: '/' });

  wb.addEventListener('controlling', () => {
    console.log('Service Worker: Controlling');
    // Reload the page to get the latest version
    window.location.reload();
  });

  wb.addEventListener('activated', (event) => {
    console.log('Service Worker: Activated', event);
  });

  wb.addEventListener('waiting', (event) => {
    console.log('Service Worker: Waiting', event);
    // Show update notification to user
    if (confirm('A new version is available. Update now?')) {
      wb?.messageSkipWaiting();
    }
  });

  wb.addEventListener('message', (event) => {
    console.log('Service Worker: Message', event.data);
    
    if (event.data?.type === 'CACHE_UPDATED') {
      console.log('Cache updated:', event.data.payload);
    }
  });

  // Register the service worker
  wb.register().then((registration) => {
    console.log('Service Worker: Registered successfully', registration);
  }).catch((error) => {
    console.error('Service Worker: Registration failed', error);
  });
} else {
  console.warn('Service Worker: Not supported in this browser');
}

export { wb };











