import React, { useRef, useEffect, useState } from 'react';
import type { Layer, SelectedKeyframeInfo } from '../../types/animator';
import { formatPropertyName } from '../../utils/animator/animation';

interface TimelinePanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  selectedPropertyKey:
    | keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>
    | null;
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  timelineZoom: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onDurationChange: (duration: number) => void;
  onTimelineZoom: (zoom: number) => void;
  onKeyframeSelect: (info: SelectedKeyframeInfo | null) => void;
  onKeyframeAdd: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    time: number,
    value: number,
  ) => void;
  onKeyframeUpdate: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    oldTime: number,
    newTime: number,
    newValue: number,
  ) => void;
  onKeyframeRemove: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    time: number,
  ) => void;
}

const KeyframeMarker: React.FC<{
  keyframe: { id: string; time: number; value: number };
  position: number;
  isSelected: boolean;
  onClick: () => void;
  onDrag: (newTime: number) => void;
  timelineInfo: { duration: number; zoom: number };
}> = ({ keyframe, position, isSelected, onClick, onDrag, timelineInfo }) => {
  const msToPx = (ms: number) => (ms / 100) * timelineInfo.zoom;
  const pxToMs = (px: number) => (px / timelineInfo.zoom) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startTime = keyframe.time;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = pxToMs(deltaX);
      const newTime = Math.max(
        0,
        Math.min(timelineInfo.duration, startTime + deltaTime),
      );
      onDrag(newTime);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = () => {
    onClick();
  };

  return (
    <div
      className={`absolute w-3 h-3 -mt-1.5 cursor-pointer ${
        isSelected ? 'bg-blue-500' : 'bg-gray-500'
      } rounded-full hover:bg-blue-400`}
      style={{ left: `${position}px` }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    />
  );
};

const PropertyTrack: React.FC<{
  layerId: string;
  propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>;
  property: { keyframes: { id: string; time: number; value: number }[] };
  timelineInfo: { duration: number; zoom: number };
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  onKeyframeClick: (info: SelectedKeyframeInfo | null) => void;
  onAddKeyframe: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    time: number,
    value: number,
  ) => void;
  onDragKeyframe: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    oldTime: number,
    newTime: number,
    newValue: number,
  ) => void;
}> = ({
  layerId,
  propertyKey,
  property,
  timelineInfo,
  selectedKeyframeInfo,
  onKeyframeClick,
  onAddKeyframe,
  onDragKeyframe,
}) => {
  const { duration, zoom } = timelineInfo;
  const msToPx = (ms: number) => (ms / 100) * zoom;

  const handleTrackDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / zoom) * 100;
    onAddKeyframe(
      layerId,
      propertyKey,
      time,
      property.keyframes[0]?.value || 0,
    );
  };

  return (
    <div className='relative h-8 border-b border-gray-700'>
      <div className='absolute inset-0' onDoubleClick={handleTrackDoubleClick}>
        {property.keyframes.map((keyframe) => (
          <KeyframeMarker
            key={keyframe.id}
            keyframe={keyframe}
            position={msToPx(keyframe.time)}
            isSelected={
              selectedKeyframeInfo?.layerId === layerId &&
              selectedKeyframeInfo?.propertyKey === propertyKey &&
              selectedKeyframeInfo?.keyframeId === keyframe.id
            }
            onClick={() =>
              onKeyframeClick({ layerId, propertyKey, keyframeId: keyframe.id })
            }
            onDrag={(newTime) =>
              onDragKeyframe(
                layerId,
                propertyKey,
                keyframe.time,
                newTime,
                keyframe.value,
              )
            }
            timelineInfo={timelineInfo}
          />
        ))}
      </div>
    </div>
  );
};

