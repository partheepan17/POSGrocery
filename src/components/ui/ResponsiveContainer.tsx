import React from 'react';
import { cn } from '@/utils/cn';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full'
};

const paddingClasses = {
  none: '',
  sm: 'p-2 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
  xl: 'p-8 sm:p-12'
};

export function ResponsiveContainer({ 
  children, 
  className, 
  maxWidth = 'full',
  padding = 'md',
  center = true 
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      center && 'mx-auto',
      className
    )}>
      {children}
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
};

const gridColsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12'
};

export function ResponsiveGrid({ 
  children, 
  className, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gridClasses = [
    'grid',
    gridColsClasses[cols.default as keyof typeof gridColsClasses],
    cols.sm && `sm:${gridColsClasses[cols.sm as keyof typeof gridColsClasses]}`,
    cols.md && `md:${gridColsClasses[cols.md as keyof typeof gridColsClasses]}`,
    cols.lg && `lg:${gridColsClasses[cols.lg as keyof typeof gridColsClasses]}`,
    cols.xl && `xl:${gridColsClasses[cols.xl as keyof typeof gridColsClasses]}`,
    gapClasses[gap],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Responsive flex component
interface ResponsiveFlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    default: 'row' | 'col';
    sm?: 'row' | 'col';
    md?: 'row' | 'col';
    lg?: 'row' | 'col';
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
}

const directionClasses = {
  row: 'flex-row',
  col: 'flex-col'
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
};

export function ResponsiveFlex({ 
  children, 
  className, 
  direction = { default: 'row' },
  align = 'center',
  justify = 'start',
  gap = 'md',
  wrap = false
}: ResponsiveFlexProps) {
  const flexClasses = [
    'flex',
    directionClasses[direction.default],
    direction.sm && `sm:${directionClasses[direction.sm]}`,
    direction.md && `md:${directionClasses[direction.md]}`,
    direction.lg && `lg:${directionClasses[direction.lg]}`,
    alignClasses[align],
    justifyClasses[justify],
    gapClasses[gap],
    wrap && 'flex-wrap',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={flexClasses}>
      {children}
    </div>
  );
}

// Mobile-first responsive breakpoint component
interface ResponsiveProps {
  children: React.ReactNode;
  show?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
  };
  hide?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
  };
  className?: string;
}

export function Responsive({ 
  children, 
  show = { mobile: true, tablet: true, desktop: true },
  hide = { mobile: false, tablet: false, desktop: false },
  className 
}: ResponsiveProps) {
  const classes = [
    className,
    // Show classes
    show.mobile === false && 'hidden',
    show.tablet === false && 'sm:hidden',
    show.desktop === false && 'md:hidden',
    // Hide classes
    hide.mobile && 'hidden',
    hide.tablet && 'sm:hidden',
    hide.desktop && 'md:hidden'
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}







