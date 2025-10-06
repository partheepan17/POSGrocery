import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular' | 'text' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animation = 'pulse',
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    text: 'rounded-sm',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
    none: ''
  };

  const inlineStyles = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    ...style
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={inlineStyles}
      {...props}
    />
  );
}

// Predefined skeleton components for common use cases
export function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: { 
  lines?: number;
  className?: string;
} & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height="1rem"
          width={index === lines - 1 && lines > 1 ? '75%' : '100%'}
          {...props}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ 
  size = 40,
  className,
  ...props 
}: { 
  size?: number;
  className?: string;
} & Omit<SkeletonProps, 'variant' | 'width' | 'height'>) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
      {...props}
    />
  );
}

export function SkeletonCard({ 
  className,
  showAvatar = false,
  avatarSize = 40,
  titleLines = 1,
  bodyLines = 3,
  ...props 
}: {
  className?: string;
  showAvatar?: boolean;
  avatarSize?: number;
  titleLines?: number;
  bodyLines?: number;
} & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('p-4 space-y-4', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <SkeletonAvatar size={avatarSize} {...props} />
          <div className="flex-1 space-y-2">
            <SkeletonText lines={1} {...props} />
            <Skeleton height="0.75rem" width="60%" {...props} />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <SkeletonText lines={titleLines} {...props} />
        <SkeletonText lines={bodyLines} {...props} />
      </div>
      
      <div className="flex space-x-2">
        <Skeleton height="2rem" width="5rem" variant="rounded" {...props} />
        <Skeleton height="2rem" width="5rem" variant="rounded" {...props} />
      </div>
    </div>
  );
}

export function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className,
  ...props 
}: {
  rows?: number;
  columns?: number;
  className?: string;
} & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={`header-${index}`}
            height="1.25rem"
            width={`${Math.random() * 30 + 70}%`}
            className="flex-1"
            {...props}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              height="1rem"
              width={`${Math.random() * 40 + 60}%`}
              className="flex-1"
              {...props}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ 
  items = 5,
  showAvatar = true,
  className,
  ...props 
}: {
  items?: number;
  showAvatar?: boolean;
  className?: string;
} & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          {showAvatar && <SkeletonAvatar size={32} {...props} />}
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="70%" {...props} />
            <Skeleton height="0.75rem" width="50%" {...props} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading spinner component
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary',
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  return (
    <div className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Page loading component
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ 
  message = 'Loading...', 
  className 
}: PageLoadingProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] space-y-4',
      className
    )}>
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
        {message}
      </p>
    </div>
  );
}

// Overlay loading component
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  message = 'Loading...', 
  children,
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}



