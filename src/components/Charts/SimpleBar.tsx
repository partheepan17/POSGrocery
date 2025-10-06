import React from 'react';

interface SimpleBarProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export function SimpleBar({ 
  data, 
  height = 200, 
  showValues = true, 
  formatValue = (v) => v.toLocaleString() 
}: SimpleBarProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-yellow-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-gray-500'
  ];

  return (
    <div className="w-full">
      <div 
        className="flex items-end justify-between px-4 py-2 bg-white rounded-lg border"
        style={{ height }}
      >
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 60) : 0;
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 mx-1">
              {/* Value label */}
              {showValues && (
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {formatValue(item.value)}
                </div>
              )}
              
              {/* Bar */}
              <div 
                className={`w-full ${color} rounded-t transition-all duration-300 hover:opacity-80`}
                style={{ height: Math.max(barHeight, 2) }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
              
              {/* Label */}
              <div className="text-xs text-gray-500 mt-2 text-center max-w-full truncate">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}








