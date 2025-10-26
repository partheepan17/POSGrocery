/**
 * Offline Queue Operations
 * Legacy compatibility for offline queue operations
 */

import { enqueue, flush, setupOnlineFlush, getQueueLength, getQueue, clearQueue } from '@/core/offline/queue';

export const queueOperations = {
  enqueue,
  flush,
  setupOnlineFlush,
  getQueueLength,
  getQueue,
  clearQueue,
};