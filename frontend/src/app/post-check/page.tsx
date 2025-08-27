"use client";
import React, { useState } from 'react';
import { IconRefresh, IconEye, IconExternalLink, IconFilter, IconSearch, IconPlus, IconCalendar } from '@tabler/icons-react';
import { useArticles } from '@/hooks/useArticles';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { DiffusionChart } from '@/components/charts/DiffusionChart';
import { EngagementStats } from '@/components/charts/EngagementStats';

export default function PostCheckPage() {
  const { 
    articles, 
    loading, 
    error, 
    lastUpdated, 
    isConnected, 
    fetchArticles, 
    createArticle 
  } = useArticles(true, 30000); // Auto-refresh cada 30 segundos
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [newArticle, setNewArticle] = useState({
    title: '',
    summary: '',
    url: '',
    language: 'es'
  });

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newArticle.title.trim()) return;
    
    const created = await createArticle(newArticle);
    
    if (created) {
      setNewArticle({ title: '', summary: '', url: '', language: 'es' });
      setShowCreateForm(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (article.summary || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verificado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Falso':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Engañoso':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Sin iniciar':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'Inconcluso':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'En progreso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Post Check
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-gray-600 dark:text-gray-400">
              Gestión de artículos de CheckMedia
            </p>
            <ConnectionStatus 
              isConnected={isConnected} 
              lastUpdated={lastUpdated}
              className="hidden sm:flex"
            />
          </div>
          <ConnectionStatus 
            isConnected={isConnected} 
            lastUpdated={lastUpdated}
            className="sm:hidden mt-2"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo
          </button>
          
          <button
            onClick={fetchArticles}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
          >
            <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-neutral-800 dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Crear Nuevo Artículo
          </h3>
          <form onSubmit={handleCreateArticle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-neutral-800 dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resumen
              </label>
              <textarea
                value={newArticle.summary}
                onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={newArticle.url}
                  onChange={(e) => setNewArticle({ ...newArticle, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Idioma
                </label>
                <select
                  value={newArticle.language}
                  onChange={(e) => setNewArticle({ ...newArticle, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="fr">Francés</option>
                  <option value="de">Alemán</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Crear Artículo
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex-1">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar artículos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="Verificado">Verificado</option>
            <option value="Falso">Falso</option>
            <option value="Engañoso">Engañoso</option>
            <option value="Sin iniciar">Sin iniciar</option>
            <option value="Inconcluso">Inconcluso</option>
            <option value="En progreso">En progreso</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="space-y-6">
        {/* Engagement Stats */}
        <EngagementStats articles={articles} />
        
        {/* Diffusion Chart */}
        <DiffusionChart 
          articles={articles} 
          timeRange={timeRange}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            Error: {error}
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            {!isConnected && "Asegúrate de que el servidor backend esté ejecutándose en http://localhost:5001"}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {filteredArticles.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrados
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {articles.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {articles.filter(a => a.status === 'Verificado').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Verificados
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {articles.filter(a => a.status === 'Falso').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Falsos
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron artículos con los filtros aplicados'
                : 'No hay artículos disponibles'
              }
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {article.title || 'Sin título'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {article.summary || article.title || 'Sin resumen disponible'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                        {article.status}
                      </span>
                      {article.source && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {article.source}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>ID: {article.id}</span>
                    {article.format && <span>Formato: {article.format}</span>}
                    {article.engagement && (
                      <>
                        <span>👍 {article.engagement.reactions}</span>
                        <span>💬 {article.engagement.comments}</span>
                        <span>🔄 {article.engagement.shares}</span>
                        <span>👁️ {article.engagement.views}</span>
                      </>
                    )}
                    {article.createdAt && (
                      <span>Creado: {formatDate(article.createdAt)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <IconEye className="h-4 w-4" />
                    Ver
                  </button>
                  
                  {article.url && article.url !== '#' && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                      title="Abrir enlace"
                    >
                      <IconExternalLink className="h-4 w-4" />
                      Enlace
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loading indicator during refresh */}
      {loading && articles.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm">Actualizando...</span>
        </div>
      )}
    </div>
  );
}