"use client";
import React, { useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, parseISO, subDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Article {
  id: string | number;
  title: string;
  createdAt?: string;
  engagement?: {
    reactions: number;
    comments: number;
    shares: number;
    views: number;
  };
  status: string;
}

interface DiffusionChartProps {
  articles: Article[];
  timeRange: '7d' | '30d' | '90d';
  className?: string;
}

export function DiffusionChart({ articles, timeRange, className = '' }: DiffusionChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const chartData = useMemo(() => {
    // Filtrar artículos por rango de tiempo
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(now, daysBack);

    const filteredArticles = articles.filter(article => {
      if (!article.createdAt) return false;
      const articleDate = parseISO(article.createdAt);
      return isAfter(articleDate, startDate) && isBefore(articleDate, now);
    });

    // Agrupar por día y calcular métricas
    const dataByDay = new Map<string, {
      date: Date;
      count: number;
      totalReactions: number;
      totalComments: number;
      totalShares: number;
      totalViews: number;
      articles: Article[];
    }>();

    filteredArticles.forEach(article => {
      const date = parseISO(article.createdAt!);
      const dayKey = format(date, 'yyyy-MM-dd');
      
      if (!dataByDay.has(dayKey)) {
        dataByDay.set(dayKey, {
          date,
          count: 0,
          totalReactions: 0,
          totalComments: 0,
          totalShares: 0,
          totalViews: 0,
          articles: []
        });
      }

      const dayData = dataByDay.get(dayKey)!;
      dayData.count++;
      dayData.articles.push(article);
      
      if (article.engagement) {
        dayData.totalReactions += article.engagement.reactions || 0;
        dayData.totalComments += article.engagement.comments || 0;
        dayData.totalShares += article.engagement.shares || 0;
        dayData.totalViews += article.engagement.views || 0;
      }
    });

    // Convertir a arrays ordenados por fecha
    const sortedData = Array.from(dataByDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    const labels = sortedData.map(d => format(d.date, 'MMM dd', { locale: es }));
    const postCounts = sortedData.map(d => d.count);
    const reactions = sortedData.map(d => d.totalReactions);
    const engagement = sortedData.map(d => d.totalReactions + d.totalComments + d.totalShares);

    return {
      labels,
      datasets: [
        {
          label: 'Nuevos Posts',
          data: postCounts,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgba(255, 255, 255, 0.8)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y',
        },
        {
          label: 'Reacciones Totales',
          data: reactions,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: 'rgba(255, 255, 255, 0.8)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y1',
        },
        {
          label: 'Engagement Total',
          data: engagement,
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(245, 158, 11)',
          pointBorderColor: 'rgba(255, 255, 255, 0.8)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y1',
        },
      ],
    };
  }, [articles, timeRange]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    backgroundColor: 'rgba(55, 65, 81, 1)', // Fondo gris oscuro
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          color: 'rgb(209, 213, 219)',
          font: {
            size: 12,
            weight: 500 as const,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgb(243, 244, 246)',
        bodyColor: 'rgb(209, 213, 219)',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: function(context: { dataset: { label?: string }; parsed: { y: number } }) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label === 'Nuevos Posts') {
              return `${label}: ${value} post${value !== 1 ? 's' : ''}`;
            } else {
              return `${label}: ${value.toLocaleString()} interacciones`;
            }
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
          drawOnChartArea: true,
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          font: {
            size: 11,
          },
          maxRotation: 0,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Nuevos Posts',
          color: 'rgb(209, 213, 219)',
          font: {
            size: 12,
            weight: 500 as const,
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
          drawOnChartArea: true,
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          font: {
            size: 11,
          },
          precision: 0,
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Interacciones',
          color: 'rgb(209, 213, 219)',
          font: {
            size: 12,
            weight: 500 as const,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          font: {
            size: 11,
          },
          callback: function(value: string | number) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
      },
      line: {
        borderWidth: 3,
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutCubic' as const,
    },
  }), []);

  // Crear gradientes cuando el componente se monta
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      const ctx = chart.ctx;
      
      // Gradiente azul para posts
      const blueGradient = ctx.createLinearGradient(0, 0, 0, 400);
      blueGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      blueGradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
      
      // Gradiente verde para reacciones
      const greenGradient = ctx.createLinearGradient(0, 0, 0, 400);
      greenGradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      greenGradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
      
      // Gradiente amarillo para engagement
      const yellowGradient = ctx.createLinearGradient(0, 0, 0, 400);
      yellowGradient.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      yellowGradient.addColorStop(1, 'rgba(245, 158, 11, 0.01)');
      
      chart.data.datasets[0].backgroundColor = blueGradient;
      chart.data.datasets[1].backgroundColor = greenGradient;
      chart.data.datasets[2].backgroundColor = yellowGradient;
      
      chart.update();
    }
  }, [chartData]);

  return (
    <div className={`bg-gray-800 dark:bg-neutral-800 rounded-xl border border-neutral-600 dark:border-neutral-700 shadow-sm flex flex-col ${className}`}>
      <div className="p-6 border-b border-neutral-600 dark:border-neutral-700 bg-gray-800">{/* Header con fondo oscuro */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white dark:text-white">
              Difusión en el Tiempo
            </h3>
            <p className="text-sm text-gray-300 dark:text-gray-400 mt-1">{/* Texto más claro */}
              Evolución de posts y engagement en los últimos {timeRange === '7d' ? '7 días' : timeRange === '30d' ? '30 días' : '90 días'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-300 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              Posts
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-300 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              Reacciones
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-300 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              Engagement
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1 min-h-0">
        <Line 
          ref={chartRef}
          data={chartData} 
          options={options}
        />
      </div>
    </div>
  );
}
