/**
 * Login Page
 * Secure PIN-based authentication for cashiers and managers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  User, 
  Shield, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Delete,
  LogIn,
  Store
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { authService } from '@/services/authService';
import { shiftService } from '@/services/shiftService';
import { useAppStore } from '@/store/appStore';

interface LoginState {
  pin: string;
  loading: boolean;
  showPin: boolean;
  error: string | null;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setCurrentSession, terminal } = useAppStore();
  
  const [state, setState] = useState<LoginState>({
    pin: '',
    loading: false,
    showPin: false,
    error: null
  });

  // Handle PIN input
  const handlePinInput = useCallback((digit: string) => {
    if (state.pin.length < 6) {
      setState(prev => ({
        ...prev,
        pin: prev.pin + digit,
        error: null
      }));
    }
  }, [state.pin.length]);

  // Handle PIN deletion
  const handlePinDelete = useCallback(() => {
    setState(prev => ({
      ...prev,
      pin: prev.pin.slice(0, -1),
      error: null
    }));
  }, []);

  // Clear PIN
  const handlePinClear = useCallback(() => {
    setState(prev => ({
      ...prev,
      pin: '',
      error: null
    }));
  }, []);

  // Toggle PIN visibility
  const togglePinVisibility = useCallback(() => {
    setState(prev => ({ ...prev, showPin: !prev.showPin }));
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    if (state.pin.length < 4) {
      setState(prev => ({ ...prev, error: 'PIN must be at least 4 digits' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await authService.login(state.pin);
      
      if (result.success && result.user) {
        // Update app store
        setCurrentUser(result.user);
        
        // Check for existing open session
        const existingSession = await shiftService.getCurrentSession(result.user.id, terminal);
        
        if (existingSession) {
          // Resume existing session
          setCurrentSession(existingSession);
          toast.success(`Welcome back, ${result.user.name}! Session resumed.`);
          navigate('/sales');
        } else {
          // Prompt to start new session
          navigate('/shifts/new');
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Login failed',
          loading: false 
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Login failed. Please try again.',
        loading: false 
      }));
    }
  }, [state.pin, terminal, setCurrentUser, setCurrentSession, navigate]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for all handled keys
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Enter', 'Backspace', 'Escape'].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key >= '0' && event.key <= '9') {
        handlePinInput(event.key);
      } else if (event.key === 'Enter') {
        handleLogin();
      } else if (event.key === 'Backspace') {
        handlePinDelete();
      } else if (event.key === 'Escape') {
        handlePinClear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePinInput, handleLogin, handlePinDelete, handlePinClear]);

  // Auto-focus on mount
  useEffect(() => {
    // Focus the component for keyboard input
    const focusElement = document.getElementById('login-container');
    if (focusElement) {
      focusElement.focus();
    }
  }, []);

  const pinDisplay = state.showPin ? state.pin : '•'.repeat(state.pin.length);

  return (
    <div 
      id="login-container"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4"
      tabIndex={0}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30"></div>
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-4 flex items-center justify-center">
              <Store className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            POS System
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enter your PIN to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* PIN Display */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-white">Enter PIN</span>
              </div>
              <button
                onClick={togglePinVisibility}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={state.showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {state.showPin ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={pinDisplay}
                readOnly
                className={cn(
                  "w-full text-center text-2xl font-mono py-4 px-6 rounded-xl border-2 transition-all duration-200",
                  "bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white",
                  state.error 
                    ? "border-red-300 dark:border-red-600 focus:border-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:border-blue-500",
                  "focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900"
                )}
                placeholder="Enter your PIN"
              />
              
              {state.pin.length > 0 && (
                <button
                  onClick={handlePinClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Clear PIN (Esc)"
                >
                  <Delete className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={state.loading || state.pin.length >= 6}
                  className={cn(
                    "h-14 text-xl font-semibold rounded-xl transition-all duration-200",
                    "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white",
                    "hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95",
                    "focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                >
                  {digit}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Empty space */}
              <div></div>
              
              {/* Zero button */}
              <button
                onClick={() => handlePinInput('0')}
                disabled={state.loading || state.pin.length >= 6}
                className={cn(
                  "h-14 text-xl font-semibold rounded-xl transition-all duration-200",
                  "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white",
                  "hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95",
                  "focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
              >
                0
              </button>
              
              {/* Backspace button */}
              <button
                onClick={handlePinDelete}
                disabled={state.loading || state.pin.length === 0}
                className={cn(
                  "h-14 rounded-xl transition-all duration-200 flex items-center justify-center",
                  "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                  "hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-95",
                  "focus:outline-none focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
                title="Delete (Backspace)"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={state.loading || state.pin.length < 4}
              className={cn(
                "w-full h-14 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3",
                "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                "text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
                "focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
              )}
            >
              {state.loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Login (Enter)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Use the keypad or your keyboard to enter your PIN</p>
          <div className="flex items-center justify-center gap-6 text-xs">
            <span><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">Enter</kbd> Login</span>
            <span><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">Esc</kbd> Clear</span>
            <span><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">Backspace</kbd> Delete</span>
          </div>
        </div>

        {/* Role Indicators */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-white">Cashier</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access sales, reports, and shift management
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-white">Manager</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Full system access and approvals
            </p>
          </div>
        </div>

        {/* Terminal Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Terminal: <span className="font-mono font-medium">{terminal}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;





