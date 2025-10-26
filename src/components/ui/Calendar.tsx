import React from 'react';
import { cn } from '@/lib/utils';

export interface CalendarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onSelect'> {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[];
  onSelect?: (date: Date | Date[] | undefined) => void;
  value?: Date | Date[];
  onChange?: (date: Date | Date[] | undefined) => void;
  initialFocus?: boolean;
  disabled?: (date: Date) => boolean;
}

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode = 'single', selected, onSelect, value, onChange, initialFocus, disabled, ...props }, ref) => {
    const handleDateChange = (date: Date | Date[] | undefined) => {
      if (onSelect) {
        onSelect(date);
      }
      if (onChange) {
        onChange(date);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "p-3 border border-gray-200 rounded-md bg-white",
          className
        )}
        {...props}
      >
        <div className="text-center text-sm text-gray-500">
          Calendar component placeholder
        </div>
      </div>
    );
  }
);

Calendar.displayName = 'Calendar';
