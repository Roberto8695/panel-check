"use client";
import { useState, useEffect, useCallback } from 'react';

interface InteractionStats {
  socialMedia: Record<string, number>;
  status: Record<string, number>;
  format: Record<string, number>;
  tags: Record<string, number>;
  totalInteractions: number;
}

interface UseInteractionStatsReturn {
  stats: InteractionStats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fetchStats: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const useInteractionStats = (autoRefresh = true, refreshInterval = 60000): UseInteractionStatsReturn => {
  const [stats, setStats] = useState<InteractionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/interactions-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const data: InteractionStats = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas de interacciones');
      console.error('Error fetching interaction stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats]);

  return {
    stats,
    loading,
    error,
    lastUpdated,
    fetchStats,
  };
};
