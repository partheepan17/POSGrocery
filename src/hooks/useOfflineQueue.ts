import { useState, useEffect } from 'react';
import { queueOperations } from '@/lib/offlineQueue';
import { QueuedOperation } from '@/core/offline/queue';

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export function useOfflineQueue() {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update stats periodically
    const updateStats = () => {
      const queue = queueOperations.getQueue();
      setStats({
        total: queue.length,
        pending: queue.filter(op => (op as any).status === 'pending').length,
        processing: queue.filter(op => (op as any).status === 'processing').length,
        completed: queue.filter(op => (op as any).status === 'completed').length,
        failed: queue.filter(op => (op as any).status === 'failed').length,
      });
    };

    // Get initial stats
    updateStats();

    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
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

  const loadOperations = async (status?: any) => {
    setLoading(true);
    try {
      const queue = queueOperations.getQueue();
      const ops = status 
        ? queue.filter(op => (op as any).status === status)
        : queue;
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
    // TODO: Implement retry operation
    console.log('Retry operation:', id);
    loadOperations();
  };

  const removeOperation = async (id: string) => {
    // TODO: Implement remove operation
    console.log('Remove operation:', id);
    loadOperations();
  };

  const retryAllFailed = async () => {
    // TODO: Implement retry all failed operations
    console.log('Retry all failed operations');
    loadOperations();
  };

  const clearCompleted = async () => {
    // TODO: Implement clear completed operations
    console.log('Clear completed operations');
    loadOperations();
  };

  const clearAll = async () => {
    queueOperations.clearQueue();
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














