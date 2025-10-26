/**
 * Offline Banner Component
 * Shows when the app is offline and displays queued sales count
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedSales, setQueuedSales] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sales-queue');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ONLINE_STATUS') {
        setIsOnline(event.data.online);
      } else if (event.data?.type === 'QUEUED_SALES_UPDATE') {
        setQueuedSales(event.data.count);
      }
    };

    // Listen for storage changes (queued sales count)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'pos_queued_sales') {
        setQueuedSales(parseInt(event.newValue || '0'));
      }
    };

    // Initial load
    const storedQueuedSales = localStorage.getItem('pos_queued_sales');
    if (storedQueuedSales) {
      setQueuedSales(parseInt(storedQueuedSales));
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Don't show banner when online and no queued sales
  if (isOnline && queuedSales === 0) {
    return null;
  }

  const handleRetrySync = async () => {
    setIsSyncing(true);
    
    try {
      // Trigger background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sales-queue');
        
        // Wait a bit for sync to complete
        setTimeout(() => {
          setIsSyncing(false);
          // Check if sync was successful by trying to fetch a simple API call
          fetch('/api/health')
            .then(response => {
              if (response.ok) {
                setQueuedSales(0);
                localStorage.removeItem('pos_queued_sales');
              }
            })
            .catch(() => {
              // Still offline or sync failed
            });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      setIsSyncing(false);
    }
  };

  return (
    <Alert 
      className={`border-l-4 ${
        isOnline 
          ? 'border-green-500 bg-green-50 text-green-800' 
          : 'border-orange-500 bg-orange-50 text-orange-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          
          <AlertDescription className="flex items-center space-x-2">
            <span>
              {isOnline 
                ? 'Back online' 
                : 'Offline mode'
              }
            </span>
            
            {queuedSales > 0 && (
              <Badge variant="secondary" className="ml-2">
                {queuedSales} sales queued
              </Badge>
            )}
          </AlertDescription>
        </div>

        {!isOnline && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-orange-600">
              Sales will sync when reconnected
            </span>
          </div>
        )}

        {isOnline && queuedSales > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetrySync}
            disabled={isSyncing}
            className="ml-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Sync Now
              </>
            )}
          </Button>
        )}
      </div>
    </Alert>
  );
};

export default OfflineBanner;
