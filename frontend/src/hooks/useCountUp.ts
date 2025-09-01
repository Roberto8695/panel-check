import { useState, useEffect } from 'react';

interface UseCountUpProps {
  end: number;
  duration?: number;
  delay?: number;
  startOnMount?: boolean;
}

export const useCountUp = ({ 
  end, 
  duration = 2000, 
  delay = 0, 
  startOnMount = true 
}: UseCountUpProps) => {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!startOnMount) return;

    const timer = setTimeout(() => {
      setIsAnimating(true);
      
      if (end === 0) {
        // Si el valor final es 0, mostrar 0 inmediatamente
        setCount(0);
        setIsAnimating(false);
        return;
      }

      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Función de easing suave
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);

        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, duration, delay, startOnMount]);

  return { count, isAnimating };
};
