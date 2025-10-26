/**
 * Undo Snackbar Component
 * Provides 10-minute soft undo functionality with audit trail backing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { X, Undo2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoAction {
  id: string;
  type: 'feature_toggle' | 'role_override' | 'permission_change';
  featureCode: string;
  previousState: boolean;
  newState: boolean;
  auditId: number;
  timestamp: number;
  description: string;
  tenantId: string;
  userId: string;
}

interface UndoSnackbarProps {
  action: UndoAction | null;
  onUndo: (action: UndoAction) => Promise<void>;
  onDismiss: () => void;
  className?: string;
}

const UNDO_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
const VISIBILITY_TIMEOUT = 5 * 1000; // 5 seconds for auto-hide

export function UndoSnackbar({ action, onUndo, onDismiss, className }: UndoSnackbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(UNDO_TIMEOUT);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (action) {
      setIsVisible(true);
      setTimeRemaining(UNDO_TIMEOUT);
      
      // Auto-hide after 5 seconds if not interacted with
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, VISIBILITY_TIMEOUT);

      return () => clearTimeout(hideTimer);
    } else {
      setIsVisible(false);
    }
  }, [action, onDismiss]);

  useEffect(() => {
    if (!isVisible || !action) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, action, onDismiss]);

  const handleUndo = useCallback(async () => {
    if (!action || isUndoing) return;

    setIsUndoing(true);
    try {
      await onUndo(action);
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    } catch (error) {
      console.error('Failed to undo action:', error);
      // Keep snackbar visible on error
    } finally {
      setIsUndoing(false);
    }
  }, [action, onUndo, isUndoing]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getActionDescription = (action: UndoAction) => {
    switch (action.type) {
      case 'feature_toggle':
        return `${action.featureCode} ${action.newState ? 'enabled' : 'disabled'}`;
      case 'role_override':
        return `Role override for ${action.featureCode}`;
      case 'permission_change':
        return `Permission changed for ${action.featureCode}`;
      default:
        return action.description;
    }
  };

  if (!action || !isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 transition-all duration-300",
      isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      className
    )}>
      <Card className="shadow-lg border-l-4 border-l-blue-500 min-w-80 max-w-md">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Undo2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">
                  Action completed
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {getActionDescription(action)}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Undo available for {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing}
                className="h-8 px-3 text-xs"
              >
                {isUndoing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                    Undoing...
                  </>
                ) : (
                  <>
                    <Undo2 className="h-3 w-3 mr-1" />
                    Undo
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing undo actions
export function useUndoActions() {
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]);

  const createUndoAction = useCallback((
    type: UndoAction['type'],
    featureCode: string,
    previousState: boolean,
    newState: boolean,
    auditId: number,
    description: string,
    tenantId: string,
    userId: string
  ) => {
    const action: UndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      featureCode,
      previousState,
      newState,
      auditId,
      timestamp: Date.now(),
      description,
      tenantId,
      userId
    };

    setUndoAction(action);
    setUndoHistory(prev => [action, ...prev.slice(0, 9)]); // Keep last 10 actions
  }, []);

  const handleUndo = useCallback(async (action: UndoAction) => {
    try {
      // Call API to undo the action using audit ID
      const response = await fetch('/api/admin/features/undo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          auditId: action.auditId,
          tenantId: action.tenantId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to undo action');
      }

      // Remove from history
      setUndoHistory(prev => prev.filter(a => a.id !== action.id));
      
      return await response.json();
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  const clearHistory = useCallback(() => {
    setUndoHistory([]);
  }, []);

  return {
    undoAction,
    undoHistory,
    createUndoAction,
    handleUndo,
    dismissUndo,
    clearHistory
  };
}










