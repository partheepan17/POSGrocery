import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { 
  Scale, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Lock, 
  Unlock,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardContent } from '../ui/Card';

interface ScalePanelProps {
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  className?: string;
}

interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  locked: boolean;
  timestamp: Date;
}

export function ScalePanel({ 
  connected, 
  onConnect, 
  onDisconnect, 
  className 
}: ScalePanelProps) {
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTaring, setIsTaring] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Simulate scale readings when connected
  useEffect(() => {
    if (!connected) {
      setReading(null);
      setError(null);
      return;
    }

    const interval = setInterval(() => {
      // Simulate scale reading
      const weight = Math.random() * 5; // 0-5 kg
      const stable = Math.random() > 0.3; // 70% chance of being stable
      
      setReading({
        weight,
        unit: 'kg',
        stable,
        locked: false,
        timestamp: new Date()
      });

      // Simulate occasional errors
      if (Math.random() < 0.05) {
        setError('Scale communication error');
        setTimeout(() => setError(null), 3000);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [connected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (Math.random() > 0.1) { // 90% success rate
      onConnect();
    } else {
      setError('Failed to connect to scale');
    }
    
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    onDisconnect();
    setReading(null);
    setError(null);
  };

  const handleTare = async () => {
    setIsTaring(true);
    
    // Simulate tare operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (reading) {
      setReading(prev => prev ? { ...prev, weight: 0 } : null);
    }
    
    setIsTaring(false);
  };

  const handleLock = async () => {
    setIsLocking(true);
    
    // Simulate lock operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (reading) {
      setReading(prev => prev ? { ...prev, locked: !prev.locked } : null);
    }
    
    setIsLocking(false);
  };

  const formatWeight = (weight: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(weight);
  };

  const getStatusColor = () => {
    if (error) return 'pos-danger';
    if (!connected) return 'pos-warning';
    if (reading?.stable) return 'pos-success';
    return 'pos-info';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (!connected) return 'Disconnected';
    if (reading?.stable) return 'Stable';
    return 'Unstable';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Scale
            </h3>
          </div>
          <Badge variant={getStatusColor() as any} size="sm">
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Status:
          </span>
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Weight Display */}
        {connected && reading && (
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              {formatWeight(reading.weight)} {reading.unit}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {reading.stable ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {reading.stable ? 'Stable' : 'Unstable'}
              </span>
            </div>
            {reading.locked && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Lock className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-600">Locked</span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-2">
          {!connected ? (
            <Button
              variant="pos-primary"
              size="sm"
              onClick={handleConnect}
              loading={isConnecting}
              className="w-full"
              leftIcon={isConnecting ? <Loader2 className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            >
              {isConnecting ? 'Connecting...' : 'Connect Scale'}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTare}
                loading={isTaring}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Tare
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLock}
                loading={isLocking}
                leftIcon={reading?.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              >
                {reading?.locked ? 'Unlock' : 'Lock'}
              </Button>
            </div>
          )}
          
          {connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              Disconnect
            </Button>
          )}
        </div>

        {/* Instructions */}
        {!connected && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Connect a USB or Bluetooth scale to enable weight-based transactions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
