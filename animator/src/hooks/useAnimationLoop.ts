import { useEffect, useRef } from 'react';

interface UseAnimationLoopProps {
  isPlaying: boolean;
  duration: number;
  onTimeUpdate: (time: number) => void;
}

export const useAnimationLoop = ({
  isPlaying,
  duration,
  onTimeUpdate,
}: UseAnimationLoopProps) => {
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isPlaying) {
      startTimeRef.current = undefined;
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) % duration;
      onTimeUpdate(elapsed);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration, onTimeUpdate]);

  return {
    stop: () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = undefined;
    },
  };
}; 