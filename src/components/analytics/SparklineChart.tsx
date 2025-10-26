/**
 * Sparkline Chart Component
 * Simple inline chart for showing usage trends
 */

import React, { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function SparklineChart({ 
  data, 
  width = 120, 
  height = 32, 
  color = '#3b82f6',
  className = ''
}: SparklineChartProps) {
  const svgPath = useMemo(() => {
    if (data.length === 0) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-gray-400 text-xs ${className}`}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {/* Background area */}
      <path
        d={`${svgPath} L ${width} ${height} L 0 ${height} Z`}
        fill={color}
        fillOpacity={0.1}
      />
      
      {/* Line */}
      <path
        d={svgPath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data points */}
      {data.map((value, index) => {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={1.5}
            fill={color}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}










