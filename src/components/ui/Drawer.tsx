/**
 * Drawer Component
 * Slide-out panel component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DrawerHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DrawerTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DrawerTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer Content */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
        {children}
      </div>
    </div>
  );
};

export const DrawerContent: React.FC<DrawerContentProps> = ({ children, className }) => {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      {children}
    </div>
  );
};

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

export const DrawerTitle: React.FC<DrawerTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h2>
  );
};

export const DrawerTrigger: React.FC<DrawerTriggerProps> = ({ children, asChild }) => {
  if (asChild) {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default Drawer;










