/**
 * PIN Reset Dialog Component
 * Secure PIN reset with confirmation and validation
 */

import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userService, UserWithStatus } from '@/services/userService';

interface PinResetDialogProps {
  user: UserWithStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PinResetDialog: React.FC<PinResetDialogProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setErrors({});
      setShowPin(false);
      setShowConfirmPin(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate PIN
    if (!pin) {
      newErrors.pin = 'PIN is required';
    } else if (!/^\d{4,6}$/.test(pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }

    // Validate confirmation
    if (!confirmPin) {
      newErrors.confirmPin = 'Please confirm the PIN';
    } else if (pin !== confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await userService.setPin(user.id, pin);
      toast.success(`PIN reset successfully for ${user.name}`);
      onSuccess();
    } catch (error) {
      console.error('Failed to reset PIN:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
    
    // Clear errors when user types
    if (errors.pin) {
      setErrors(prev => ({ ...prev, pin: '' }));
    }
  };

  const handleConfirmPinChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(digits);
    
    // Clear errors when user types
    if (errors.confirmPin) {
      setErrors(prev => ({ ...prev, confirmPin: '' }));
    }
  };

  const getPinStrength = (pinValue: string): { level: string; color: string } => {
    if (pinValue.length < 4) {
      return { level: 'Too Short', color: 'text-red-600 dark:text-red-400' };
    } else if (pinValue.length === 4) {
      return { level: 'Weak', color: 'text-amber-600 dark:text-amber-400' };
    } else if (pinValue.length === 5) {
      return { level: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    } else {
      return { level: 'Strong', color: 'text-green-600 dark:text-green-400' };
    }
  };

  if (!isOpen) return null;

  const pinStrength = getPinStrength(pin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reset PIN
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set new PIN for {user.name}
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

        {/* Warning */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">Security Notice</p>
              <p>
                This will reset the user's PIN and clear any existing lockouts. 
                The user will be able to log in immediately with the new PIN.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* New PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New PIN *
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.pin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="••••••"
                maxLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.pin && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pin}</p>
            )}
            {pin && (
              <p className={`mt-1 text-sm ${pinStrength.color}`}>
                Strength: {pinStrength.level}
              </p>
            )}
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm PIN *
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="••••••"
                maxLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPin && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPin}</p>
            )}
            {confirmPin && pin && (
              <p className={`mt-1 text-sm ${
                pin === confirmPin 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {pin === confirmPin ? '✓ PINs match' : '✗ PINs do not match'}
              </p>
            )}
          </div>

          {/* PIN Guidelines */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              PIN Guidelines:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Must be 4-6 digits long</li>
              <li>• Only numbers are allowed</li>
              <li>• Longer PINs are more secure</li>
              <li>• Avoid obvious patterns (1234, 0000)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || !pin || !confirmPin || pin !== confirmPin}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinResetDialog;







