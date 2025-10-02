import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, Clock, Info } from 'lucide-react';
import { HealthItem, HealthStatus } from '@/services/healthService';
import { cn } from '@/utils/cn';

interface HealthSectionProps {
  title: string;
  items: HealthItem[];
  defaultExpanded?: boolean;
  onRunManualTest?: () => Promise<void>;
  isRunning?: boolean;
}

const statusIcons = {
  OK: CheckCircle,
  WARN: AlertTriangle,
  FAIL: XCircle,
};

const statusColors = {
  OK: 'text-green-600 dark:text-green-400',
  WARN: 'text-yellow-600 dark:text-yellow-400',
  FAIL: 'text-red-600 dark:text-red-400',
};

const statusBgColors = {
  OK: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  WARN: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  FAIL: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

function getOverallStatus(items: HealthItem[]): HealthStatus {
  if (items.some(item => item.status === 'FAIL')) return 'FAIL';
  if (items.some(item => item.status === 'WARN')) return 'WARN';
  return 'OK';
}

export function HealthSection({ 
  title, 
  items, 
  defaultExpanded = false,
  onRunManualTest,
  isRunning = false
}: HealthSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const overallStatus = getOverallStatus(items);
  const StatusIcon = statusIcons[overallStatus];

  const handleManualTest = async () => {
    if (onRunManualTest && !isRunning) {
      await onRunManualTest();
    }
  };

  return (
    <div className="transition-all duration-300">
      {/* Section Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-6 cursor-pointer transition-all duration-200",
          "hover:bg-gray-50 dark:hover:bg-gray-700/50",
          "border-l-4",
          overallStatus === 'OK' && "border-l-green-500 bg-green-50/50 dark:bg-green-900/10",
          overallStatus === 'WARN' && "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10", 
          overallStatus === 'FAIL' && "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" />
            )}
          </div>
          
          <div className={cn(
            "p-2 rounded-lg",
            overallStatus === 'OK' && "bg-green-100 dark:bg-green-800/30",
            overallStatus === 'WARN' && "bg-yellow-100 dark:bg-yellow-800/30",
            overallStatus === 'FAIL' && "bg-red-100 dark:bg-red-800/30"
          )}>
            <StatusIcon className={cn("w-6 h-6", statusColors[overallStatus])} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {items.length} check{items.length !== 1 ? 's' : ''}
              </span>
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                overallStatus === 'OK' && "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300",
                overallStatus === 'WARN' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300",
                overallStatus === 'FAIL' && "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
              )}>
                {overallStatus}
              </div>
            </div>
          </div>
        </div>

        {onRunManualTest && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleManualTest();
            }}
            disabled={isRunning}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
              "text-white shadow-lg hover:shadow-xl transform hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            )}
          >
            {isRunning ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                Running...
              </div>
            ) : (
              'Run Test'
            )}
          </button>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="p-6 space-y-4">
            {items.map((item) => {
              const ItemStatusIcon = statusIcons[item.status];
              
              return (
                <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <ItemStatusIcon className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      statusColors[item.status]
                    )} />
                    
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.label}
                      </h4>
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        item.status === 'OK' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                        item.status === 'WARN' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                        item.status === 'FAIL' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    
                    {item.details && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {item.details}
                      </p>
                    )}
                    
                    {item.suggestion && (
                      <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          {item.suggestion}
                        </p>
                      </div>
                    )}
                    
                      {item.metrics && Object.keys(item.metrics).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <details className="cursor-pointer">
                            <summary className="hover:text-gray-700 dark:hover:text-gray-300">
                              View metrics
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-xs">
                              {Object.entries(item.metrics).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key}:</span>
                                  <span className="font-medium">
                                    {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}