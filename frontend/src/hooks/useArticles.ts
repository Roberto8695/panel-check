"use client";
import { useState, useEffect, useCallback } from 'react';

interface Article {
  id: string | number;
  title: string;
  summary?: string;
  url: string;
  language?: string;
  status: string;
  imported?: boolean;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  format?: string;
  tags?: string[];
  engagement?: {
    reactions: number;
    comments: number;
    shares: number;
    views: number;
  };
  metadata?: {
    fue_creado_con_ia?: string;
    ataca_candidato?: string;
    candidato_atacado?: string;
    ataca_tse?: string;
    narrativa_tse?: string;
    es_caso_es?: string;
    narrativa_desinformacion?: string;
    imita_medio?: string;
    medio_imitado?: string;
    tipo_rumor?: string;
    rumor_promovido?: string;
  };
}

interface ApiResponse {
  articles?: Article[];
  total?: number;
  page?: number;
  totalPages?: number;
  message?: string;
}

interface UseArticlesReturn {
  articles: Article[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected: boolean;
  fetchArticles: () => Promise<void>;
  createArticle: (articleData: Partial<Article>) => Promise<Article | null>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const useArticles = (autoRefresh = true, refreshInterval = 30000): UseArticlesReturn => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/articles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      
      // Manejar diferentes formatos de respuesta del backend
      const articlesData = data.articles || [];
      setArticles(articlesData);
      setLastUpdated(new Date());
      setError(null);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar artículos');
      setIsConnected(false);
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createArticle = useCallback(async (articleData: Partial<Article>): Promise<Article | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const newArticle: Article = await response.json();
      
      // Actualizar la lista local
      setArticles(prev => [newArticle, ...prev]);
      setLastUpdated(new Date());
      
      return newArticle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear artículo');
      console.error('Error creating article:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchArticles, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchArticles]);

  return {
    articles,
    loading,
    error,
    lastUpdated,
    isConnected,
    fetchArticles,
    createArticle,
  };
};
