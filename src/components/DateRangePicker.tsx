/**
 * DateRangePicker Component with Timezone Support
 * Handles UTC conversion for API calls and local display
 */

import React, { useState, useEffect } from 'react';
import { useTimezone } from '@/hooks/useTimezone';
import { 
  formatForDateInput, 
  localToUTC, 
  utcToLocal, 
  getDateRange,
  parseDateRange 
} from '@/utils/dateUtils';

interface DateRangePickerProps {
  startValue?: string; // UTC ISO string
  endValue?: string; // UTC ISO string
  onChange: (startUTC: string, endUTC: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPresets?: boolean;
}

type PresetPeriod = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear';

const PRESET_OPTIONS: Array<{ value: PresetPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' }
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startValue,
  endValue,
  onChange,
  label,
  required = false,
  disabled = false,
  className = '',
  showPresets = true
}) => {
  const { timezone } = useTimezone();
  const [localStartValue, setLocalStartValue] = useState<string>('');
  const [localEndValue, setLocalEndValue] = useState<string>('');

  // Convert UTC values to local values for display
  useEffect(() => {
    if (startValue) {
      const localStart = utcToLocal(startValue);
      setLocalStartValue(formatForDateInput(localStart));
    } else {
      setLocalStartValue('');
    }
    
    if (endValue) {
      const localEnd = utcToLocal(endValue);
      setLocalEndValue(formatForDateInput(localEnd));
    } else {
      setLocalEndValue('');
    }
  }, [startValue, endValue]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setLocalStartValue(dateValue);
    
    if (dateValue && localEndValue) {
      const { startUTC, endUTC } = parseDateRange(dateValue, localEndValue);
      onChange(startUTC, endUTC);
    } else if (dateValue) {
      // If only start date is set, set end date to same day
      const { startUTC, endUTC } = parseDateRange(dateValue, dateValue);
      onChange(startUTC, endUTC);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setLocalEndValue(dateValue);
    
    if (localStartValue && dateValue) {
      const { startUTC, endUTC } = parseDateRange(localStartValue, dateValue);
      onChange(startUTC, endUTC);
    }
  };

  const handlePresetChange = (preset: PresetPeriod) => {
    const { start, end } = getDateRange(preset);
    onChange(start, end);
  };

  const clearDates = () => {
    setLocalStartValue('');
    setLocalEndValue('');
    onChange('', '');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={localStartValue}
            onChange={handleStartDateChange}
            disabled={disabled}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={localEndValue}
            onChange={handleEndDateChange}
            disabled={disabled}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={clearDates}
            disabled={disabled}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
      
      {showPresets && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-500">Quick Select</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetChange(preset.value)}
                disabled={disabled}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Timezone: {timezone.timezone} ({timezone.offsetString})
      </div>
    </div>
  );
};

export default DateRangePicker;










