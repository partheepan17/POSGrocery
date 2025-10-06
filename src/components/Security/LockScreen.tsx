/**
 * Lock Screen Component
 * Displays when the app is locked due to inactivity
 */

import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Monitor, Clock } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAppStore } from '@/store/appStore';
import { toast } from 'react-hot-toast';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ isLocked, onUnlock }) => {
  const { currentUser, terminal, securitySettings } = useAppStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Set lock time when screen locks
  useEffect(() => {
    if (isLocked && !lockTime) {
      setLockTime(new Date());
    }
    if (!isLocked) {
      setLockTime(null);
      setPin('');
      setAttempts(0);
    }
  }, [isLocked, lockTime]);

  // Focus PIN input when locked
  useEffect(() => {
    if (isLocked && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin.trim() || loading || !currentUser) {
      return;
    }

    setLoading(true);

    try {
      // Verify PIN matches current user
      const result = await authService.login(pin);
      
      if (result.success && result.user?.id === currentUser.id) {
        toast.success('Screen unlocked');
        onUnlock();
        setPin('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= securitySettings.maxPinAttempts) {
          toast.error('Too many failed attempts. Logging out for security.');
          authService.logout();
        } else {
          const remaining = securitySettings.maxPinAttempts - newAttempts;
          toast.error(`Incorrect PIN. ${remaining} attempts remaining.`);
        }
        
        setPin('');
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      toast.error('Unlock failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  const formatLockTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isLocked || !currentUser) {
    return null;
  }

  const remainingAttempts = Math.max(0, securitySettings.maxPinAttempts - attempts);

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
        }}></div>
      </div>

      {/* Lock screen content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Screen Locked</h1>
            <p className="text-blue-100">
              Enter your PIN to continue
            </p>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {currentUser.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentUser.role}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Monitor className="w-4 h-4" />
                  {terminal}
                </div>
                {lockTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    Locked at {formatLockTime(lockTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Attempts warning */}
            {attempts > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before logout
                </p>
              </div>
            )}
          </div>

          {/* PIN input */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your PIN
                </label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={loading}
                  placeholder="••••••"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
                
                <button
                  type="submit"
                  disabled={!pin.trim() || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {loading ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Locked due to inactivity after {securitySettings.inactivityMinutes} minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;







