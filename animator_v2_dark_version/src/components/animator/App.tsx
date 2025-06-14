import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LayerPanel } from './LayerPanel';
import { TimelinePanel } from './TimelinePanel';
import { PreviewCanvas } from './PreviewCanvas';
import type { Layer, SelectedKeyframeInfo } from '../types/animator';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedPropertyKey, setSelectedPropertyKey] = useState<keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'> | null>(null);
  const [selectedKeyframeInfo, setSelectedKeyframeInfo] = useState<SelectedKeyframeInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(5000); // 5 seconds default
  const [timelineZoom, setTimelineZoom] = useState(5);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const FPS = 60;
  const frameInterval = 1000 / FPS;

  // Optimize animation performance
  const animate = useCallback((timestamp: number) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastFrameTimeRef.current;

    if (elapsed > frameInterval) {
      if (isPlaying) {
        setCurrentTime((prevTime) => {
          const newTime = prevTime + elapsed;
          return newTime > duration ? 0 : newTime;
        });
      }
      lastFrameTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);

  const handleAddLayer = useCallback(() => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      x: { keyframes: [], defaultValue: 100 },
      y: { keyframes: [], defaultValue: 100 },
      width: { keyframes: [], defaultValue: 100 },
      height: { keyframes: [], defaultValue: 100 },
      opacity: { keyframes: [], defaultValue: 1 },
      rotation: { keyframes: [], defaultValue: 0 },
      scale: { keyframes: [], defaultValue: 1 },
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      zIndex: layers.length,
    };
    setLayers((prev) => [...prev, newLayer]);
  }, [layers.length]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  const handleMoveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const index = prev.findIndex((layer) => layer.id === layerId);
      if (index === -1) return prev;

      const newLayers = [...prev];
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= newLayers.length) return prev;

      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      return newLayers.map((layer, i) => ({ ...layer, zIndex: i }));
    });
  }, []);

  const handleUpdateLayer = useCallback((layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, value: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              [propertyKey]: {
                ...layer[propertyKey],
                defaultValue: value,
              },
            }
          : layer
      )
    );
  }, []);

  const handleUpdateLayerName = useCallback((layerId: string, name: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, name } : layer
      )
    );
  }, []);

  const handleUpdateLayerColor = useCallback((layerId: string, color: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, color } : layer
      )
    );
  }, []);

  const handleKeyframeSelect = useCallback((info: SelectedKeyframeInfo | null) => {
    setSelectedKeyframeInfo(info);
  }, []);

  const handleKeyframeAdd = useCallback((layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, time: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              [propertyKey]: {
                ...layer[propertyKey],
                keyframes: [
                  ...layer[propertyKey].keyframes,
                  {
                    id: `keyframe-${Date.now()}`,
                    time,
                    value: layer[propertyKey].defaultValue,
                    easing: 'linear',
                  },
                ].sort((a, b) => a.time - b.time),
              },
            }
          : layer
      )
    );
  }, []);

  const handleKeyframeUpdate = useCallback((layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, oldTime: number, newTime: number, newValue: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              [propertyKey]: {
                ...layer[propertyKey],
                keyframes: layer[propertyKey].keyframes.map((keyframe) =>
                  keyframe.time === oldTime
                    ? { ...keyframe, time: newTime, value: newValue }
                    : keyframe
                ).sort((a, b) => a.time - b.time),
              },
            }
          : layer
      )
    );
  }, []);

  const handleKeyframeRemove = useCallback((layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, time: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              [propertyKey]: {
                ...layer[propertyKey],
                keyframes: layer[propertyKey].keyframes.filter(
                  (keyframe) => keyframe.time !== time
                ),
              },
            }
          : layer
      )
    );
  }, []);

  const handleExportCSS = useCallback(() => {
    // Implement CSS export logic
    console.log('Exporting CSS animation');
  }, []);

  const handleExportSVG = useCallback(() => {
    // Implement SVG export logic
    console.log('Exporting SVG animation');
  }, []);

  return (
    <div className='flex flex-col h-screen bg-gray-900 text-white'>
      <div className='flex flex-1 overflow-hidden'>
        <div className='w-96 min-w-[384px] border-r border-gray-800 overflow-y-auto flex-shrink-0'>
          <div className='p-4'>
            <LayerPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={handleLayerSelect}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onMoveLayer={handleMoveLayer}
              onUpdateLayer={handleUpdateLayer}
              onUpdateLayerName={handleUpdateLayerName}
              onUpdateLayerColor={handleUpdateLayerColor}
            />
          </div>
        </div>
        <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
          <div className='flex-1 p-4 overflow-auto'>
            <div className='max-w-full max-h-full'>
              <PreviewCanvas
                layers={layers}
                currentTime={currentTime}
                canvasSize={{ width: 800, height: 600 }}
              />
            </div>
          </div>
          <div className='h-64 min-h-[256px] border-t border-gray-800 flex-shrink-0'>
            <TimelinePanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              selectedPropertyKey={selectedPropertyKey}
              selectedKeyframeInfo={selectedKeyframeInfo}
              currentTime={currentTime}
              isPlaying={isPlaying}
              duration={duration}
              timelineZoom={timelineZoom}
              onTimeChange={setCurrentTime}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onDurationChange={setDuration}
              onTimelineZoom={setTimelineZoom}
              onKeyframeSelect={handleKeyframeSelect}
              onKeyframeAdd={handleKeyframeAdd}
              onKeyframeUpdate={handleKeyframeUpdate}
              onKeyframeRemove={handleKeyframeRemove}
              onExportCSS={handleExportCSS}
              onExportSVG={handleExportSVG}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 