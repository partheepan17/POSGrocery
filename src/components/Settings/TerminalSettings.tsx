/**
 * Terminal Settings Component
 * Manages terminal registration and selection for multi-terminal support
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { 
  Monitor, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { terminalService } from '@/services/terminalService';

// TODO: Move these types to a shared types file
interface Terminal {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  lastSeen?: string;
  is_active?: boolean; // Alternative field name
  total_sales?: number;
  total_revenue?: number;
  created_at?: string;
  last_activity?: string;
}

interface TerminalSettings {
  // TODO: Define terminal settings interface
}
import { toast } from 'react-hot-toast';

interface TerminalSettingsProps {
  onTerminalChange?: (terminalId: number | null, terminalName: string | null) => void;
}

export const TerminalSettingsComponent: React.FC<TerminalSettingsProps> = ({ onTerminalChange }) => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    description: ''
  });
  const [settings, setSettings] = useState<TerminalSettings>({}); // TODO: Implement getDefaultSettings method
  const [isOnline, setIsOnline] = useState(true);

  // Load terminals and current terminal on mount
  useEffect(() => {
    loadTerminals();
    loadCurrentTerminal();
    startHeartbeat();
  }, []);

  // Load terminals from API
  const loadTerminals = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement getTerminals method in TerminalService
      const terminalList: Terminal[] = []; // Mock implementation
      setTerminals(terminalList);
    } catch (error) {
      console.error('Failed to load terminals:', error);
      toast.error('Failed to load terminals');
    } finally {
      setIsLoading(false);
    }
  };

  // Load current terminal
  const loadCurrentTerminal = async () => {
    // TODO: Implement these methods in TerminalService
    const terminalId = 'TERM-001'; // Mock implementation
    const terminalName = 'Main Terminal'; // Mock implementation
    
    if (terminalId && terminalName) {
      try {
        // TODO: Implement getTerminalDetails method in TerminalService
        const terminal: Terminal = { id: parseInt(terminalId), name: terminalName, description: 'Main terminal', isActive: true, is_active: true, created_at: new Date().toISOString() }; // Mock implementation
        setSelectedTerminal(terminal);
        setSettings({}); // TODO: Implement getDefaultSettings method
      } catch (error) {
        console.error('Failed to load terminal details:', error);
      }
    }
  };

  // Start heartbeat
  const startHeartbeat = () => {
    // TODO: Implement startHeartbeat method in TerminalService
    console.log('Starting heartbeat'); // Mock implementation
  };

  // Register new terminal
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
          id: 2,
          name: registerForm.name,
          description: registerForm.description,
          isActive: true,
          is_active: true
        }
      }; // Mock implementation
      
      toast.success(`Terminal "${result.terminal.name}" registered successfully`);

      // Update state
      setSelectedTerminal(result.terminal);
      setTerminals(prev => [result.terminal, ...prev]);
      setShowRegisterForm(false);
      setRegisterForm({ name: '', description: '' });
      
      // Notify parent component
      onTerminalChange?.(result.terminal.id, result.terminal.name);
    } catch (error: any) {
      console.error('Failed to register terminal:', error);
      toast.error(error.message || 'Failed to register terminal');
    } finally {
      setIsRegistering(false);
    }
  };

  // Select existing terminal
  const handleSelectTerminal = async (terminalId: number) => {
    try {
      // TODO: Implement getTerminalDetails method in TerminalService
      const terminal: Terminal = { id: terminalId, name: 'Terminal ' + terminalId, description: 'Terminal description', isActive: true, is_active: true, created_at: new Date().toISOString() }; // Mock implementation
      // TODO: Implement selectTerminal method in TerminalService
      console.log('Selecting terminal:', terminalId, terminal.name); // Mock implementation
      
      setSelectedTerminal(terminal);
      setSettings((terminal as any).settings || {}); // TODO: Implement getDefaultSettings method
      
      toast.success(`Switched to terminal "${terminal.name}"`);

      // Notify parent component
      onTerminalChange?.(terminalId, terminal.name);
    } catch (error: any) {
      console.error('Failed to select terminal:', error);
      toast.error(error.message || 'Failed to select terminal');
    }
  };

  // Update terminal settings
  const handleUpdateSettings = async (key: any, value: any) => {
    if (!selectedTerminal) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // TODO: Implement updateTerminalSettings method in TerminalService
      console.log('Updating terminal settings:', selectedTerminal.id, { [key]: value }); // Mock implementation
      
      toast.success('Settings updated successfully');
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      toast.error(error.message || 'Failed to update settings');
      
      // Revert on error
      setSettings(settings);
    }
  };

  // Clear terminal selection
  const handleClearTerminal = () => {
    // TODO: Implement clearTerminal method in TerminalService
    console.log('Clearing terminal'); // Mock implementation
    setSelectedTerminal(null);
    setSettings({}); // TODO: Implement getDefaultSettings method
    
    toast.success('Terminal selection cleared');

    // Notify parent component
    onTerminalChange?.(null, null);
  };

  return (
    <div className="space-y-6">
      {/* Current Terminal Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Current Terminal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTerminal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTerminal.name}</h3>
                  {selectedTerminal.description && (
                    <p className="text-sm text-gray-600">{selectedTerminal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  <Badge variant={selectedTerminal.is_active ? 'default' : 'secondary'}>
                    {selectedTerminal.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Sales:</span> {selectedTerminal.total_sales || 0}
                </div>
                <div>
                  <span className="font-medium">Revenue:</span> ${(selectedTerminal.total_revenue || 0).toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date((selectedTerminal as any).created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last Activity:</span> {
                    (selectedTerminal as any).last_activity 
                      ? new Date((selectedTerminal as any).last_activity).toLocaleString()
                      : 'Never'
                  }
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={handleClearTerminal}
                className="w-full"
              >
                Clear Terminal Selection
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Terminal Selected</h3>
              <p className="text-gray-600 mb-4">
                Please register a new terminal or select an existing one to continue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terminal Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Terminal Management
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTerminals}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading terminals...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select Existing Terminal */}
              <div>
                <Label htmlFor="terminal-select">Select Terminal</Label>
                <Select
                  value={selectedTerminal?.id.toString() || ''}
                  onValueChange={(value) => handleSelectTerminal(parseInt(value))}
                  options={terminals.map((terminal) => ({
                    value: terminal.id.toString(),
                    label: `${terminal.name} (${terminal.is_active || terminal.isActive ? 'Active' : 'Inactive'})`
                  }))}
                />
              </div>

              {/* Register New Terminal */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Register New Terminal</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegisterForm(!showRegisterForm)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {showRegisterForm ? 'Cancel' : 'New Terminal'}
                  </Button>
                </div>

                {showRegisterForm && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div>
                      <Label htmlFor="terminal-name">Terminal Name *</Label>
                      <Input
                        id="terminal-name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Cash Register 1, Kiosk 2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="terminal-description">Description</Label>
                      <textarea
                        id="terminal-description"
                        value={registerForm.description}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button
                      onClick={handleRegisterTerminal}
                      disabled={isRegistering || !registerForm.name.trim()}
                      className="w-full"
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Register Terminal
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terminal Settings */}
      {selectedTerminal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Terminal Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Hardware Settings */}
              <div>
                <h4 className="font-medium mb-4">Hardware Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="receipt-printer">Receipt Printer</Label>
                      <p className="text-sm text-gray-600">Enable receipt printing for this terminal</p>
                    </div>
                    <Switch
                      id="receipt-printer"
                      checked={(settings as any).receipt_printer_enabled}
                      onCheckedChange={(checked) => handleUpdateSettings('receipt_printer_enabled' as any, checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="cash-drawer">Cash Drawer</Label>
                      <p className="text-sm text-gray-600">Enable cash drawer for this terminal</p>
                    </div>
                    <Switch
                      id="cash-drawer"
                      checked={(settings as any).cash_drawer_enabled}
                      onCheckedChange={(checked) => handleUpdateSettings('cash_drawer_enabled' as any, checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="barcode-scanner">Barcode Scanner</Label>
                      <p className="text-sm text-gray-600">Enable barcode scanning for this terminal</p>
                    </div>
                    <Switch
                      id="barcode-scanner"
                      checked={(settings as any).barcode_scanner_enabled}
                      onCheckedChange={(checked) => handleUpdateSettings('barcode_scanner_enabled' as any, checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Display Settings */}
              <div>
                <h4 className="font-medium mb-4">Display Settings</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="display-mode">Display Mode</Label>
                    <Select
                      value={(settings as any).display_mode}
                      onValueChange={(value) => handleUpdateSettings('display_mode' as any, value as 'portrait' | 'landscape')}
                      options={[
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'landscape', label: 'Landscape' }
                      ]}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-print">Auto Print Receipts</Label>
                      <p className="text-sm text-gray-600">Automatically print receipts after each sale</p>
                    </div>
                    <Switch
                      id="auto-print"
                      checked={(settings as any).auto_receipt_print}
                      onCheckedChange={(checked) => handleUpdateSettings('auto_receipt_print' as any, checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Settings */}
              <div>
                <h4 className="font-medium mb-4">Receipt Settings</h4>
                <div>
                  <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
                  <Textarea
                    id="receipt-footer"
                    value={(settings as any).receipt_footer_text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdateSettings('receipt_footer_text' as any, e.target.value)}
                    placeholder="Custom footer text for receipts..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TerminalSettingsComponent;
