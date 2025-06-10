import React from 'react';
import { LayerItem } from './LayerItem';
import type { Layer } from '../../types';

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onMoveLayer,
}) => {
  return (
    <div className='w-64 bg-gray-50 border-r border-gray-300 p-4 overflow-y-auto'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-bold'>Layers</h2>
        <button
          onClick={onAddLayer}
          className='px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'>
          + Add
        </button>
      </div>

      <div className='space-y-2'>
        {layers
          .slice()
          .sort((a, b) => b.zIndex - a.zIndex)
          .map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              isSelected={selectedLayerId === layer.id}
              onSelect={onSelectLayer}
              onDelete={onDeleteLayer}
              onMoveUp={(layerId) => onMoveLayer(layerId, 'up')}
              onMoveDown={(layerId) => onMoveLayer(layerId, 'down')}
            />
          ))}
      </div>

      {layers.length === 0 && (
        <div className='text-center text-gray-500 text-sm mt-8'>
          No layers yet. Click "Add" to create your first layer.
        </div>
      )}
    </div>
  );
};
