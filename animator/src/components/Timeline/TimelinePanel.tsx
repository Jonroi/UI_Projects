import React from 'react';
import { PropertyTrack } from './PropertyTrack';
import type { AppState, SelectedKeyframeInfo, Layer } from '../../types';

interface TimelinePanelProps {
  appState: AppState;
  onSetCurrentTime: (time: number) => void;
  onTogglePlay: () => void;
  onAddKeyframe: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    time: number,
  ) => void;
  onDragKeyframe: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    keyframeId: string,
    newTime: number,
  ) => void;
  onSelectKeyframe: (info: SelectedKeyframeInfo | null) => void;
  onChangeDuration: (newDuration: number) => void;
  onChangeZoom: (newZoom: number) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  appState,
  onSetCurrentTime,
  onTogglePlay,
  onAddKeyframe,
  onDragKeyframe,
  onSelectKeyframe,
  onChangeDuration,
  onChangeZoom,
}) => {
  const {
    layers,
    selectedLayerId,
    selectedKeyframeInfo,
    currentTime,
    isPlaying,
    duration,
    timelineZoom,
  } = appState;

  const msToPx = (ms: number) => (ms / 100) * timelineZoom;

  const handleTimelineScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, (x / timelineZoom) * 100));
    onSetCurrentTime(newTime);
  };

  const timelineWidth = msToPx(duration);

  return (
    <div className='flex-1 bg-white border-t border-gray-300 overflow-hidden'>
      {/* Timeline Controls */}
      <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center space-x-4'>
          <button
            onClick={onTogglePlay}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <div className='text-sm text-gray-600'>
            Time: {Math.round(currentTime)}ms
          </div>
        </div>

        <div className='flex items-center space-x-4'>
          <div className='flex items-center space-x-2'>
            <label className='text-sm font-medium'>Duration:</label>
            <input
              type='number'
              value={duration}
              onChange={(e) => onChangeDuration(Number(e.target.value))}
              className='w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
              min='1000'
              step='1000'
            />
            <span className='text-sm text-gray-600'>ms</span>
          </div>

          <div className='flex items-center space-x-2'>
            <label className='text-sm font-medium'>Zoom:</label>
            <input
              type='range'
              value={timelineZoom}
              onChange={(e) => onChangeZoom(Number(e.target.value))}
              className='w-24'
              min='0.5'
              max='5'
              step='0.1'
            />
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className='flex h-full'>
        {/* Timeline Tracks */}
        <div className='flex-1 overflow-auto'>
          {/* Time Ruler */}
          <div className='sticky top-0 z-10 bg-white border-b border-gray-300'>
            <div className='flex items-center'>
              <div className='w-32 px-3 py-2 text-sm font-medium bg-gray-100 border-r border-gray-200 flex-shrink-0'>
                Time
              </div>
              <div
                className='relative h-8 bg-gray-100 cursor-pointer'
                style={{ width: `${timelineWidth}px` }}
                onClick={handleTimelineScrub}>
                {/* Time markers */}
                {Array.from({ length: Math.floor(duration / 1000) + 1 }).map(
                  (_, i) => {
                    const time = i * 1000;
                    const x = msToPx(time);
                    return (
                      <div
                        key={i}
                        className='absolute top-0 bottom-0 border-l border-gray-400'
                        style={{ left: `${x}px` }}>
                        <div className='absolute top-1 left-1 text-xs text-gray-600'>
                          {time}ms
                        </div>
                      </div>
                    );
                  },
                )}

                {/* Current time indicator */}
                <div
                  className='absolute top-0 bottom-0 w-0.5 bg-red-500 z-20'
                  style={{ left: `${msToPx(currentTime)}px` }}
                />
              </div>
            </div>
          </div>

          {/* Property Tracks */}
          <div>
            {layers
              .filter(
                (layer) =>
                  selectedLayerId === null || layer.id === selectedLayerId,
              )
              .map((layer) => (
                <div key={layer.id} className='border-b border-gray-300'>
                  {/* Layer Header */}
                  <div className='flex items-center bg-gray-50 border-b border-gray-200'>
                    <div className='w-32 px-3 py-2 font-medium text-sm border-r border-gray-200 flex-shrink-0'>
                      {layer.name}
                    </div>
                    <div
                      className='flex-1 h-6'
                      style={{ width: `${timelineWidth}px` }}
                    />
                  </div>

                  {/* Property Tracks */}
                  {(Object.keys(layer) as Array<keyof Layer>)
                    .filter(
                      (
                        key,
                      ): key is keyof Omit<
                        Layer,
                        'id' | 'name' | 'color' | 'zIndex'
                      > => !['id', 'name', 'color', 'zIndex'].includes(key),
                    )
                    .map((propertyKey) => (
                      <PropertyTrack
                        key={propertyKey}
                        layer={layer}
                        propertyKey={propertyKey}
                        property={layer[propertyKey]}
                        timelineInfo={{ duration, zoom: timelineZoom }}
                        selectedKeyframeInfo={selectedKeyframeInfo}
                        onAddKeyframe={onAddKeyframe}
                        onDragKeyframe={onDragKeyframe}
                        onSelectKeyframe={onSelectKeyframe}
                      />
                    ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
