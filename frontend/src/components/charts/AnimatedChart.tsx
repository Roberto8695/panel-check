import React, { useState, useEffect } from 'react';

interface AnimatedChartProps {
  title: string;
  data: Record<string, number>;
  color: string;
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({ title, data, color }) => {
  const [animatedData, setAnimatedData] = useState<Record<string, number>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Calcular el máximo valor
  const maxValue = Math.max(...Object.values(data));

  useEffect(() => {
    // Inicializar todos los valores en 0
    const initialData = Object.keys(data).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    setAnimatedData(initialData);
    setIsAnimating(true);

    // Iniciar animación después de un delay
    const timer = setTimeout(() => {
      const duration = 2000; // 2 segundos
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Función de easing suave
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        const newAnimatedData = Object.keys(data).reduce((acc, key) => {
          const targetValue = data[key];
          acc[key] = Math.floor(targetValue * easeOutQuart);
          return acc;
        }, {} as Record<string, number>);

        setAnimatedData(newAnimatedData);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Asegurar valores finales exactos
          setAnimatedData(data);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }, 1200); // Delay para que empiece después del resumen

    return () => clearTimeout(timer);
  }, [data]);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6 h-96">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      
      <div className="space-y-3 h-80 overflow-y-auto">
        {Object.entries(data).map(([key, value]) => {
          const animatedValue = animatedData[key] || 0;
          const percentage = maxValue > 0 ? (animatedValue / maxValue) * 100 : 0;
          
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {key}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    {animatedValue.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300 ease-out"
                    style={{
                      backgroundColor: color,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
