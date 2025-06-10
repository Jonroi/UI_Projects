import React, { useState } from 'react';
import type { SelectedKeyframeInfo, Layer, EasingFunction } from '../../types';

interface KeyframeEditorProps {
  selectedKeyframeInfo: SelectedKeyframeInfo;
  layers: Layer[];
  onUpdateKeyframe: (
    layerId: string,
    propertyKey: string,
    keyframeId: string,
    newTime: number,
    newValue: number,
    newEasing: EasingFunction,
  ) => void;
  onClearSelection: () => void;
}

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  selectedKeyframeInfo,
  layers,
  onUpdateKeyframe,
  onClearSelection,
}) => {
  const { layerId, propertyKey, keyframeId } = selectedKeyframeInfo;

  const layer = layers.find((l) => l.id === layerId);
  const property = layer?.[propertyKey];
  const keyframe = property?.keyframes.find((kf) => kf.id === keyframeId);

  const [time, setTime] = useState(keyframe?.time || 0);
  const [value, setValue] = useState(keyframe?.value || 0);
  const [easing, setEasing] = useState<EasingFunction>(
    keyframe?.easing || 'linear',
  );

  if (!keyframe || !layer) {
    return null;
  }

  const handleSave = () => {
    onUpdateKeyframe(layerId, propertyKey, keyframeId, time, value, easing);
    onClearSelection();
  };

  const handleCancel = () => {
    setTime(keyframe.time);
    setValue(keyframe.value);
    setEasing(keyframe.easing);
    onClearSelection();
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setEasing([0.25, 0.1, 0.25, 1]);
    } else {
      setEasing(val as EasingFunction);
    }
  };

  const handleCubicBezierChange = (index: number, newVal: number) => {
    if (Array.isArray(easing)) {
      const newEasing: [number, number, number, number] = [...easing] as [
        number,
        number,
        number,
        number,
      ];
      newEasing[index] = newVal;
      setEasing(newEasing);
    }
  };

  const getEasingDisplayValue = () => {
    if (Array.isArray(easing)) return 'custom';
    return easing;
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
        <h3 className='text-lg font-bold mb-4'>
          Edit Keyframe - {layer.name} ({propertyKey})
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium mb-1'>Time (ms)</label>
            <input
              type='number'
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
              min='0'
              step='100'
            />
          </div>

          <div>
            <label className='block text-sm font-medium mb-1'>Value</label>
            <input
              type='number'
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
              step='0.1'
            />
          </div>

          <div>
            <label className='block text-sm font-medium mb-1'>Easing</label>
            <select
              value={getEasingDisplayValue()}
              onChange={handleEasingChange}
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'>
              <option value='linear'>Linear</option>
              <option value='ease-in'>Ease In</option>
              <option value='ease-out'>Ease Out</option>
              <option value='ease-in-out'>Ease In-Out</option>
              <option value='custom'>Custom Cubic Bezier</option>
            </select>
          </div>

          {Array.isArray(easing) && (
            <div>
              <label className='block text-sm font-medium mb-2'>
                Cubic Bezier Control Points
              </label>
              <div className='grid grid-cols-2 gap-2'>
                {(['x1', 'y1', 'x2', 'y2'] as const).map((label, index) => (
                  <div key={label}>
                    <label className='block text-xs text-gray-600 mb-1'>
                      {label}
                    </label>
                    <input
                      type='number'
                      value={easing[index]}
                      onChange={(e) =>
                        handleCubicBezierChange(index, Number(e.target.value))
                      }
                      className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                      step='0.01'
                      min='0'
                      max='1'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end space-x-2 mt-6'>
          <button
            onClick={handleCancel}
            className='px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500'>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
