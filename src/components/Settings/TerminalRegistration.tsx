import React, { useState, useEffect } from 'react';
import { Monitor, Plus, CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useSettingsStore, TerminalInfo } from '@/store/settingsStore';
import { terminalService } from '@/services/terminalService';

interface TerminalRegistrationProps {
  onTerminalChange?: (terminal: TerminalInfo) => void;
}

export function TerminalRegistration({ onTerminalChange }: TerminalRegistrationProps) {
  const { currentTerminal, setCurrentTerminal } = useSettingsStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    description: ''
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load current terminal info
  useEffect(() => {
    loadCurrentTerminal();
  }, []);

  const loadCurrentTerminal = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement these methods in TerminalService
      const terminalId = 'TERM-001'; // Mock implementation
      const terminalName = 'Main Terminal'; // Mock implementation
      
      if (terminalId && terminalName) {
        // TODO: Implement getTerminalDetails method in TerminalService
        const terminal = { id: terminalId, name: terminalName, description: 'Main terminal', is_active: true, created_at: new Date().toISOString() }; // Mock implementation
        setCurrentTerminal({
          id: typeof terminal.id === 'string' ? parseInt(terminal.id) : terminal.id,
          name: terminal.name,
          description: terminal.description || null,
          isActive: Boolean(terminal.is_active),
          lastSeen: terminal.created_at || null
        });
        onTerminalChange?.({
          id: typeof terminal.id === 'string' ? parseInt(terminal.id) : terminal.id,
          name: terminal.name,
          description: terminal.description || null,
          isActive: Boolean(terminal.is_active),
          lastSeen: terminal.created_at || null
        });
      }
    } catch (error) {
      console.error('Failed to load terminal details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTerminal = async () => {
    if (!registerForm.name.trim()) {
      toast.error('Terminal name is required');
      return;
    }

    try {
      setIsRegistering(true);
      // TODO: Implement registerTerminal method in TerminalService
      const result = { 
        success: true, 
        terminalId: 'TERM-002',
        terminal: {
          id: 'TERM-002',
          name: registerForm.name,
          description: registerForm.description,
          is_active: true
        }
      }; // Mock implementation
      
      toast.success(`Terminal "${result.terminal.name}" registered successfully`);

      // Update state
      setCurrentTerminal({
        id: parseInt(result.terminalId),
        name: result.terminal.name,
        description: result.terminal.description || null,
        isActive: Boolean(result.terminal.is_active),
        lastSeen: new Date().toISOString()
      });

      onTerminalChange?.({
        id: parseInt(result.terminalId),
        name: result.terminal.name,
        description: result.terminal.description || null,
        isActive: Boolean(result.terminal.is_active),
        lastSeen: new Date().toISOString()
      });

      setShowRegisterForm(false);
      setRegisterForm({ name: '', description: '' });
    } catch (error: any) {
      console.error('Failed to register terminal:', error);
      toast.error(error.message || 'Failed to register terminal');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRefresh = () => {
    loadCurrentTerminal();
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4 text-red-500" />;
    if (!currentTerminal.id) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!currentTerminal.id) return 'Not Registered';
    return 'Registered';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (!currentTerminal.id) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Terminal Registration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!currentTerminal.id && (
              <Button
                onClick={() => setShowRegisterForm(!showRegisterForm)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Register
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Terminal Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentTerminal.name || 'No Terminal Registered'}
              </div>
              {currentTerminal.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {currentTerminal.description}
                </div>
              )}
            </div>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {/* Terminal Details */}
        {currentTerminal.id && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Terminal ID:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentTerminal.id}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentTerminal.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Last Seen:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentTerminal.lastSeen 
                  ? new Date(currentTerminal.lastSeen).toLocaleString()
                  : 'Never'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Connection:</span>
              <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    Offline
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {showRegisterForm && (
          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Register New Terminal
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Terminal Name *
                </label>
                <Input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., POS-001, Checkout-1"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <Input
                  type="text"
                  value={registerForm.description}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Main checkout counter"
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRegisterTerminal}
                disabled={isRegistering || !registerForm.name.trim()}
                className="gap-2"
              >
                {isRegistering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isRegistering ? 'Registering...' : 'Register Terminal'}
              </Button>
              <Button
                onClick={() => setShowRegisterForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!currentTerminal.id && (
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">
              Terminal Registration Required
            </div>
            <div>
              Register this terminal to enable multi-terminal support and track sales by location.
              Each terminal will have its own settings and can be managed independently.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
