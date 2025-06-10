import React from 'react';
import type { Layer } from '../../types';

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
}

export const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <div
      className={`p-3 border rounded cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={() => onSelect(layer.id)}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <div
            className='w-4 h-4 rounded border border-gray-300'
            style={{ backgroundColor: layer.color }}
          />
          <span className='font-medium text-sm'>{layer.name}</span>
        </div>

        <div className='flex space-x-1'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(layer.id);
            }}
            className='px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors'
            title='Move up'>
            ↑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(layer.id);
            }}
            className='px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors'
            title='Move down'>
            ↓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className='px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors'
            title='Delete layer'>
            ✕
          </button>
        </div>
      </div>

      <div className='mt-2 text-xs text-gray-500'>Z-Index: {layer.zIndex}</div>
    </div>
  );
};
