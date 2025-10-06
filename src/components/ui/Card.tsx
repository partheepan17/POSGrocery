import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  divider?: boolean;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  divider?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    children, 
    variant = 'default',
    padding = 'md',
    interactive = false,
    ...props 
  }, ref) => {
    const baseClasses = 'rounded-xl transition-all duration-200';
    
    const variants = {
      default: 'bg-white border-2 border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700',
      elevated: 'bg-white shadow-2xl border-0 dark:bg-gray-800',
      outlined: 'bg-transparent border-2 border-gray-300 shadow-sm dark:border-gray-600',
      filled: 'bg-gray-50 border-2 border-gray-200 shadow-sm dark:bg-gray-700 dark:border-gray-600'
    };

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    };

    const interactiveClasses = interactive 
      ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' 
      : '';

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          paddingClasses[padding],
          interactiveClasses,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, divider = false, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex flex-col space-y-1.5',
          divider && 'pb-4 border-b border-gray-200 dark:border-gray-700',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('pt-0', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, divider = false, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center',
          divider && 'pt-4 border-t border-gray-200 dark:border-gray-700',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        className={cn(
          'text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn(
          'text-sm text-gray-500 dark:text-gray-400',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';

export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter, 
  CardTitle, 
  CardDescription 
};

export type { 
  CardProps, 
  CardHeaderProps, 
  CardContentProps, 
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps
};



