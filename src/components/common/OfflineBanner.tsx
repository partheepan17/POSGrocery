import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedOperations, setQueuedOperations] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncTime(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulate queued operations (in a real app, this would come from a queue service)
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setQueuedOperations(prev => prev + Math.floor(Math.random() * 3));
      }, 5000);

      return () => clearInterval(interval);
    } else {
      // Clear queue when back online
      setQueuedOperations(0);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Simulate retry operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (isOnline) {
      setQueuedOperations(0);
      setLastSyncTime(new Date());
    }
    
    setIsRetrying(false);
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  if (isOnline) {
    return null;
  }

  return (
    <div className={cn(
      'bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You're offline
              </span>
              {queuedOperations > 0 && (
                <Badge variant="pos-warning" size="sm">
                  {queuedOperations} queued
                </Badge>
              )}
            </div>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Operations will sync when connection is restored
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSyncTime && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Last sync: {formatLastSync(lastSyncTime)}
              </span>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              loading={isRetrying}
              leftIcon={isRetrying ? <RefreshCw className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/20"
            >
              {isRetrying ? 'Retrying...' : 'Retry Now'}
            </Button>
          </div>
        </div>
        
        {queuedOperations > 0 && (
          <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {queuedOperations} operation{queuedOperations !== 1 ? 's' : ''} queued for sync
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
