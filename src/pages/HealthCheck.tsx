/**
 * Health Check Page
 * Comprehensive system health monitoring and diagnostics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Download, 
  Search, 
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Server,
  Database,
  Settings,
  Zap,
  TrendingUp,
  Clock,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { healthService, HealthReport, HealthItem, HealthStatus } from '@/services/healthService';
import { csvService } from '@/services/csvService';
import { StatusBadge } from '@/components/Badges/StatusBadge';
import { HealthSection } from '@/components/Health/Section';

interface HealthCheckState {
  report: HealthReport | null;
  loading: boolean;
  exporting: boolean;
  filter: string;
  lastRun: string | null;
  runningBackup: boolean;
}

const HealthCheck: React.FC = () => {
  const [state, setState] = useState<HealthCheckState>({
    report: null,
    loading: false,
    exporting: false,
    filter: '',
    lastRun: null,
    runningBackup: false
  });

  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);

  // Run health checks
  const runHealthChecks = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('🏥 Starting health checks...');
      const report = await healthService.runHealthChecks();
      
      setState(prev => ({ 
        ...prev, 
        report, 
        loading: false,
        lastRun: new Date().toISOString()
      }));

      // Show toast based on overall status
      const { overall, items } = report;
      const failCount = items.filter(item => item.status === 'FAIL').length;
      const warnCount = items.filter(item => item.status === 'WARN').length;

      if (overall === 'FAIL') {
        toast.error(`Health check failed - ${failCount} critical issue${failCount !== 1 ? 's' : ''} found`);
      } else if (overall === 'WARN') {
        toast(`Health check completed with ${warnCount} warning${warnCount !== 1 ? 's' : ''}`, {
          icon: '⚠️'
        });
      } else {
        toast.success('All health checks passed!');
      }

    } catch (error) {
      console.error('Health check failed:', error);
      setState(prev => ({ ...prev, loading: false }));
      toast.error('Health check failed to complete');
    }
  }, []);

  // Export health report to CSV
  const exportHealthReport = useCallback(async () => {
    if (!state.report) {
      toast.error('No health report available to export');
      return;
    }

    setState(prev => ({ ...prev, exporting: true }));

    try {
      await csvService.exportHealthCSV(state.report);
      toast.success('Health report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export health report');
    } finally {
      setState(prev => ({ ...prev, exporting: false }));
    }
  }, [state.report]);

  // Run manual backup
  const runManualBackup = useCallback(async () => {
    setState(prev => ({ ...prev, runningBackup: true }));
    
    try {
      // Simulate backup process for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Manual backup completed successfully');
      
      // Re-run health checks to update backup status
      setTimeout(() => {
        runHealthChecks();
      }, 1000);
      
    } catch (error) {
      console.error('Manual backup failed:', error);
      toast.error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setState(prev => ({ ...prev, runningBackup: false }));
    }
  }, [runHealthChecks]);

  // Copy summary to clipboard
  const copySummary = useCallback(async () => {
    if (!state.report) return;

    const { overall, items } = state.report;
    const failItems = items.filter(item => item.status === 'FAIL');
    const warnItems = items.filter(item => item.status === 'WARN');

    let summary = `Health Check Summary - Overall: ${overall}\n`;
    summary += `Run at: ${new Date(state.report.ranAt).toLocaleString()}\n`;
    summary += `Duration: ${state.report.durationMs}ms\n\n`;

    if (failItems.length > 0) {
      summary += `FAILED CHECKS (${failItems.length}):\n`;
      failItems.forEach(item => {
        summary += `• ${item.label}: ${item.details || 'Failed'}\n`;
        if (item.suggestion) {
          summary += `  → ${item.suggestion}\n`;
        }
      });
      summary += '\n';
    }

    if (warnItems.length > 0) {
      summary += `WARNINGS (${warnItems.length}):\n`;
      warnItems.forEach(item => {
        summary += `• ${item.label}: ${item.details || 'Warning'}\n`;
      });
    }

    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Summary copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy summary');
    }
  }, [state.report]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search on "/"
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchInputRef?.focus();
        return;
      }

      // Run checks on "R"
      if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) {
        if (document.activeElement?.tagName !== 'INPUT') {
          event.preventDefault();
          runHealthChecks();
          return;
        }
      }

      // Export on "Ctrl+E"
      if (event.key.toLowerCase() === 'e' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        exportHealthReport();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [runHealthChecks, exportHealthReport, searchInputRef]);

  // Auto-run on first visit
  useEffect(() => {
    if (!state.report && !state.loading) {
      runHealthChecks();
    }
  }, [runHealthChecks, state.report, state.loading]);

  // Filter items based on search
  const filteredItems = state.report?.items.filter(item => {
    if (!state.filter) return true;
    const searchTerm = state.filter.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchTerm) ||
      item.status.toLowerCase().includes(searchTerm) ||
      item.details?.toLowerCase().includes(searchTerm) ||
      item.key.toLowerCase().includes(searchTerm)
    );
  }) || [];

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    let category = 'System';
    
    if (item.key.includes('database') || item.key.includes('data')) {
      category = 'Database & Data';
    } else if (item.key.includes('backup') || item.key.includes('scheduler')) {
      category = 'Backup & Scheduling';
    } else if (item.key.includes('device') || item.key.includes('storage')) {
      category = 'Hardware & Storage';
    } else if (item.key.includes('service-worker') || item.key.includes('i18n')) {
      category = 'Application Services';
    } else if (item.key.includes('app-version') || item.key.includes('environment') || item.key.includes('settings')) {
      category = 'Configuration';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, HealthItem[]>);

  // Get overall status info
  const getOverallStatusInfo = () => {
    if (!state.report) return null;
    
    const { overall, items } = state.report;
    const failCount = items.filter(item => item.status === 'FAIL').length;
    const warnCount = items.filter(item => item.status === 'WARN').length;
    const okCount = items.filter(item => item.status === 'OK').length;

    return { overall, failCount, warnCount, okCount };
  };

  const statusInfo = getOverallStatusInfo();

  // Get failing items for suggestions
  const failingItems = state.report?.items.filter(item => item.status === 'FAIL' && item.suggestion) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-white/20 rounded-full blur"></div>
                  <Activity className="relative h-12 w-12 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    System Health Dashboard
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Real-time monitoring and diagnostics for your POS system
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              {state.report && (
                <div className="flex gap-4">
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center min-w-[80px]">
                    <div className="text-2xl font-bold">{statusInfo?.okCount || 0}</div>
                    <div className="text-xs text-blue-100">Healthy</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center min-w-[80px]">
                    <div className="text-2xl font-bold">{statusInfo?.warnCount || 0}</div>
                    <div className="text-xs text-blue-100">Warnings</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center min-w-[80px]">
                    <div className="text-2xl font-bold">{statusInfo?.failCount || 0}</div>
                    <div className="text-xs text-blue-100">Issues</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
            <Sparkles className="h-32 w-32 text-white/10" />
          </div>
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12">
            <Shield className="h-24 w-24 text-white/10" />
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and maintain system health</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={runHealthChecks}
                disabled={state.loading}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200",
                  "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                  "text-white shadow-lg hover:shadow-xl transform hover:scale-105",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
                title="Run Checks (R)"
              >
                <RefreshCw className={cn("h-4 w-4", state.loading && "animate-spin")} />
                {state.loading ? 'Running Diagnostics...' : 'Run Health Check'}
              </button>

              <button
                onClick={exportHealthReport}
                disabled={!state.report || state.exporting}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
                  "text-white shadow-lg hover:shadow-xl transform hover:scale-105",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
                title="Export CSV (Ctrl+E)"
              >
                <Download className="h-4 w-4" />
                {state.exporting ? 'Exporting...' : 'Export Report'}
              </button>

              <button
                onClick={runManualBackup}
                disabled={state.runningBackup}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800",
                  "text-white shadow-lg hover:shadow-xl transform hover:scale-105",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
                title="Run Manual Backup"
              >
                <Shield className={cn("h-4 w-4", state.runningBackup && "animate-pulse")} />
                {state.runningBackup ? 'Backing up...' : 'Create Backup'}
              </button>

              {state.report && (
                <button
                  onClick={copySummary}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                    "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800",
                    "text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  )}
                  title="Copy Summary"
                >
                  <Copy className="h-4 w-4" />
                  Copy Summary
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Overall Status Banner */}
        {statusInfo && (
          <div className={cn(
            "rounded-2xl p-6 border shadow-lg backdrop-blur-sm",
            statusInfo.overall === 'OK' && "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700",
            statusInfo.overall === 'WARN' && "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-900/20 dark:to-yellow-900/20 dark:border-amber-700",
            statusInfo.overall === 'FAIL' && "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 dark:from-red-900/20 dark:to-rose-900/20 dark:border-red-700"
          )}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  statusInfo.overall === 'OK' && "bg-green-100 dark:bg-green-800/50",
                  statusInfo.overall === 'WARN' && "bg-amber-100 dark:bg-amber-800/50",
                  statusInfo.overall === 'FAIL' && "bg-red-100 dark:bg-red-800/50"
                )}>
                  {statusInfo.overall === 'OK' && <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />}
                  {statusInfo.overall === 'WARN' && <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />}
                  {statusInfo.overall === 'FAIL' && <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      System Status
                    </h2>
                    <StatusBadge status={statusInfo.overall} size="lg" showIcon />
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{statusInfo.okCount}</span> Healthy
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{statusInfo.warnCount}</span> Warnings
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{statusInfo.failCount}</span> Critical
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {state.lastRun && (
                <div className="flex items-center gap-4">
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Clock className="h-4 w-4" />
                      Last Check
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(state.lastRun).toLocaleString()}
                    </div>
                    {state.report && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Completed in {state.report.durationMs}ms
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Fix Suggestions */}
        {failingItems.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200">
                  Critical Issues Detected
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {failingItems.length} issue{failingItems.length !== 1 ? 's' : ''} require{failingItems.length === 1 ? 's' : ''} immediate attention
                </p>
              </div>
            </div>
            
            <div className="grid gap-3">
              {failingItems.map((item, index) => (
                <div key={item.key} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-red-200/50 dark:border-red-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-red-800 dark:text-red-200 mb-1">
                        {item.label}
                      </div>
                      <p className="text-red-700 dark:text-red-300 text-sm mb-2">
                        {item.suggestion}
                      </p>
                      {item.key === 'backups' && (
                        <a
                          href="/settings"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Open Settings
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Search Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filter Health Checks</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Search by component name or status</p>
              </div>
            </div>
            
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={setSearchInputRef}
                  type="text"
                  placeholder="Filter by name or status... (Press / to focus)"
                  value={state.filter}
                  onChange={(e) => setState(prev => ({ ...prev, filter: e.target.value }))}
                  className={cn(
                    "w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl",
                    "bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
                    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800",
                    "transition-all duration-200"
                  )}
                />
                {state.filter && (
                  <button
                    onClick={() => setState(prev => ({ ...prev, filter: '' }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    <XCircle className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              {state.filter && (
                <div className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm font-medium">
                  {filteredItems.length} of {state.report?.items.length || 0} checks
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Health Check Sections */}
        {state.loading && !state.report && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-200 dark:bg-blue-800 rounded-full animate-ping"></div>
                <div className="relative bg-blue-600 p-4 rounded-full">
                  <RefreshCw className="h-8 w-8 animate-spin text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Running System Diagnostics
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Analyzing system components and performance metrics...
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Zap className="h-4 w-4" />
                This may take a few seconds
              </div>
            </div>
          </div>
        )}

        {state.report && (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => {
              // Add manual test functionality for specific categories
              let onRunManualTest: (() => Promise<void>) | undefined;
              let isRunning = false;

              if (category === 'Backup & Scheduling') {
                onRunManualTest = runManualBackup;
                isRunning = state.runningBackup;
              }

              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <HealthSection
                    title={category}
                    items={items}
                    defaultExpanded={items.some(item => item.status !== 'OK')}
                    onRunManualTest={onRunManualTest}
                    isRunning={isRunning}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Enhanced Empty State */}
        {!state.loading && !state.report && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full">
                  <Activity className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Ready for System Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Run a comprehensive health check to analyze your POS system's performance, security, and configuration.
              </p>
              <button
                onClick={runHealthChecks}
                className={cn(
                  "flex items-center gap-3 mx-auto px-8 py-4 rounded-xl font-semibold transition-all duration-200",
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  "text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                )}
              >
                <Activity className="h-5 w-5" />
                Start Health Check
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Keyboard Shortcuts Help */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
              <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Speed up your workflow with these shortcuts</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">
                /
              </kbd>
              <span className="text-sm text-gray-700 dark:text-gray-300">Focus search</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">
                R
              </kbd>
              <span className="text-sm text-gray-700 dark:text-gray-300">Run checks</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">
                Ctrl+E
              </kbd>
              <span className="text-sm text-gray-700 dark:text-gray-300">Export CSV</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;