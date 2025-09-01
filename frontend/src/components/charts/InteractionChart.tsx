"use client";
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

// Importar Chart.js dinámicamente para evitar errores de SSR
import dynamic from 'next/dynamic';

const Bar = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Bar })),
  { ssr: false }
);

interface InteractionChartProps {
  title: string;
  data: Record<string, number>;
  className?: string;
  color?: string;
  maxItems?: number;
}

export function InteractionChart({ 
  title, 
  data, 
  className = '', 
  color = 'rgb(59, 130, 246)',
  maxItems = 10
}: InteractionChartProps) {
  const chartData = useMemo(() => {
    // Ordenar datos por valor descendente y limitar elementos
    const sortedEntries = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxItems);

    const labels = sortedEntries.map(([label]) => {
      // Truncar etiquetas largas
      return label.length > 20 ? label.substring(0, 20) + '...' : label;
    });
    const values = sortedEntries.map(([, value]) => value);

    return {
      labels,
      datasets: [
        {
          label: 'Interacciones',
          data: values,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
          borderColor: color,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [data, color, maxItems]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
      },
    },
  }), []);

  const totalInteractions = Object.values(data).reduce((sum, value) => sum + value, 0);

  if (totalInteractions === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6",
        className
      )}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6",
      className
    )}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
