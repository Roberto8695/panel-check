"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleChartProps {
  title: string;
  data: Record<string, number>;
  className?: string;
  color?: string;
}

export function SimpleChart({ 
  title, 
  data, 
  className = '', 
  color = 'rgb(59, 130, 246)' 
}: SimpleChartProps) {
  const sortedEntries = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const maxValue = Math.max(...Object.values(data));

  return (
    <div className={cn(
      "bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6",
      className
    )}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      
      <div className="space-y-3">
        {sortedEntries.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-20 text-sm text-gray-600 dark:text-gray-400 truncate">
              {label}
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-neutral-700 rounded-full h-4 relative">
              <div 
                className="h-4 rounded-full transition-all duration-1000"
                style={{ 
                  backgroundColor: color,
                  width: `${(value / maxValue) * 100}%`
                }}
              />
            </div>
            <div className="w-16 text-sm text-gray-900 dark:text-white text-right">
              {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
