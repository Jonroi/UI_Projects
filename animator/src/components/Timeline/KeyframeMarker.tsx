import React from 'react';
import type { Keyframe } from '../../types';

interface KeyframeMarkerProps {
  keyframe: Keyframe;
  position: number; // x-position on the track
  isSelected: boolean;
  onClick: () => void;
  onDrag: (newTime: number) => void;
  timelineInfo: { duration: number; zoom: number };
}

export const KeyframeMarker: React.FC<KeyframeMarkerProps> = ({
  keyframe,
  position,
  isSelected,
  onClick,
  onDrag,
  timelineInfo,
}) => {
  const pxToMs = (px: number) => (px / timelineInfo.zoom) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startTime = keyframe.time;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newTime = Math.max(
        0,
        Math.min(timelineInfo.duration, startTime + pxToMs(deltaX)),
      );
      onDrag(newTime);
    };

    const handleMouseUp = () => {
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
      className={`absolute w-3 h-3 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 border-2 transition-colors ${
        isSelected
          ? 'bg-blue-500 border-blue-700'
          : 'bg-white border-gray-400 hover:border-gray-600'
      }`}
      style={{ left: `${position}px`, top: '50%' }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={`Keyframe at ${keyframe.time}ms`}
    />
  );
};
