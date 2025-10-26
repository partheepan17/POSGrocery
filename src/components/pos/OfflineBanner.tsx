import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      // Hide banner after a delay when coming back online
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`w-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-200" />
                <div>
                  <div className="font-semibold">Connection Restored</div>
                  <div className="text-sm text-red-100">
                    Back online at {lastOnlineTime?.toLocaleTimeString()}
                  </div>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-200" />
                <div>
                  <div className="font-semibold">Offline Mode</div>
                  <div className="text-sm text-red-100">
                    No internet connection. Some features may be limited.
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            <Button
              onClick={() => setShowBanner(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-600 h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        </div>
        
        {!isOnline && (
          <div className="mt-2 text-sm text-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Data will sync when connection is restored</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
