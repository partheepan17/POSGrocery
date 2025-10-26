/**
 * useOfflineSync Hook
 * Manages offline synchronization state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { getQueueLength, getQueue, clearQueue } from '@/core/offline/queue';

export interface OfflineSyncState {
  isOnline: boolean;
  queueLength: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    queueLength: getQueueLength(),
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  });

  const sync = useCallback(async () => {
    if (!state.isOnline || state.queueLength === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Import flush function dynamically to avoid circular dependencies
      const { flush } = await import('@/core/offline/queue');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.host}`;
      
      await flush(apiBaseUrl);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        queueLength: getQueueLength(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [state.isOnline, state.queueLength]);

  const clearSyncError = useCallback(() => {
    setState(prev => ({ ...prev, syncError: null }));
  }, []);

  const clearOfflineQueue = useCallback(() => {
    clearQueue();
    setState(prev => ({ ...prev, queueLength: 0 }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update queue length periodically
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, queueLength: getQueueLength() }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-sync when coming back online
    if (state.isOnline && state.queueLength > 0 && !state.isSyncing) {
      sync();
    }
  }, [state.isOnline, state.queueLength, state.isSyncing, sync]);

  return {
    ...state,
    sync,
    clearSyncError,
    clearOfflineQueue,
    queuedOperations: getQueue(),
  };
}