import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OnlineStatusToggleProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export function OnlineStatusToggle({ onStatusChange }: OnlineStatusToggleProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkOnlineStatus = async () => {
    setIsChecking(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        const wasOffline = !isOnline;
        setIsOnline(true);
        setLastChecked(new Date());
        onStatusChange?.(true);
        
        if (wasOffline) {
          toast.success('System is now online!');
        }
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      const wasOnline = isOnline;
      setIsOnline(false);
      setLastChecked(new Date());
      onStatusChange?.(false);
      
      if (wasOnline) {
        toast.error('System went offline');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const toggleOnlineMode = async () => {
    if (isOnline) {
      // Going offline
      setIsOnline(false);
      onStatusChange?.(false);
      toast.info('System set to offline mode');
    } else {
      // Trying to go online
      await checkOnlineStatus();
    }
  };

  // Check status on mount
  useEffect(() => {
    checkOnlineStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {/* Status Indicator */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${
          isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleOnlineMode}
        disabled={isChecking}
        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          isOnline
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
        } ${isChecking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isChecking ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>{isChecking ? 'Checking...' : isOnline ? 'Online' : 'Offline'}</span>
      </button>

      {/* Manual Check Button */}
      <button
        onClick={checkOnlineStatus}
        disabled={isChecking}
        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Check connection status"
      >
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
      </button>

      {/* Last Checked Time */}
      {lastChecked && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}


