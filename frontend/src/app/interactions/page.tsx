"use client";
import React from 'react';
import { useInteractionStats } from '@/hooks/useInteractionStats';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { SimpleChart } from '@/components/charts/SimpleChart';
import { IconRefresh, IconTrendingUp } from '@tabler/icons-react';

export default function InteractionsPage() {
  const { stats, loading, error, lastUpdated, fetchStats } = useInteractionStats();

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas de interacciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-semibold mb-2">Error de conexión</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Interacciones Acumuladas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Análisis de interacciones por categorías
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <ConnectionStatus 
            isConnected={!error}
            lastUpdated={lastUpdated}
          />
          
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
          >
            <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconTrendingUp className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumen General
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.totalInteractions?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Interacciones
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Object.keys(stats?.socialMedia || {}).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Redes Sociales
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Object.keys(stats?.status || {}).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Estados
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {Object.keys(stats?.format || {}).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Formatos
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Object.keys(stats?.tags || {}).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Tags
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid 2x2 de gráficos */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Red Social */}
          <div>
            {stats.socialMedia ? (
              <SimpleChart
                title="Red Social"
                data={stats.socialMedia}
                color="rgb(59, 130, 246)" // blue-500
              />
            ) : (
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6 h-96">
                <p>Cargando gráfico de Red Social...</p>
              </div>
            )}
          </div>
          
          {/* Status */}
          <div>
            <SimpleChart
              title="Status"
              data={stats.status}
              color="rgb(16, 185, 129)" // green-500
            />
          </div>
          
          {/* Formato */}
          <div>
            <SimpleChart
              title="Formato"
              data={stats.format}
              color="rgb(245, 158, 11)" // yellow-500
            />
          </div>
          
          {/* Tags */}
          <div>
            <SimpleChart
              title="Tags"
              data={stats.tags || {}}
              color="rgb(139, 92, 246)" // purple-500
            />
          </div>
        </div>
      )}
      
      {/* Loading indicator durante refresh */}
      {loading && stats && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm">Actualizando estadísticas...</span>
        </div>
      )}
    </div>
  );
}
