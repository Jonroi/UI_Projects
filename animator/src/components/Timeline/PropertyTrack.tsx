import React from 'react';
import { KeyframeMarker } from './KeyframeMarker';

import type {
  Layer,
  AnimatedProperty,
  SelectedKeyframeInfo,
} from '../../types';

interface PropertyTrackProps {
  layer: Layer;
  propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>;
  property: AnimatedProperty;
  timelineInfo: { duration: number; zoom: number };
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
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
}

export const PropertyTrack: React.FC<PropertyTrackProps> = ({
  layer,
  propertyKey,
  property,
  timelineInfo,
  selectedKeyframeInfo,
  onAddKeyframe,
  onDragKeyframe,
  onSelectKeyframe,
}) => {
  const msToPx = (ms: number) => (ms / 100) * timelineInfo.zoom;

  const handleTrackDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = Math.round((x / timelineInfo.zoom) * 100);
    onAddKeyframe(layer.id, propertyKey, time);
  };

  return (
    <div className='flex items-center border-b border-gray-200 bg-white'>
      <div className='w-32 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200 flex-shrink-0'>
        {propertyKey}
      </div>
      <div
        className='relative h-8 flex-1 bg-gray-100 hover:bg-gray-200 cursor-crosshair'
        onDoubleClick={handleTrackDoubleClick}>
        {property.keyframes.map((keyframe) => (
          <KeyframeMarker
            key={keyframe.id}
            keyframe={keyframe}
            position={msToPx(keyframe.time)}
            isSelected={
              selectedKeyframeInfo?.layerId === layer.id &&
              selectedKeyframeInfo?.propertyKey === propertyKey &&
              selectedKeyframeInfo?.keyframeId === keyframe.id
            }
            onClick={() =>
              onSelectKeyframe({
                layerId: layer.id,
                propertyKey,
                keyframeId: keyframe.id,
              })
            }
            onDrag={(newTime) =>
              onDragKeyframe(layer.id, propertyKey, keyframe.id, newTime)
            }
            timelineInfo={timelineInfo}
          />
        ))}
      </div>
    </div>
  );
};
