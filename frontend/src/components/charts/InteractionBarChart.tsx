"use client";
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface InteractionBarChartProps {
  title: string;
  data: Record<string, number>;
  className?: string;
  color?: string;
  maxItems?: number;
}

export function InteractionBarChart({ 
  title, 
  data, 
  className = '', 
  color = 'rgb(59, 130, 246)',
  maxItems = 10
}: InteractionBarChartProps) {
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
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgb(243, 244, 246)',
        bodyColor: 'rgb(209, 213, 219)',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: { parsed: { x: number } }) {
            return `Interacciones: ${context.parsed.x.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
          drawOnChartArea: true,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
          },
          callback: function(value: string | number) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
          },
          maxRotation: 0,
        },
      },
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutCubic' as const,
    },
  }), []);

  const totalInteractions = Object.values(data).reduce((sum, value) => sum + value, 0);
  const isEmpty = totalInteractions === 0;

  if (isEmpty) {
    return (
      <div className={cn(
        "bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6",
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="text-sm">No hay datos disponibles</p>
            <p className="text-xs mt-1">Aún no se han registrado interacciones</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col",
      className
    )}>
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {totalInteractions.toLocaleString()} interacciones
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Object.keys(data).length} categorías
            </div>
            {maxItems < Object.keys(data).length && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Mostrando top {maxItems}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <div style={{ height: '300px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
