import React, { useState } from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw, Trash2, Eye } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';
import { useOfflineQueue, useOfflineQueueOperations } from '@/hooks/useOfflineQueue';

interface OfflineQueueStatusProps {
  className?: string;
}

export function OfflineQueueStatus({ className }: OfflineQueueStatusProps) {
  const { 
    stats, 
    isOnline, 
    hasPendingOperations, 
    hasFailedOperations,
    pendingCount,
    failedCount 
  } = useOfflineQueue();
  
  const { 
    operations, 
    loading, 
    retryOperation, 
    removeOperation, 
    retryAllFailed, 
    clearCompleted,
    loadOperations 
  } = useOfflineQueueOperations();
  
  const [showDetails, setShowDetails] = useState(false);

  if (!hasPendingOperations && !hasFailedOperations && isOnline) {
    return null;
  }

  return (
    <div className={className}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        
        <div className="flex items-center gap-2">
          {hasPendingOperations && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          )}
          
          {hasFailedOperations && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {failedCount} failed
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="h-6 px-2"
        >
          <Eye className="w-3 h-3" />
        </Button>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <Card className="absolute top-full right-0 mt-2 w-96 z-50">
          <CardHeader 
            title="Offline Queue"
            className="pb-3"
            action={
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Offline
                  </Badge>
                )}
              </div>
            }
          />
          
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                <span className="font-medium text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Processing:</span>
                <span className="font-medium text-blue-600">{stats.processing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                <span className="font-medium text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                <span className="font-medium text-red-600">{stats.failed}</span>
              </div>
            </div>

            {/* Operations List */}
            {operations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Recent Operations
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {operations.slice(0, 5).map((operation) => (
                    <div
                      key={operation.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {operation.status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                        {operation.status === 'processing' && <AlertTriangle className="w-3 h-3 text-blue-500" />}
                        {operation.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {operation.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                        
                        <span className="font-medium">
                          {operation.type}:{operation.action}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {operation.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {operation.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryOperation(operation.id)}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOperation(operation.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {hasFailedOperations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryAllFailed}
                  className="flex-1"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry Failed
                </Button>
              )}
              
              {stats.completed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  className="flex-1"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear Completed
                </Button>
              )}
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadOperations()}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
