import React from 'react';
import { cn } from '@/utils/cn';

// Screen Reader Only Component
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
}

const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ children, className }) => {
  return (
    <span 
      className={cn(
        'sr-only absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
        className
      )}
    >
      {children}
    </span>
  );
};

// Focus Trap Component
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  enabled = true,
  autoFocus = true,
  restoreFocus = true,
  className
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden')) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Auto focus the first focusable element
    if (autoFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously active element
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [enabled, autoFocus, restoreFocus]);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Skip Link Component
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className }) => {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only fixed top-4 left-4 z-50',
        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
        'px-4 py-2 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600',
        'font-medium text-sm transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        className
      )}
    >
      {children}
    </a>
  );
};

// Announcement Component for dynamic content
interface AnnouncementProps {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

const Announcement: React.FC<AnnouncementProps> = ({
  children,
  priority = 'polite',
  atomic = false,
  className
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
};

// Keyboard Navigation Helper
interface KeyboardNavProps {
  children: React.ReactNode;
  onKeyDown?: (e: KeyboardEvent) => void;
  shortcuts?: Record<string, () => void>;
  className?: string;
}

const KeyboardNav: React.FC<KeyboardNavProps> = ({
  children,
  onKeyDown,
  shortcuts = {},
  className
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle custom shortcuts
      const key = e.key.toLowerCase();
      const combo = [
        e.ctrlKey && 'ctrl',
        e.altKey && 'alt',
        e.shiftKey && 'shift',
        key
      ].filter(Boolean).join('+');

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
        return;
      }

      // Call custom handler
      onKeyDown?.(e);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onKeyDown, shortcuts]);

  return <div className={className}>{children}</div>;
};

// High Contrast Mode Detector
const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
};

// Reduced Motion Detector
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

// Focus Visible Hook
const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);

  React.useEffect(() => {
    let hadKeyboardEvent = false;

    const onKeyDown = () => {
      hadKeyboardEvent = true;
    };

    const onPointerDown = () => {
      hadKeyboardEvent = false;
    };

    const onFocusIn = () => {
      setIsFocusVisible(hadKeyboardEvent);
    };

    const onFocusOut = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, []);

  return isFocusVisible;
};

// Accessible Menu Item
interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}

const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ children, selected = false, onSelect, className, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.();
      }
    };

    return (
      <button
        ref={ref}
        role="menuitem"
        aria-selected={selected}
        onKeyDown={handleKeyDown}
        onClick={onSelect}
        className={cn(
          'w-full px-3 py-2 text-left text-sm',
          'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          selected && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

MenuItem.displayName = 'MenuItem';

// Progress Indicator with Screen Reader Support
interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  description,
  size = 'md',
  variant = 'primary',
  showValue = false,
  className
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const progressId = React.useId();

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    danger: 'bg-danger-600'
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <label htmlFor={progressId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          id={progressId}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
          aria-describedby={description ? `${progressId}-desc` : undefined}
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {description && (
        <p id={`${progressId}-desc`} className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
  );
};

export {
  ScreenReaderOnly,
  FocusTrap,
  SkipLink,
  Announcement,
  KeyboardNav,
  MenuItem,
  Progress,
  useHighContrast,
  useReducedMotion,
  useFocusVisible
};

export type {
  ScreenReaderOnlyProps,
  FocusTrapProps,
  SkipLinkProps,
  AnnouncementProps,
  KeyboardNavProps,
  MenuItemProps,
  ProgressProps
};



