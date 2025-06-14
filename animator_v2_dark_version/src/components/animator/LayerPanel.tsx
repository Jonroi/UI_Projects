import React, { useState } from 'react';
import type { Layer } from '../../types/animator';
import { formatPropertyName } from '../../utils/animator/animation';

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  selectedPropertyKey:
    | keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>
    | null;
  onLayerSelect: (layerId: string | null) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerMove: (layerId: string, direction: 'up' | 'down') => void;
  onLayerUpdate: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    value: number,
  ) => void;
  onLayerNameUpdate: (layerId: string, name: string) => void;
  onLayerColorUpdate: (layerId: string, color: string) => void;
  onPropertySelect: (
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'> | null,
  ) => void;
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

const LayerItem: React.FC<{
  layer: Layer;
  isSelected: boolean;
  onSelect: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
  onUpdateLayer: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    value: number,
  ) => void;
  onUpdateLayerName: (layerId: string, name: string) => void;
  onUpdateLayerColor: (layerId: string, color: string) => void;
}> = ({
  layer,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateLayer,
  onUpdateLayerName,
  onUpdateLayerColor,
}) => {
  const handleIncrement = (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    currentValue: number,
    step: number = 1,
  ) => {
    onUpdateLayer(layerId, propertyKey, currentValue + step);
  };

  const handleDecrement = (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    currentValue: number,
    step: number = 1,
  ) => {
    onUpdateLayer(layerId, propertyKey, currentValue - step);
  };

  return (
    <div
      className={`p-4 mb-2 rounded-lg border ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}>
      <div className='flex items-center justify-between mb-2'>
        <input
          type='text'
          value={layer.name}
          onChange={(e) => onUpdateLayerName(layer.id, e.target.value)}
          className='text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none'
        />
        <div className='flex space-x-2'>
          <button
            onClick={() => onMoveUp(layer.id)}
            className='p-1 text-gray-600 hover:text-blue-500'>
            ↑
          </button>
          <button
            onClick={() => onMoveDown(layer.id)}
            className='p-1 text-gray-600 hover:text-blue-500'>
            ↓
          </button>
          <button
            onClick={() => onDelete(layer.id)}
            className='p-1 text-gray-600 hover:text-red-500'>
            ×
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        {Object.entries(layer)
          .filter(([key]) => !['id', 'name', 'color', 'zIndex'].includes(key))
          .map(([key, value]) => (
            <div key={key} className='flex items-center space-x-2'>
              <span className='w-24 text-sm text-gray-600'>
                {formatPropertyName(key)}
              </span>
              <div className='flex items-center space-x-1'>
                <button
                  onClick={() =>
                    handleDecrement(layer.id, key as any, value.defaultValue)
                  }
                  className='p-1 text-gray-600 hover:text-blue-500'>
                  -
                </button>
                <input
                  type='number'
                  value={value.defaultValue}
                  onChange={(e) =>
                    onUpdateLayer(
                      layer.id,
                      key as any,
                      parseFloat(e.target.value),
                    )
                  }
                  className='w-16 px-2 py-1 text-sm border rounded'
                />
                <button
                  onClick={() =>
                    handleIncrement(layer.id, key as any, value.defaultValue)
                  }
                  className='p-1 text-gray-600 hover:text-blue-500'>
                  +
                </button>
              </div>
            </div>
          ))}

        <div className='flex items-center space-x-2'>
          <span className='w-24 text-sm text-gray-600'>Color</span>
          <input
            type='color'
            value={layer.color}
            onChange={(e) => onUpdateLayerColor(layer.id, e.target.value)}
            className='w-8 h-8 p-0 border-0 rounded cursor-pointer'
          />
        </div>
      </div>
    </div>
  );
};

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  selectedPropertyKey,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerMove,
  onLayerUpdate,
  onLayerNameUpdate,
  onLayerColorUpdate,
  onPropertySelect,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeRemove,
}) => {
  const [minimizedLayers, setMinimizedLayers] = useState<Set<string>>(new Set());

  const toggleMinimize = (layerId: string) => {
    setMinimizedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  return (
    <div className="relative h-full flex flex-col bg-black/70 backdrop-blur-xl border-r border-black/40 shadow-2xl">
      <div className="p-4 border-b border-black/30 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-wide">Layers</h2>
        <button
          onClick={onLayerAdd}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 shadow-lg border border-white/10 hover:bg-white/10 transition-colors duration-200 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Add Layer"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`rounded-2xl border shadow-xl transition-all duration-200 ${
              selectedLayerId === layer.id
                ? 'border-blue-500 bg-black/80 backdrop-blur-lg'
                : 'border-black/40 bg-black/60 backdrop-blur-md hover:bg-black/70'
            }`}
          >
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => toggleMinimize(layer.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-white font-semibold text-base truncate">
                  {layer.name}
                </span>
                <span className="text-gray-400 ml-2">
                  {minimizedLayers.has(layer.id) ? '▶' : '▼'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={e => { e.stopPropagation(); onLayerMove(layer.id, 'up'); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 border border-white/10 text-gray-300 hover:bg-blue-600/30 hover:text-white transition-all duration-150 shadow focus:outline-none"
                  title="Move Up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onLayerMove(layer.id, 'down'); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 border border-white/10 text-gray-300 hover:bg-blue-600/30 hover:text-white transition-all duration-150 shadow focus:outline-none"
                  title="Move Down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onLayerDelete(layer.id); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 border border-white/10 text-red-400 hover:bg-red-600/30 hover:text-white transition-all duration-150 shadow focus:outline-none"
                  title="Delete Layer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {!minimizedLayers.has(layer.id) && (
              <div className="px-4 pb-4 pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-gray-400">Layer Name</span>
                  <input
                    type="text"
                    value={layer.name}
                    onChange={e => onLayerNameUpdate(layer.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    placeholder="Layer name"
                  />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-gray-400">Layer Color</span>
                  <input
                    type="color"
                    value={layer.color}
                    onChange={e => onLayerColorUpdate(layer.id, e.target.value)}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-black/40 cursor-pointer shadow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">X</label>
                    <input
                      type="number"
                      value={layer.x.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'x', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Y</label>
                    <input
                      type="number"
                      value={layer.y.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'y', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Width</label>
                    <input
                      type="number"
                      value={layer.width.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'width', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Height</label>
                    <input
                      type="number"
                      value={layer.height.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'height', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Opacity</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layer.opacity.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'opacity', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Rotation</label>
                    <input
                      type="number"
                      value={layer.rotation.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'rotation', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Scale</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={layer.scale.defaultValue}
                      onChange={e => onLayerUpdate(layer.id, 'scale', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 shadow"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
