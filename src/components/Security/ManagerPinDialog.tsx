/**
 * Manager PIN Dialog
 * Modal for capturing manager/admin PIN for escalation
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, AlertTriangle, Clock } from 'lucide-react';
import { authService } from '@/services/authService';
import { Permission, Role } from '@/security/permissions';
import { useAppStore } from '@/store/appStore';
import { toast } from 'react-hot-toast';

interface ManagerPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: Permission[];
  reason?: string;
  requiredRole?: Role;
  onSuccess: (user: any) => void;
  onError: (error: string) => void;
}

const ManagerPinDialog: React.FC<ManagerPinDialogProps> = ({
  isOpen,
  onClose,
  permissions,
  reason,
  requiredRole = 'MANAGER',
  onSuccess,
  onError
}) => {
  const { securitySettings } = useAppStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Focus PIN input when dialog opens
  useEffect(() => {
    if (isOpen && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle lockout countdown
  useEffect(() => {
    if (lockoutEnd) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.ceil((lockoutEnd.getTime() - now.getTime()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          setLockoutEnd(null);
          setAttempts(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutEnd]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setLoading(false);
      setAttempts(0);
      setLockoutEnd(null);
      setTimeLeft(0);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin.trim() || loading || lockoutEnd) {
      return;
    }

    setLoading(true);

    try {
      const result = await authService.verifyPinForEscalation(pin, requiredRole);
      
      if (result.success && result.user) {
        toast.success(`Access granted by ${result.user.name}`);
        onSuccess(result.user);
        onClose();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= securitySettings.maxPinAttempts) {
          const lockout = new Date();
          lockout.setMinutes(lockout.getMinutes() + securitySettings.lockoutMinutes);
          setLockoutEnd(lockout);
          toast.error(`Too many failed attempts. Locked for ${securitySettings.lockoutMinutes} minutes.`);
        } else {
          const remaining = securitySettings.maxPinAttempts - newAttempts;
          toast.error(`${result.error || 'Invalid PIN'}. ${remaining} attempts remaining.`);
        }
        
        onError(result.error || 'Invalid PIN');
        setPin('');
      }
    } catch (error) {
      console.error('PIN verification failed:', error);
      toast.error('Verification failed');
      onError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const isLocked = Boolean(lockoutEnd && timeLeft > 0);
  const remainingAttempts = Math.max(0, securitySettings.maxPinAttempts - attempts);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manager Authorization Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter {requiredRole.toLowerCase()} PIN to continue
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Permissions being requested */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Requesting access to:
            </p>
            <div className="space-y-1">
              {permissions.map((perm) => (
                <div key={perm} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  {perm.replace(/_/g, ' ').toLowerCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          {reason && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Reason:</strong> {reason}
              </p>
            </div>
          )}

          {/* Lockout warning */}
          {isLocked && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Account locked. Try again in {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          )}

          {/* Attempts warning */}
          {!isLocked && attempts > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </span>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {requiredRole} PIN
              </label>
              <input
                ref={pinInputRef}
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || isLocked}
                placeholder="Enter PIN..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono tracking-widest focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                maxLength={6}
                autoComplete="off"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={!pin.trim() || loading || isLocked}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Authorize'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManagerPinDialog;
