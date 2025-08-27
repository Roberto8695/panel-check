"use client";
import React from 'react';
import { IconWifi, IconWifiOff, IconClock } from '@tabler/icons-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdated: Date | null;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  lastUpdated,
  className = ''
}) => {
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `Hace ${seconds}s`;
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isConnected ? (
        <>
          <IconWifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Conectado</span>
        </>
      ) : (
        <>
          <IconWifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Desconectado</span>
        </>
      )}
      
      {lastUpdated && (
        <>
          <span className="text-gray-400">•</span>
          <IconClock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {formatLastUpdated(lastUpdated)}
          </span>
        </>
      )}
    </div>
  );
};
