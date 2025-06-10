import React, { useState, useCallback } from 'react';
import {
  KeyframeEditor,
  LayerPanel,
  TimelinePanel,
  PreviewCanvas,
  ExportControls,
  ErrorBoundary,
} from './components';
import { useAnimationLoop } from './hooks';
import { createNewLayer, getMaxZIndex } from './utils/layer';
import { generateId } from './utils/animation';
import type {
  AppState,
  Layer,
  SelectedKeyframeInfo,
  EasingFunction,
} from './types';
import { DEFAULT_CANVAS_SIZE, ANIMATION_CONFIG } from './constants';

const initialState: AppState = {
  layers: [],
  selectedLayerId: null,
  selectedPropertyKey: null,
  selectedKeyframeInfo: null,
  currentTime: 0,
  isPlaying: false,
  duration: ANIMATION_CONFIG.defaultDuration,
  timelineZoom: ANIMATION_CONFIG.defaultZoom,
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(initialState);

  // Animation loop using custom hook
  useAnimationLoop({
    isPlaying: appState.isPlaying,
    duration: appState.duration,
    onTimeUpdate: useCallback((time: number) => {
      setAppState(prev => ({ ...prev, currentTime: time }));
    }, []),
  });

  // Layer management
  const handleAddLayer = useCallback(() => {
    const maxZ = getMaxZIndex(appState.layers);
    const newLayer = createNewLayer(
      `Layer ${appState.layers.length + 1}`,
      maxZ + 1,
    );

    setAppState((prev) => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));
  }, [appState.layers]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    setAppState((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
      selectedLayerId:
        prev.selectedLayerId === layerId ? null : prev.selectedLayerId,
      selectedKeyframeInfo:
        prev.selectedKeyframeInfo?.layerId === layerId
          ? null
          : prev.selectedKeyframeInfo,
    }));
  }, []);

  const handleSelectLayer = useCallback((layerId: string) => {
    setAppState((prev) => ({
      ...prev,
      selectedLayerId: layerId,
      selectedKeyframeInfo: null,
    }));
  }, []);

  const handleMoveLayer = useCallback(
    (layerId: string, direction: 'up' | 'down') => {
      setAppState((prev) => {
        const layers = [...prev.layers];
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return prev;

        const delta = direction === 'up' ? 1 : -1;
        layer.zIndex += delta;

        return { ...prev, layers };
      });
    },
    [],
  );

  // Timeline controls
  const handleSetCurrentTime = useCallback((time: number) => {
    setAppState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const handleTogglePlay = useCallback(() => {
    setAppState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleChangeDuration = useCallback((newDuration: number) => {
    setAppState((prev) => ({ ...prev, duration: Math.max(1000, newDuration) }));
  }, []);

  const handleChangeZoom = useCallback((newZoom: number) => {
    setAppState((prev) => ({ ...prev, timelineZoom: Math.max(0.1, newZoom) }));
  }, []);

  // Keyframe management
  const handleAddKeyframe = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      time: number,
    ) => {
      setAppState((prev) => {
        const layers = prev.layers.map((layer) => {
          if (layer.id !== layerId) return layer;

          const property = layer[propertyKey];
          const newKeyframe = {
            id: generateId(),
            time: Math.max(0, Math.min(prev.duration, time)),
            value: property.defaultValue,
            easing: 'linear' as const,
          };

          return {
            ...layer,
            [propertyKey]: {
              ...property,
              keyframes: [...property.keyframes, newKeyframe].sort(
                (a, b) => a.time - b.time,
              ),
            },
          };
        });

        return { ...prev, layers };
      });
    },
    [],
  );

  const handleDragKeyframe = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      keyframeId: string,
      newTime: number,
    ) => {
      setAppState((prev) => {
        const layers = prev.layers.map((layer) => {
          if (layer.id !== layerId) return layer;

          const property = layer[propertyKey];
          const keyframes = property.keyframes
            .map((kf) =>
              kf.id === keyframeId
                ? { ...kf, time: Math.max(0, Math.min(prev.duration, newTime)) }
                : kf,
            )
            .sort((a, b) => a.time - b.time);

          return {
            ...layer,
            [propertyKey]: { ...property, keyframes },
          };
        });

        return { ...prev, layers };
      });
    },
    [],
  );

  const handleSelectKeyframe = useCallback(
    (info: SelectedKeyframeInfo | null) => {
      setAppState((prev) => ({ ...prev, selectedKeyframeInfo: info }));
    },
    [],
  );

  const handleUpdateKeyframe = useCallback(
    (
      layerId: string,
      propertyKey: string,
      keyframeId: string,
      newTime: number,
      newValue: number,
      newEasing: EasingFunction,
    ) => {
      setAppState((prev) => {
        const layers = prev.layers.map((layer) => {
          if (layer.id !== layerId) return layer;

          const property = layer[propertyKey as keyof typeof layer];
          if (
            !property ||
            typeof property !== 'object' ||
            !('keyframes' in property)
          ) {
            return layer;
          }

          const keyframes = property.keyframes
            .map((kf) =>
              kf.id === keyframeId
                ? {
                    ...kf,
                    time: Math.max(0, Math.min(prev.duration, newTime)),
                    value: newValue,
                    easing: newEasing,
                  }
                : kf,
            )
            .sort((a, b) => a.time - b.time);

          return {
            ...layer,
            [propertyKey]: { ...property, keyframes },
          };
        });

        return { ...prev, layers };
      });
    },
    [],
  );

  const handleClearKeyframeSelection = useCallback(() => {
    setAppState((prev) => ({ ...prev, selectedKeyframeInfo: null }));
  }, []);

  return (
    <ErrorBoundary>
      <div className='h-screen flex flex-col bg-gray-100'>
      {/* Header */}
      <header className='bg-white border-b border-gray-300 px-6 py-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-gray-800'>Animation Studio</h1>
          <div className='text-sm text-gray-600'>
            Professional Animation Editor
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Panel - Layers */}
        <LayerPanel
          layers={appState.layers}
          selectedLayerId={appState.selectedLayerId}
          onSelectLayer={handleSelectLayer}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onMoveLayer={handleMoveLayer}
        />

        {/* Center Panel - Preview and Timeline */}
        <div className='flex-1 flex flex-col'>
          {/* Preview Canvas */}
          <PreviewCanvas
            layers={appState.layers}
            currentTime={appState.currentTime}
            canvasSize={DEFAULT_CANVAS_SIZE}
          />

          {/* Timeline */}
          <TimelinePanel
            appState={appState}
            onSetCurrentTime={handleSetCurrentTime}
            onTogglePlay={handleTogglePlay}
            onAddKeyframe={handleAddKeyframe}
            onDragKeyframe={handleDragKeyframe}
            onSelectKeyframe={handleSelectKeyframe}
            onChangeDuration={handleChangeDuration}
            onChangeZoom={handleChangeZoom}
          />
        </div>

        {/* Right Panel - Export */}
        <ExportControls layers={appState.layers} duration={appState.duration} />
      </div>

      {/* Keyframe Editor Modal */}
      {appState.selectedKeyframeInfo && (
        <KeyframeEditor
          selectedKeyframeInfo={appState.selectedKeyframeInfo}
          layers={appState.layers}
          onUpdateKeyframe={handleUpdateKeyframe}
          onClearSelection={handleClearKeyframeSelection}
        />
      )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
