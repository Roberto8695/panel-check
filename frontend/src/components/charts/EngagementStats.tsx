"use client";
import React, { useMemo } from 'react';
import { IconTrendingUp, IconTrendingDown, IconMinus, IconEye, IconHeart, IconMessageCircle, IconShare } from '@tabler/icons-react';
import { parseISO, subDays, isAfter } from 'date-fns';

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

interface EngagementStatsProps {
  articles: Article[];
  className?: string;
}

export function EngagementStats({ articles, className = '' }: EngagementStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last7d = subDays(now, 7);

    // Artículos de las últimas 24 horas
    const recent24h = articles.filter(article => {
      if (!article.createdAt) return false;
      const articleDate = parseISO(article.createdAt);
      return isAfter(articleDate, last24h);
    });

    // Artículos de los últimos 7 días (excluyendo las últimas 24h)
    const previous7d = articles.filter(article => {
      if (!article.createdAt) return false;
      const articleDate = parseISO(article.createdAt);
      return isAfter(articleDate, last7d) && !isAfter(articleDate, last24h);
    });

    // Calcular totales para cada período
    const calculate = (articleList: Article[]) => {
      return articleList.reduce((acc, article) => {
        if (article.engagement) {
          acc.reactions += article.engagement.reactions || 0;
          acc.comments += article.engagement.comments || 0;
          acc.shares += article.engagement.shares || 0;
          acc.views += article.engagement.views || 0;
        }
        acc.posts += 1;
        return acc;
      }, { reactions: 0, comments: 0, shares: 0, views: 0, posts: 0 });
    };

    const current = calculate(recent24h);
    const previous = calculate(previous7d);

    // Calcular tendencias (normalizar por día)
    const currentDaily = {
      reactions: current.reactions,
      comments: current.comments,
      shares: current.shares,
      views: current.views,
      posts: current.posts
    };

    const previousDaily = {
      reactions: previous.reactions / 7,
      comments: previous.comments / 7,
      shares: previous.shares / 7,
      views: previous.views / 7,
      posts: previous.posts / 7
    };

    const getTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
      if (previous === 0) return current > 0 ? 'up' : 'neutral';
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return 'up';
      if (change < -5) return 'down';
      return 'neutral';
    };

    const getChangePercent = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.abs(((current - previous) / previous) * 100);
    };

    return {
      reactions: {
        value: current.reactions,
        trend: getTrend(currentDaily.reactions, previousDaily.reactions),
        change: getChangePercent(currentDaily.reactions, previousDaily.reactions)
      },
      comments: {
        value: current.comments,
        trend: getTrend(currentDaily.comments, previousDaily.comments),
        change: getChangePercent(currentDaily.comments, previousDaily.comments)
      },
      shares: {
        value: current.shares,
        trend: getTrend(currentDaily.shares, previousDaily.shares),
        change: getChangePercent(currentDaily.shares, previousDaily.shares)
      },
      views: {
        value: current.views,
        trend: getTrend(currentDaily.views, previousDaily.views),
        change: getChangePercent(currentDaily.views, previousDaily.views)
      },
      posts: {
        value: current.posts,
        trend: getTrend(currentDaily.posts, previousDaily.posts),
        change: getChangePercent(currentDaily.posts, previousDaily.posts)
      }
    };
  }, [articles]);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    change, 
    color 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    trend: 'up' | 'down' | 'neutral';
    change: number;
    color: string;
  }) => {
    const TrendIcon = trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : IconMinus;
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="text-xs font-medium">
              {change.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Últimas 24h vs promedio semanal
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${className}`}>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Métricas de Engagement
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Rendimiento en tiempo real comparado con el promedio semanal
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={IconEye}
          label="Visualizaciones"
          value={stats.views.value}
          trend={stats.views.trend}
          change={stats.views.change}
          color="bg-blue-500"
        />
        
        <StatCard
          icon={IconHeart}
          label="Reacciones"
          value={stats.reactions.value}
          trend={stats.reactions.trend}
          change={stats.reactions.change}
          color="bg-red-500"
        />
        
        <StatCard
          icon={IconMessageCircle}
          label="Comentarios"
          value={stats.comments.value}
          trend={stats.comments.trend}
          change={stats.comments.change}
          color="bg-green-500"
        />
        
        <StatCard
          icon={IconShare}
          label="Compartidos"
          value={stats.shares.value}
          trend={stats.shares.trend}
          change={stats.shares.change}
          color="bg-purple-500"
        />
        
        <StatCard
          icon={IconTrendingUp}
          label="Nuevos Posts"
          value={stats.posts.value}
          trend={stats.posts.trend}
          change={stats.posts.change}
          color="bg-orange-500"
        />
      </div>
    </div>
  );
}
