/**
 * DateTimePicker Component with Timezone Support
 * Handles UTC conversion for API calls and local display
 */

import React, { useState, useEffect } from 'react';
import { useTimezone } from '@/hooks/useTimezone';
import { formatForDateInput, formatForTimeInput, localToUTC, utcToLocal } from '@/utils/dateUtils';

interface DateTimePickerProps {
  value?: string; // UTC ISO string
  onChange: (utcValue: string) => void;
  type?: 'date' | 'time' | 'datetime';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  type = 'datetime',
  label,
  required = false,
  disabled = false,
  className = '',
  placeholder
}) => {
  const { timezone } = useTimezone();
  const [localValue, setLocalValue] = useState<string>('');
  const [localTimeValue, setLocalTimeValue] = useState<string>('');

  // Convert UTC value to local values for display
  useEffect(() => {
    if (value) {
      const localDate = utcToLocal(value);
      setLocalValue(formatForDateInput(localDate));
      setLocalTimeValue(formatForTimeInput(localDate));
    } else {
      setLocalValue('');
      setLocalTimeValue('');
    }
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setLocalValue(dateValue);
    
    if (dateValue) {
      // Combine date with existing time or default to 00:00
      const timeValue = localTimeValue || '00:00';
      const localDateTime = `${dateValue}T${timeValue}`;
      const utcValue = localToUTC(localDateTime);
      onChange(utcValue);
    } else {
      onChange('');
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setLocalTimeValue(timeValue);
    
    if (localValue && timeValue) {
      const localDateTime = `${localValue}T${timeValue}`;
      const utcValue = localToUTC(localDateTime);
      onChange(utcValue);
    }
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateTimeValue = e.target.value;
    
    if (dateTimeValue) {
      const utcValue = localToUTC(dateTimeValue);
      onChange(utcValue);
    } else {
      onChange('');
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'date':
        return (
          <input
            type="date"
            value={localValue}
            onChange={handleDateChange}
            disabled={disabled}
            required={required}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
            placeholder={placeholder}
          />
        );
      
      case 'time':
        return (
          <input
            type="time"
            value={localTimeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            required={required}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
            placeholder={placeholder}
          />
        );
      
      case 'datetime':
      default:
        return (
          <input
            type="datetime-local"
            value={localValue && localTimeValue ? `${localValue}T${localTimeValue}` : ''}
            onChange={handleDateTimeChange}
            disabled={disabled}
            required={required}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderInput()}
      <div className="text-xs text-gray-500">
        Timezone: {timezone.timezone} ({timezone.offsetString})
      </div>
    </div>
  );
};

export default DateTimePicker;










