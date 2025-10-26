import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', isThisMonth: true },
  { label: 'Last month', isLastMonth: true },
  { label: 'This year', isThisYear: true },
];

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPresetRange = (preset: typeof PRESET_RANGES[0]) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset.isThisMonth) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth.toISOString().split('T')[0],
        end: todayStr
      };
    }

    if (preset.isLastMonth) {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: startOfLastMonth.toISOString().split('T')[0],
        end: endOfLastMonth.toISOString().split('T')[0]
      };
    }

    if (preset.isThisYear) {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        start: startOfYear.toISOString().split('T')[0],
        end: todayStr
      };
    }

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (preset.days ?? 0));
    return {
      start: startDate.toISOString().split('T')[0],
      end: todayStr
    };
  };

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const range = getPresetRange(preset);
    onChange(range);
    setIsOpen(false);
  };

  const handleDateChange = (field: 'start' | 'end', dateValue: string) => {
    onChange({
      ...value,
      [field]: dateValue
    });
  };

  const isCustomRange = () => {
    return !PRESET_RANGES.some(preset => {
      const presetRange = getPresetRange(preset);
      return presetRange.start === value.start && presetRange.end === value.end;
    });
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="gap-2 min-w-[280px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDate(value.start)} - {formatDate(value.end)}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 w-80 z-50 shadow-lg">
          <CardContent className="p-4 space-y-4">
            {/* Preset Ranges */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Quick Select
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_RANGES.map((preset) => (
                  <Button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Custom Range
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    From
                  </label>
                  <Input
                    type="date"
                    value={value.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    To
                  </label>
                  <Input
                    type="date"
                    value={value.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                size="sm"
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
