import React from 'react';
import { cn } from '@/utils/cn';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  const baseClasses = 'shrink-0 bg-border';
  
  const orientationClasses = {
    horizontal: 'h-[1px] w-full',
    vertical: 'h-full w-[1px]'
  };

  return (
    <div 
      className={cn(baseClasses, orientationClasses[orientation], className)}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

