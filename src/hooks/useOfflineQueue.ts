import { useState, useEffect } from 'react';
import { offlineQueue, QueueStats, QueuedOperation } from '@/lib/offlineQueue';

export function useOfflineQueue() {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    byType: {},
    byPriority: {},
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe((newStats) => {
      setStats(newStats);
    });

    // Get initial stats
    offlineQueue.getStats().then(setStats);

    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    stats,
    isOnline,
    isOffline: !isOnline,
    hasPendingOperations: stats.pending > 0,
    hasFailedOperations: stats.failed > 0,
    totalOperations: stats.total,
    pendingCount: stats.pending,
    failedCount: stats.failed,
    completedCount: stats.completed,
  };
}

export function useOfflineQueueOperations() {
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOperations = async (status?: QueuedOperation['status']) => {
    setLoading(true);
    try {
      const ops = status 
        ? await offlineQueue.getOperationsByStatus(status)
        : await offlineQueue.getStats().then(stats => 
            offlineQueue.getOperationsByStatus('pending').then(pending => 
              offlineQueue.getOperationsByStatus('failed').then(failed => 
                offlineQueue.getOperationsByStatus('processing').then(processing => 
                  [...pending, ...failed, ...processing]
                )
              )
            )
          );
      setOperations(ops);
    } catch (error) {
      console.error('Failed to load operations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const retryOperation = async (id: string) => {
    await offlineQueue.retryOperation(id);
    loadOperations();
  };

  const removeOperation = async (id: string) => {
    await offlineQueue.removeOperation(id);
    loadOperations();
  };

  const retryAllFailed = async () => {
    await offlineQueue.retryFailedOperations();
    loadOperations();
  };

  const clearCompleted = async () => {
    await offlineQueue.clearCompletedOperations();
    loadOperations();
  };

  const clearAll = async () => {
    await offlineQueue.clearAllOperations();
    loadOperations();
  };

  return {
    operations,
    loading,
    loadOperations,
    retryOperation,
    removeOperation,
    retryAllFailed,
    clearCompleted,
    clearAll,
  };
}



