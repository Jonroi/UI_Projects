import React, { useState, useCallback, useRef } from 'react';
import type { Layer, AppState, SelectedKeyframeInfo } from './types/animator';
import { LayerPanel } from './components/animator/LayerPanel';
import { TimelinePanel } from './components/animator/TimelinePanel';
import { PreviewCanvas } from './components/animator/PreviewCanvas';
import {
  createDefaultAnimatedProperty,
  generateId,
} from './utils/animator/animation';

const LAYER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEEAD',
  '#D4A5A5',
  '#9B59B6',
  '#3498DB',
];

const createNewLayer = (
  name: string,
  zIndex: number,
  color: string = LAYER_COLORS[zIndex % LAYER_COLORS.length],
  initialX: number = 50,
  initialY: number = 50,
): Layer => ({
  id: generateId(),
  name,
  x: createDefaultAnimatedProperty(initialX),
  y: createDefaultAnimatedProperty(initialY),
  width: createDefaultAnimatedProperty(100),
  height: createDefaultAnimatedProperty(100),
  opacity: createDefaultAnimatedProperty(1),
  rotation: createDefaultAnimatedProperty(0),
  scale: createDefaultAnimatedProperty(1),
  color,
  zIndex,
});

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    layers: [],
    selectedLayerId: null,
    selectedPropertyKey: null,
    selectedKeyframeInfo: null,
    currentTime: 0,
    isPlaying: false,
    duration: 10000,
    timelineZoom: 5,
  });

  const animationFrameRef = useRef<number>();
  const lastTimestampRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    setAppState((prevState) => {
      if (!prevState.isPlaying) return prevState;

      const newTime = prevState.currentTime + deltaTime;
      if (newTime >= prevState.duration) {
        return {
          ...prevState,
          currentTime: 0,
        };
      }

      return {
        ...prevState,
        currentTime: newTime,
      };
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  React.useEffect(() => {
    if (appState.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [appState.isPlaying, animate]);

  React.useEffect(() => {
    if (appState.layers.length === 0) {
      setAppState((prevState) => ({
        ...prevState,
        layers: [
          createNewLayer('Layer 1', 0),
        ],
        selectedLayerId: prevState.selectedLayerId || 'Layer 1',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddLayer = useCallback(() => {
    setAppState((prevState) => ({
      ...prevState,
      layers: [
        ...prevState.layers,
        createNewLayer(
          `Layer ${prevState.layers.length + 1}`,
          prevState.layers.length,
        ),
      ],
    }));
  }, []);

  const handleDeleteLayer = useCallback((layerId: string) => {
    setAppState((prevState) => ({
      ...prevState,
      layers: prevState.layers.filter((layer) => layer.id !== layerId),
      selectedLayerId:
        prevState.selectedLayerId === layerId
          ? null
          : prevState.selectedLayerId,
    }));
  }, []);

  const handleMoveLayer = useCallback(
    (layerId: string, direction: 'up' | 'down') => {
      setAppState((prevState) => {
        const layerIndex = prevState.layers.findIndex(
          (layer) => layer.id === layerId,
        );
        if (layerIndex === -1) return prevState;

        const newLayers = [...prevState.layers];
        const newIndex = direction === 'up' ? layerIndex + 1 : layerIndex - 1;

        if (newIndex < 0 || newIndex >= newLayers.length) return prevState;

        const layer = newLayers[layerIndex];
        newLayers[layerIndex] = {
          ...newLayers[newIndex],
          zIndex: layer.zIndex,
        };
        newLayers[newIndex] = { ...layer, zIndex: newLayers[newIndex].zIndex };

        return {
          ...prevState,
          layers: newLayers,
        };
      });
    },
    [],
  );

  const handleUpdateLayer = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      value: number,
    ) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                [propertyKey]: {
                  ...layer[propertyKey],
                  defaultValue: value,
                },
              }
            : layer,
        ),
      }));
    },
    [],
  );

  const handleUpdateLayerName = useCallback((layerId: string, name: string) => {
    setAppState((prevState) => ({
      ...prevState,
      layers: prevState.layers.map((layer) =>
        layer.id === layerId ? { ...layer, name } : layer,
      ),
    }));
  }, []);

  const handleUpdateLayerColor = useCallback(
    (layerId: string, color: string) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId ? { ...layer, color } : layer,
        ),
      }));
    },
    [],
  );

  const handleLayerPositionChange = useCallback(
    (layerId: string, x: number, y: number) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                x: { ...layer.x, defaultValue: x },
                y: { ...layer.y, defaultValue: y },
              }
            : layer,
        ),
      }));
    },
    [],
  );

  const handleKeyframeAdd = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      time: number,
      value: number,
    ) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                [propertyKey]: {
                  ...layer[propertyKey],
                  keyframes: [
                    ...layer[propertyKey].keyframes,
                    { time, value },
                  ].sort((a, b) => a.time - b.time),
                },
              }
            : layer,
        ),
      }));
    },
    [],
  );

  const handleKeyframeUpdate = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      oldTime: number,
      newTime: number,
      newValue: number,
    ) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                [propertyKey]: {
                  ...layer[propertyKey],
                  keyframes: layer[propertyKey].keyframes
                    .filter((kf) => kf.time !== oldTime)
                    .concat([{ time: newTime, value: newValue }])
                    .sort((a, b) => a.time - b.time),
                },
              }
            : layer,
        ),
      }));
    },
    [],
  );

  const handleKeyframeRemove = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      time: number,
    ) => {
      setAppState((prevState) => ({
        ...prevState,
        layers: prevState.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                [propertyKey]: {
                  ...layer[propertyKey],
                  keyframes: layer[propertyKey].keyframes.filter(
                    (kf) => kf.time !== time,
                  ),
                },
              }
            : layer,
        ),
      }));
    },
    [],
  );

  const handleSelectLayer = useCallback((layerId: string | null) => {
    setAppState((prevState) => ({
      ...prevState,
      selectedLayerId: layerId,
      selectedPropertyKey: null,
      selectedKeyframeInfo: null,
    }));
  }, []);

  const handleSelectProperty = useCallback(
    (
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'> | null,
    ) => {
      setAppState((prevState) => ({
        ...prevState,
        selectedPropertyKey: propertyKey,
        selectedKeyframeInfo: null,
      }));
    },
    [],
  );

  const handleSelectKeyframe = useCallback(
    (keyframeInfo: SelectedKeyframeInfo | null) => {
      setAppState((prevState) => ({
        ...prevState,
        selectedKeyframeInfo: keyframeInfo,
      }));
    },
    [],
  );

  const handleTimeChange = useCallback((time: number) => {
    setAppState((prevState) => ({
      ...prevState,
      currentTime: Math.max(0, Math.min(time, prevState.duration)),
    }));
  }, []);

  const handlePlayPause = useCallback(() => {
    setAppState((prevState) => ({
      ...prevState,
      isPlaying: !prevState.isPlaying,
    }));
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setAppState((prevState) => ({
      ...prevState,
      duration: Math.max(1000, duration),
      currentTime: Math.min(prevState.currentTime, duration),
    }));
  }, []);

  const handleTimelineZoom = useCallback((zoom: number) => {
    setAppState((prevState) => ({
      ...prevState,
      timelineZoom: Math.max(1, Math.min(zoom, 10)),
    }));
  }, []);

  return (
    <div className='flex h-screen bg-gray-900 text-white'>
      <div className='w-64 border-r border-gray-700'>
        <LayerPanel
          layers={appState.layers}
          selectedLayerId={appState.selectedLayerId}
          selectedPropertyKey={appState.selectedPropertyKey}
          onLayerSelect={handleSelectLayer}
          onLayerAdd={handleAddLayer}
          onLayerDelete={handleDeleteLayer}
          onLayerMove={handleMoveLayer}
          onLayerUpdate={handleUpdateLayer}
          onLayerNameUpdate={handleUpdateLayerName}
          onLayerColorUpdate={handleUpdateLayerColor}
          onPropertySelect={handleSelectProperty}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeUpdate={handleKeyframeUpdate}
          onKeyframeRemove={handleKeyframeRemove}
        />
      </div>
      <div className='flex-1 flex flex-col'>
        <div className='flex-1 relative'>
          <PreviewCanvas
            layers={appState.layers}
            currentTime={appState.currentTime}
            canvasSize={{ width: 800, height: 600 }}
            onLayerPositionChange={handleLayerPositionChange}
          />
        </div>
        <div className='h-64 border-t border-gray-700'>
          <TimelinePanel
            layers={appState.layers}
            selectedLayerId={appState.selectedLayerId}
            selectedPropertyKey={appState.selectedPropertyKey}
            selectedKeyframeInfo={appState.selectedKeyframeInfo}
            currentTime={appState.currentTime}
            isPlaying={appState.isPlaying}
            duration={appState.duration}
            timelineZoom={appState.timelineZoom}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onDurationChange={handleDurationChange}
            onTimelineZoom={handleTimelineZoom}
            onKeyframeSelect={handleSelectKeyframe}
            onKeyframeAdd={handleKeyframeAdd}
            onKeyframeUpdate={handleKeyframeUpdate}
            onKeyframeRemove={handleKeyframeRemove}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
