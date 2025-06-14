import React, { useRef, useEffect } from 'react';
import type { Layer } from '../../types/animator';
import { getAnimatedValueAtTime } from '../../utils/animator/animation';

interface PreviewCanvasProps {
  layers: Layer[];
  currentTime: number;
  canvasSize: { width: number; height: number };
  onLayerPositionChange?: (layerId: string, x: number, y: number) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  layers,
  currentTime,
  canvasSize,
  onLayerPositionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const draggedLayerId = useRef<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sort layers by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Draw each layer
    sortedLayers.forEach((layer) => {
      const x = getAnimatedValueAtTime(layer.x, currentTime);
      const y = getAnimatedValueAtTime(layer.y, currentTime);
      const width = getAnimatedValueAtTime(layer.width, currentTime);
      const height = getAnimatedValueAtTime(layer.height, currentTime);
      const opacity = getAnimatedValueAtTime(layer.opacity, currentTime);
      const rotation = getAnimatedValueAtTime(layer.rotation, currentTime);
      const scale = getAnimatedValueAtTime(layer.scale, currentTime);

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    });
  }, [layers, currentTime, canvasSize]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !draggedLayerId.current || !onLayerPositionChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ensure the layer stays within the canvas bounds
    const boundedX = Math.max(0, Math.min(x, canvasSize.width));
    const boundedY = Math.max(0, Math.min(y, canvasSize.height));

    onLayerPositionChange(draggedLayerId.current, boundedX, boundedY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the topmost layer at the click position
    const clickedLayer = layers
      .slice()
      .reverse()
      .find((layer) => {
        const layerX = getAnimatedValueAtTime(layer.x, currentTime);
        const layerY = getAnimatedValueAtTime(layer.y, currentTime);
        const layerWidth = getAnimatedValueAtTime(layer.width, currentTime);
        const layerHeight = getAnimatedValueAtTime(layer.height, currentTime);

        return (
          x >= layerX &&
          x <= layerX + layerWidth &&
          y >= layerY &&
          y <= layerY + layerHeight
        );
      });

    if (clickedLayer) {
      isDragging.current = true;
      draggedLayerId.current = clickedLayer.id;
    } else {
      isDragging.current = false;
      draggedLayerId.current = null;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    draggedLayerId.current = null;
  };

  return (
    <div className='flex-1 p-4 bg-gray-900'>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className='w-full h-full max-h-[calc(100vh-200px)] border border-gray-700 rounded shadow-lg'
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
