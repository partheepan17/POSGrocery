/**
 * Status Badge Component
 * Visual indicator for health check statuses
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { HealthStatus } from '../../services/healthService';

interface StatusBadgeProps {
  status: HealthStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig = {
  OK: {
    label: 'OK',
    className: 'bg-green-100 text-green-800 border-green-200',
    darkClassName: 'dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    icon: '✓',
    ariaLabel: 'Status: OK - All checks passed'
  },
  WARN: {
    label: 'WARN',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    darkClassName: 'dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    icon: '⚠',
    ariaLabel: 'Status: Warning - Some issues detected'
  },
  FAIL: {
    label: 'FAIL',
    className: 'bg-red-100 text-red-800 border-red-200',
    darkClassName: 'dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    icon: '✗',
    ariaLabel: 'Status: Failed - Critical issues found'
  }
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-4 py-2 text-lg font-bold'
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'sm',
  showIcon = false
}) => {
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center gap-1 rounded-full border font-medium',
        // Size styles
        sizeClass,
        // Status styles
        config.className,
        config.darkClassName,
        // Custom className
        className
      )}
      aria-label={config.ariaLabel}
      role="status"
    >
      {showIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