const BezierCurveEditor: React.FC<{
  value: [number, number, number, number];
  onChange: (value: [number, number, number, number]) => void;
}> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCurve = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.bezierCurveTo(
        value[0] * canvas.width,
        (1 - value[1]) * canvas.height,
        value[2] * canvas.width,
        (1 - value[3]) * canvas.height,
        canvas.width,
        0
      );
      ctx.stroke();
    };

    drawCurve();
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = 1 - (e.clientY - rect.top) / canvas.height;

    if (Math.abs(x - value[0]) < 0.1 && Math.abs(y - value[1]) < 0.1) {
      setIsDragging(true);
      setDraggedPoint(0);
    } else if (Math.abs(x - value[2]) < 0.1 && Math.abs(y - value[3]) < 0.1) {
      setIsDragging(true);
      setDraggedPoint(1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || draggedPoint === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = 1 - (e.clientY - rect.top) / canvas.height;

    const newValue = [...value] as [number, number, number, number];
    newValue[draggedPoint * 2] = x;
    newValue[draggedPoint * 2 + 1] = y;
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedPoint(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className='border border-gray-700 rounded'
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  layers,
  selectedLayerId,
  selectedPropertyKey,
  selectedKeyframeInfo,
  currentTime,
  isPlaying,
  duration,
  timelineZoom,
  onTimeChange,
  onPlayPause,
  onDurationChange,
  onTimelineZoom,
  onKeyframeSelect,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeRemove,
}) => {
  const handleTimelineScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / timelineZoom) * 100;
    onTimeChange(Math.max(0, Math.min(duration, time)));
  };

  const handleKeyframeDrag = (layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, oldTime: number, newTime: number, newValue: number) => {
    onKeyframeUpdate(layerId, propertyKey, oldTime, newTime, newValue);
  };

  const handleExportCSS = () => {
    // Logic to export CSS animation
    console.log('Exporting CSS animation');
  };

  const handleExportSVG = () => {
    // Logic to export SVG animation
    console.log('Exporting SVG animation');
  };

  return (
    <div className='h-64 bg-gray-900 border-t border-gray-800 text-gray-200 shadow-xl'>
      <div className='flex items-center justify-between p-4 border-b border-gray-800'>
        <div className='flex items-center space-x-4'>
          <button
            onClick={onPlayPause}
            className='px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 shadow'>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-400'>Duration:</span>
            <input
              type='number'
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className='w-20 px-2 py-1 text-sm border border-gray-700 rounded bg-gray-900 text-white focus:border-blue-500'
            />
            <span className='text-sm text-gray-400'>ms</span>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <span className='text-sm text-gray-400'>Zoom:</span>
          <input
            type='range'
            min='1'
            max='10'
            value={timelineZoom}
            onChange={(e) => onTimelineZoom(Number(e.target.value))}
            className='w-32 accent-blue-600'
          />
        </div>
        <div className='flex items-center space-x-2'>
          <button
            onClick={handleExportCSS}
            className='px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 shadow'>
            Export CSS
          </button>
          <button
            onClick={handleExportSVG}
            className='px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 shadow'>
            Export SVG
          </button>
        </div>
      </div>
      <div className='relative flex-1 overflow-x-auto bg-gray-800'>
        <div
          className='absolute top-0 bottom-0 w-px bg-blue-500'
          style={{ left: `${(currentTime / 100) * timelineZoom}px` }}
        />
        <div className='absolute inset-0' onClick={handleTimelineScrub}>
          {layers.map((layer) => (
            <div key={layer.id} className='mb-4'>
              <div className='px-4 py-2 bg-gray-900 border-b border-gray-800'>
                <h3 className='text-sm font-medium text-white'>{layer.name}</h3>
              </div>
              {Object.entries(layer)
                .filter(
                  ([key]) => !['id', 'name', 'color', 'zIndex'].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key} className='px-4 py-1'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm text-gray-400'>
                        {formatPropertyName(key)}
                      </span>
                    </div>
                    <PropertyTrack
                      layerId={layer.id}
                      propertyKey={key as any}
                      property={value}
                      timelineInfo={{ duration, zoom: timelineZoom }}
                      selectedKeyframeInfo={selectedKeyframeInfo}
                      onKeyframeClick={onKeyframeSelect}
                      onAddKeyframe={onKeyframeAdd}
                      onDragKeyframe={handleKeyframeDrag}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      {selectedKeyframeInfo && (
        <div className='p-4 border-t border-gray-800'>
          <h4 className='text-sm font-medium text-white mb-2'>Easing Control</h4>
          <BezierCurveEditor
            value={[0.25, 0.1, 0.25, 1]}
            onChange={(newValue) => {
              // Handle easing change
            }}
          />
        </div>
      )}
    </div>
  );
};
