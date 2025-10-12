import React, { useState, useEffect } from 'react';
import { Settings, Printer, Scale, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';

interface HardwareStatus {
  printer: 'online' | 'offline' | 'error';
  scale: 'stable' | 'unstable' | 'offline' | 'error';
  weight: number;
  isSimulating: boolean;
}

interface HardwareSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HardwareSimulator({ isOpen, onClose }: HardwareSimulatorProps) {
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus>({
    printer: 'online',
    scale: 'stable',
    weight: 0,
    isSimulating: false,
  });

  const [simulationSettings, setSimulationSettings] = useState({
    printerErrorRate: 0.1, // 10% chance of printer errors
    scaleInstabilityRate: 0.2, // 20% chance of scale instability
    weightFluctuationRange: 0.05, // ±5% weight fluctuation
    autoSimulate: false,
  });

  // Simulate hardware behavior
  useEffect(() => {
    if (!isOpen || !simulationSettings.autoSimulate) return;

    const interval = setInterval(() => {
      setHardwareStatus(prev => {
        const newStatus = { ...prev };

        // Simulate printer status changes
        if (Math.random() < simulationSettings.printerErrorRate) {
          newStatus.printer = Math.random() < 0.5 ? 'offline' : 'error';
        } else {
          newStatus.printer = 'online';
        }

        // Simulate scale status changes
        if (Math.random() < simulationSettings.scaleInstabilityRate) {
          newStatus.scale = Math.random() < 0.5 ? 'unstable' : 'offline';
        } else {
          newStatus.scale = 'stable';
        }

        // Simulate weight changes
        if (newStatus.scale === 'stable') {
          const fluctuation = (Math.random() - 0.5) * simulationSettings.weightFluctuationRange;
          newStatus.weight = Math.max(0, prev.weight + fluctuation);
        } else if (newStatus.scale === 'unstable') {
          newStatus.weight = Math.random() * 10; // Random weight when unstable
        } else {
          newStatus.weight = 0; // No weight when offline
        }

        return newStatus;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isOpen, simulationSettings]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'stable':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unstable':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'stable':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'unstable':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const simulatePrinterError = () => {
    setHardwareStatus(prev => ({
      ...prev,
      printer: 'error',
    }));
  };

  const simulatePrinterOffline = () => {
    setHardwareStatus(prev => ({
      ...prev,
      printer: 'offline',
    }));
  };

  const simulateScaleInstability = () => {
    setHardwareStatus(prev => ({
      ...prev,
      scale: 'unstable',
      weight: Math.random() * 10,
    }));
  };

  const simulateScaleOffline = () => {
    setHardwareStatus(prev => ({
      ...prev,
      scale: 'offline',
      weight: 0,
    }));
  };

  const resetHardware = () => {
    setHardwareStatus({
      printer: 'online',
      scale: 'stable',
      weight: 0,
      isSimulating: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader 
          title="Hardware Simulator (Dev Only)"
          className="flex flex-row items-center justify-between space-y-0 pb-4"
          action={
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
            </div>
          }
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hardware Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Printer Status */}
            <Card>
              <CardHeader 
                title="Printer Status"
                className="pb-2"
                action={<Printer className="w-4 h-4" />}
              />
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <Badge className={getStatusColor(hardwareStatus.printer)}>
                    {getStatusIcon(hardwareStatus.printer)}
                    <span className="ml-1 capitalize">{hardwareStatus.printer}</span>
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulatePrinterError}
                    className="flex-1"
                  >
                    Error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulatePrinterOffline}
                    className="flex-1"
                  >
                    Offline
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scale Status */}
            <Card>
              <CardHeader 
                title="Scale Status"
                className="pb-2"
                action={<Scale className="w-4 h-4" />}
              />
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <Badge className={getStatusColor(hardwareStatus.scale)}>
                    {getStatusIcon(hardwareStatus.scale)}
                    <span className="ml-1 capitalize">{hardwareStatus.scale}</span>
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulateScaleInstability}
                    className="flex-1"
                  >
                    Unstable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulateScaleOffline}
                    className="flex-1"
                  >
                    Offline
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weight Display */}
            <Card>
              <CardHeader 
                title="Weight Reading"
                className="pb-2"
                action={<Scale className="w-4 h-4" />}
              />
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {hardwareStatus.weight.toFixed(3)} kg
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {hardwareStatus.scale === 'stable' ? 'Stable' : 
                     hardwareStatus.scale === 'unstable' ? 'Fluctuating' : 'No Reading'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHardwareStatus(prev => ({
                    ...prev,
                    weight: Math.random() * 5
                  }))}
                  className="w-full"
                >
                  Random Weight
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Simulation Settings */}
          <Card>
            <CardHeader title="Simulation Settings" />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Simulation</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically simulate hardware changes
                  </div>
                </div>
                <Switch
                  checked={simulationSettings.autoSimulate}
                  onCheckedChange={(checked) => 
                    setSimulationSettings(prev => ({ ...prev, autoSimulate: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Printer Error Rate: {Math.round(simulationSettings.printerErrorRate * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={simulationSettings.printerErrorRate}
                    onChange={(e) => setSimulationSettings(prev => ({
                      ...prev,
                      printerErrorRate: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scale Instability Rate: {Math.round(simulationSettings.scaleInstabilityRate * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={simulationSettings.scaleInstabilityRate}
                    onChange={(e) => setSimulationSettings(prev => ({
                      ...prev,
                      scaleInstabilityRate: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Weight Fluctuation: ±{Math.round(simulationSettings.weightFluctuationRange * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={simulationSettings.weightFluctuationRange}
                    onChange={(e) => setSimulationSettings(prev => ({
                      ...prev,
                      weightFluctuationRange: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={resetHardware}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All Hardware
            </Button>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This simulator is only available in development mode
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
