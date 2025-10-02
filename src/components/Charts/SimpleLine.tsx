import React from 'react';

interface SimpleLineProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
  color?: string;
  showDots?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export function SimpleLine({ 
  data, 
  height = 200, 
  color = 'stroke-blue-500',
  showDots = true,
  showValues = false,
  formatValue = (v) => v.toLocaleString() 
}: SimpleLineProps) {
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
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;
  
  const chartHeight = height - 60; // Reserve space for labels
  const chartWidth = 400; // Fixed width for SVG
  const padding = 20;
  
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
    const y = range > 0 
      ? chartHeight - ((item.value - minValue) / range) * chartHeight + padding
      : chartHeight / 2;
    return { x, y, value: item.value, label: item.label };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="w-full">
      <div 
        className="bg-white rounded-lg border p-4"
        style={{ height }}
      >
        <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}>
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            className={`${color} stroke-2`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dots */}
          {showDots && points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              className={`${color.replace('stroke-', 'fill-')} hover:r-6 transition-all`}
            >
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </circle>
          ))}
          
          {/* Value labels */}
          {showValues && points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {formatValue(point.value)}
            </text>
          ))}
          
          {/* X-axis labels */}
          {points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={chartHeight + 35}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
