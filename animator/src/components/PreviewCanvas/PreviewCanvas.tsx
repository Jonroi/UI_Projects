import React from 'react';
import { getAnimatedValueAtTime } from '../../utils/animation';
import type { Layer, CanvasSize } from '../../types';

interface PreviewCanvasProps {
  layers: Layer[];
  currentTime: number;
  canvasSize: CanvasSize;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  layers,
  currentTime,
  canvasSize,
}) => {
  return (
    <div className='flex-1 bg-gray-100 p-4 overflow-auto'>
      <div className='bg-white border border-gray-300 shadow-lg mx-auto'>
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          className='block'>
          {layers
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((layer) => {
              const x = getAnimatedValueAtTime(layer.x, currentTime);
              const y = getAnimatedValueAtTime(layer.y, currentTime);
              const width = getAnimatedValueAtTime(layer.width, currentTime);
              const height = getAnimatedValueAtTime(layer.height, currentTime);
              const opacity = getAnimatedValueAtTime(
                layer.opacity,
                currentTime,
              );
              const rotation = getAnimatedValueAtTime(
                layer.rotation,
                currentTime,
              );
              const scale = getAnimatedValueAtTime(layer.scale, currentTime);

              return (
                <rect
                  key={layer.id}
                  x={x}
                  y={y}
                  width={Math.max(0, width)}
                  height={Math.max(0, height)}
                  fill={layer.color}
                  opacity={Math.max(0, Math.min(1, opacity))}
                  transform={`rotate(${rotation} ${x + width / 2} ${
                    y + height / 2
                  }) scale(${scale} ${scale})`}
                />
              );
            })}
        </svg>
      </div>

      <div className='mt-4 text-center text-sm text-gray-600'>
        Canvas: {canvasSize.width} × {canvasSize.height}px
      </div>
    </div>
  );
};
