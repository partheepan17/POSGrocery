import React, { useState } from 'react';
import { Settings, Bug, Monitor, Database, Network, Code, TestTube } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { HardwareSimulator } from './HardwareSimulator';

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevTools({ isOpen, onClose }: DevToolsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'hardware' | 'network' | 'database' | 'testing'>('overview');
  const [hardwareSimulatorOpen, setHardwareSimulatorOpen] = useState(false);

  if (!isOpen) return null;

  const devTools = [
    {
      id: 'hardware',
      title: 'Hardware Simulator',
      description: 'Simulate printer and scale status',
      icon: <Monitor className="w-5 h-5" />,
      action: () => setHardwareSimulatorOpen(true),
    },
    {
      id: 'network',
      title: 'Network Monitor',
      description: 'Monitor API calls and performance',
      icon: <Network className="w-5 h-5" />,
      action: () => console.log('Network monitor not implemented'),
    },
    {
      id: 'database',
      title: 'Database Inspector',
      description: 'Inspect local database state',
      icon: <Database className="w-5 h-5" />,
      action: () => console.log('Database inspector not implemented'),
    },
    {
      id: 'testing',
      title: 'Test Runner',
      description: 'Run tests and view results',
      icon: <TestTube className="w-5 h-5" />,
      action: () => console.log('Test runner not implemented'),
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardHeader 
            title="Developer Tools"
            className="flex flex-row items-center justify-between space-y-0 pb-4"
            action={<Bug className="w-5 h-5" />}
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
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'hardware', label: 'Hardware' },
                { id: 'network', label: 'Network' },
                { id: 'database', label: 'Database' },
                { id: 'testing', label: 'Testing' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {devTools.map((tool) => (
                      <Card
                        key={tool.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={tool.action}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {tool.icon}
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {tool.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader title="System Information" />
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Environment:</span>
                        <span className="font-mono">{import.meta.env.MODE}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">API Base URL:</span>
                        <span className="font-mono">{import.meta.env.VITE_API_BASE_URL}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">User Agent:</span>
                        <span className="font-mono text-xs">{navigator.userAgent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Screen Resolution:</span>
                        <span className="font-mono">{screen.width}x{screen.height}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'hardware' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Hardware Simulation" />
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Simulate various hardware states for testing purposes. This helps QA teams
                        reproduce edge cases without needing actual hardware.
                      </p>
                      <Button
                        onClick={() => setHardwareSimulatorOpen(true)}
                        className="w-full"
                      >
                        Open Hardware Simulator
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'network' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Network Monitoring" />
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Network monitoring tools will be available here in future updates.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'database' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Database Inspector" />
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Database inspection tools will be available here in future updates.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'testing' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Test Runner" />
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Test runner tools will be available here in future updates.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Simulator Modal */}
      <HardwareSimulator
        isOpen={hardwareSimulatorOpen}
        onClose={() => setHardwareSimulatorOpen(false)}
      />
    </>
  );
}
