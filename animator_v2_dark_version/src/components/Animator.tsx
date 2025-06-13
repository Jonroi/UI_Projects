import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// SECTION: Types and Interfaces

/** Represents an easing function. Can be a predefined string or an array of four numbers for cubic Bezier control points [x1, y1, x2, y2]. */
export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | [number, number, number, number];

/** Represents a single keyframe for an animatable property. */
export interface Keyframe {
  id: string;
  time: number; // Time in milliseconds
  value: number; // Value of the property at this keyframe
  easing: EasingFunction; // Easing function to use from this keyframe to the next
}

/** Represents a property that can be animated (e.g., 'x', 'y', 'opacity'). */
export interface AnimatedProperty {
  keyframes: Keyframe[];
  defaultValue: number; // Default value if no keyframes or before the first keyframe
}

/** Represents an animation layer. */
export interface Layer {
  id: string;
  name: string;
  // Animatable properties
  x: AnimatedProperty;
  y: AnimatedProperty;
  width: AnimatedProperty;
  height: AnimatedProperty;
  opacity: AnimatedProperty;
  rotation: AnimatedProperty; // In degrees
  scale: AnimatedProperty; // Uniform scale factor
  // Non-animated properties
  color: string; // Hex color string, e.g., '#FF0000'
  zIndex: number; // Stacking order
}

/** Information about the currently selected keyframe for editing. */
export interface SelectedKeyframeInfo {
  layerId: string;
  propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>;
  keyframeId: string;
}

/** Main application state. */
export interface AppState {
  layers: Layer[];
  selectedLayerId: string | null;
  selectedPropertyKey:
    | keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>
    | null; // e.g., 'x', 'opacity'
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  currentTime: number; // Current time in milliseconds
  isPlaying: boolean;
  duration: number; // Total animation duration in milliseconds
  timelineZoom: number; // Pixels per 100ms
}

// SECTION: Utility Functions

/** Generates a simple unique ID. */
const generateId = (): string =>
  `id_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Solves for `t` in a cubic Bezier equation `x(t) = x_target`.
 * This is needed to find the Bezier curve parameter `u` for a given time progression `t_progress`.
 * Uses Newton-Raphson method.
 * Control points P0=(0,0), P3=(1,1) are implicit.
 * @param x1 X-coordinate of the first control point.
 * @param x2 X-coordinate of the second control point.
 * @param t_progress The target x-value (time progress, 0 to 1).
 * @returns The parameter `u` such that BezierX(u) = t_progress.
 */
const solveCubicBezierParameter = (
  x1: number,
  x2: number,
  t_progress: number,
): number => {
  if (t_progress === 0 || t_progress === 1) return t_progress;

  const P1_X = x1;
  const P2_X = x2;

  // Coefficients for the cubic Bezier equation for X: B_x(u) = C_x * u^3 + B_x * u^2 + A_x * u
  // where P0=(0,0), P3=(1,1)
  const Ax = 3 * P1_X - 3 * P2_X + 1;
  const Bx = 3 * P2_X - 6 * P1_X;
  const Cx = 3 * P1_X;

  let u = t_progress; // Initial guess

  // Newton-Raphson iterations (typically 4-8 are enough)
  for (let i = 0; i < 8; i++) {
    const current_x = ((Ax * u + Bx) * u + Cx) * u;
    const derivative_x = (3 * Ax * u + 2 * Bx) * u + Cx;
    if (derivative_x === 0) break; // Avoid division by zero
    const error = current_x - t_progress;
    u -= error / derivative_x;
    u = Math.max(0, Math.min(1, u)); // Clamp u to [0, 1]
  }
  return u;
};

/**
 * Calculates the Y-value of a cubic Bezier curve for a given parameter `u`.
 * Control points P0=(0,0), P3=(1,1) are implicit.
 * @param y1 Y-coordinate of the first control point.
 * @param y2 Y-coordinate of the second control point.
 * @param u The Bezier curve parameter (0 to 1), typically solved from `solveCubicBezierParameter`.
 * @returns The eased Y-value.
 */
const calculateCubicBezierY = (y1: number, y2: number, u: number): number => {
  const P1_Y = y1;
  const P2_Y = y2;

  // Coefficients for the cubic Bezier equation for Y: B_y(u) = C_y * u^3 + B_y * u^2 + A_y * u
  const Ay = 3 * P1_Y - 3 * P2_Y + 1;
  const By = 3 * P2_Y - 6 * P1_Y;
  const Cy = 3 * P1_Y;

  return ((Ay * u + By) * u + Cy) * u;
};

/** Applies an easing function to a time progress value `t_progress` (0 to 1). */
const applyEasing = (t_progress: number, easing: EasingFunction): number => {
  if (t_progress <= 0) return 0;
  if (t_progress >= 1) return 1;

  if (typeof easing === 'string') {
    switch (easing) {
      case 'linear':
        return t_progress;
      case 'ease-in':
        return t_progress * t_progress * t_progress; // Cubic
      case 'ease-out':
        return 1 - Math.pow(1 - t_progress, 3); // Cubic
      case 'ease-in-out':
        return t_progress < 0.5
          ? 4 * t_progress * t_progress * t_progress
          : 1 - Math.pow(-2 * t_progress + 2, 3) / 2; // Cubic
      default:
        return t_progress;
    }
  } else if (Array.isArray(easing) && easing.length === 4) {
    const [x1, y1, x2, y2] = easing;
    // Check for common linear case which doesn't need solving
    if (x1 === y1 && x2 === y2) return t_progress;
    const u = solveCubicBezierParameter(x1, x2, t_progress);
    return calculateCubicBezierY(y1, y2, u);
  }
  return t_progress; // Fallback
};

/**
 * Calculates the animated value of a property at a specific time.
 * @param property The AnimatedProperty object.
 * @param time The current time in milliseconds.
 * @returns The interpolated value.
 */
const getAnimatedValueAtTime = (
  property: AnimatedProperty,
  time: number,
): number => {
  const { keyframes, defaultValue } = property;

  if (keyframes.length === 0) {
    return defaultValue;
  }

  // Sort keyframes by time to ensure correct order
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  if (time <= sortedKeyframes[0].time) {
    return sortedKeyframes[0].value;
  }

  if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    return sortedKeyframes[sortedKeyframes.length - 1].value;
  }

  let prevKeyframe: Keyframe | null = null;
  let nextKeyframe: Keyframe | null = null;

  for (const kf of sortedKeyframes) {
    if (kf.time <= time) {
      prevKeyframe = kf;
    } else {
      nextKeyframe = kf;
      break;
    }
  }

  if (prevKeyframe && nextKeyframe) {
    if (prevKeyframe.time === nextKeyframe.time) return prevKeyframe.value;

    const timeProgress =
      (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const easedProgress = applyEasing(timeProgress, prevKeyframe.easing);
    return (
      prevKeyframe.value +
      (nextKeyframe.value - prevKeyframe.value) * easedProgress
    );
  }

  return defaultValue;
};

// SECTION: Initial State and Constants

const DEFAULT_DURATION = 5000; // 5 seconds
const DEFAULT_TIMELINE_ZOOM = 50; // 50px per 100ms, so 1ms = 0.5px. 5000ms * 0.5px/ms = 2500px total timeline width.

const createDefaultAnimatedProperty = (
  defaultValue: number,
  initialValue?: number,
): AnimatedProperty => ({
  keyframes:
    initialValue !== undefined
      ? [{ id: generateId(), time: 0, value: initialValue, easing: 'linear' }]
      : [],
  defaultValue,
});

const createNewLayer = (
  name: string,
  zIndex: number,
  color: string = '#3B82F6',
): Layer => ({
  id: generateId(),
  name,
  color,
  zIndex,
  x: createDefaultAnimatedProperty(50, 50),
  y: createDefaultAnimatedProperty(50, 50),
  width: createDefaultAnimatedProperty(100, 100),
  height: createDefaultAnimatedProperty(50, 50),
  opacity: createDefaultAnimatedProperty(1, 1),
  rotation: createDefaultAnimatedProperty(0, 0),
  scale: createDefaultAnimatedProperty(1, 1),
});

const initialLayers: Layer[] = [
  createNewLayer('Blue Rectangle', 0, '#3B82F6'),
  createNewLayer('Red Square', 1, '#EF4444'),
];

// Add a simple animation to the first layer's x property for demonstration
if (initialLayers.length > 0) {
  initialLayers[0].x.keyframes.push({
    id: generateId(),
    time: 2500,
    value: 250,
    easing: 'ease-in-out',
  });
  initialLayers[0].x.keyframes.push({
    id: generateId(),
    time: 5000,
    value: 50,
    easing: 'ease-in-out',
  });
  initialLayers[0].opacity.keyframes.push({
    id: generateId(),
    time: 1000,
    value: 0.2,
    easing: 'linear',
  });
  initialLayers[0].opacity.keyframes.push({
    id: generateId(),
    time: 4000,
    value: 1,
    easing: 'linear',
  });
  initialLayers[0].rotation.keyframes.push({
    id: generateId(),
    time: 5000,
    value: 360,
    easing: 'linear',
  });

  initialLayers[1].y.keyframes.push({
    id: generateId(),
    time: 1500,
    value: 200,
    easing: 'ease-out',
  });
  initialLayers[1].y.keyframes.push({
    id: generateId(),
    time: 3500,
    value: 50,
    easing: 'ease-in',
  });
  initialLayers[1].scale.keyframes = [
    { id: generateId(), time: 0, value: 0.5, easing: 'linear' },
    { id: generateId(), time: 2500, value: 1.5, easing: 'ease-in-out' },
    { id: generateId(), time: 5000, value: 0.5, easing: 'linear' },
  ];
}

const initialAppState: AppState = {
  layers: initialLayers,
  selectedLayerId: initialLayers.length > 0 ? initialLayers[0].id : null,
  selectedPropertyKey: null,
  selectedKeyframeInfo: null,
  currentTime: 0,
  isPlaying: false,
  duration: DEFAULT_DURATION,
  timelineZoom: DEFAULT_TIMELINE_ZOOM,
};

const ANIMATABLE_PROPERTY_KEYS: (keyof Omit<
  Layer,
  'id' | 'name' | 'color' | 'zIndex'
>)[] = ['x', 'y', 'width', 'height', 'opacity', 'rotation', 'scale'];

const EASING_OPTIONS: { label: string; value: EasingFunction }[] = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In Out', value: 'ease-in-out' },
  {
    label: 'Custom Bezier (e.g., 0.25,0.1,0.25,1)',
    value: [0.25, 0.1, 0.25, 1.0],
  }, // Example custom Bezier
];

// SECTION: React Components

/** UI for editing a selected keyframe's properties. */
const KeyframeEditor: React.FC<{
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
}> = ({ selectedKeyframeInfo, layers, onUpdateKeyframe, onClearSelection }) => {
  const { layerId, propertyKey, keyframeId } = selectedKeyframeInfo;

  const layer = layers.find((l) => l.id === layerId);
  const property = layer ? (layer[propertyKey] as AnimatedProperty) : null;
  const keyframe = property?.keyframes.find((kf) => kf.id === keyframeId);

  const [timeInput, setTimeInput] = useState(keyframe?.time.toString() || '0');
  const [valueInput, setValueInput] = useState(
    keyframe?.value.toString() || '0',
  );
  const [easingInput, setEasingInput] = useState<string>( // Store string representation of easing
    keyframe
      ? Array.isArray(keyframe.easing)
        ? keyframe.easing.join(',')
        : keyframe.easing
      : 'linear',
  );

  useEffect(() => {
    if (keyframe) {
      setTimeInput(keyframe.time.toString());
      setValueInput(keyframe.value.toString());
      setEasingInput(
        Array.isArray(keyframe.easing)
          ? keyframe.easing.join(',')
          : keyframe.easing,
      );
    }
  }, [keyframe]);

  if (!keyframe || !layer || !property) {
    return (
      <div className='bg-white/5 border border-white/10 rounded-xl p-6 text-center'>
        <div className='w-12 h-12 bg-orange-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center'>
          <svg
            className='w-6 h-6 text-orange-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>
        <p className='text-gray-400 text-sm'>No keyframe selected</p>
        <p className='text-gray-500 text-xs mt-1'>
          Select a keyframe to edit its properties
        </p>
      </div>
    );
  }

  const handleSave = () => {
    const newTime = parseInt(timeInput, 10);
    const newValue = parseFloat(valueInput);
    let newEasing: EasingFunction;

    const selectedEasingOption = EASING_OPTIONS.find(
      (opt) =>
        (Array.isArray(opt.value) ? opt.value.join(',') : opt.value) ===
        easingInput,
    );
    if (selectedEasingOption) {
      newEasing = selectedEasingOption.value;
    } else {
      // Custom Bezier string input
      const parts = easingInput.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        newEasing = parts as [number, number, number, number];
      } else {
        newEasing = 'linear'; // Fallback
      }
    }

    if (!isNaN(newTime) && !isNaN(newValue)) {
      onUpdateKeyframe(
        layerId,
        propertyKey,
        keyframeId,
        newTime,
        newValue,
        newEasing,
      );
    }
  };

  return (
    <div className='bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h4 className='text-lg font-semibold text-white'>Keyframe Editor</h4>
          <p className='text-sm text-gray-400'>
            {layer.name} • {propertyKey}
          </p>
        </div>
        <button
          onClick={onClearSelection}
          className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200'>
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        </button>
      </div>

      <div className='space-y-4'>
        <div>
          <label
            htmlFor='kf-time'
            className='block text-sm font-medium text-gray-300 mb-2'>
            Time (ms)
          </label>
          <input
            type='number'
            id='kf-time'
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
          />
        </div>

        <div>
          <label
            htmlFor='kf-value'
            className='block text-sm font-medium text-gray-300 mb-2'>
            Value
          </label>
          <input
            type='number'
            step='any'
            id='kf-value'
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
          />
        </div>

        <div>
          <label
            htmlFor='kf-easing'
            className='block text-sm font-medium text-gray-300 mb-2'>
            Easing Function
          </label>
          <select
            id='kf-easing'
            value={easingInput}
            onChange={(e) => setEasingInput(e.target.value)}
            className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'>
            {EASING_OPTIONS.map((opt) => (
              <option
                key={opt.label}
                value={
                  Array.isArray(opt.value) ? opt.value.join(',') : opt.value
                }
                className='bg-gray-800 text-white'>
                {opt.label}
              </option>
            ))}
          </select>

          {EASING_OPTIONS.find(
            (opt) =>
              (Array.isArray(opt.value) ? opt.value.join(',') : opt.value) ===
                easingInput && Array.isArray(opt.value),
          ) && (
            <input
              type='text'
              placeholder='e.g., 0.25,0.1,0.25,1'
              value={easingInput}
              onChange={(e) => setEasingInput(e.target.value)}
              className='mt-2 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
            />
          )}
        </div>
      </div>

      <div className='mt-6 flex justify-end'>
        <button
          onClick={handleSave}
          className='px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105'>
          Save Changes
        </button>
      </div>
    </div>
  );
};

/** Displays a single layer in the LayerPanel. */
const LayerItem: React.FC<{
  layer: Layer;
  isSelected: boolean;
  onSelect: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
}> = ({ layer, isSelected, onSelect, onDelete, onMoveUp, onMoveDown }) => {
  return (
    <div
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/50 shadow-lg'
          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
      }`}
      onClick={() => onSelect(layer.id)}>
      <div className='flex justify-between items-center'>
        <div className='flex items-center space-x-3'>
          <div
            className='w-4 h-4 rounded-lg shadow-sm'
            style={{ backgroundColor: layer.color }}
          />
          <div>
            <span
              className={`text-sm font-medium ${
                isSelected ? 'text-white' : 'text-gray-200'
              }`}>
              {layer.name}
            </span>
            <div className='text-xs text-gray-400'>Z: {layer.zIndex}</div>
          </div>
        </div>
        <div className='flex items-center space-x-1'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(layer.id);
            }}
            className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200'>
            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z'
                clipRule='evenodd'
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(layer.id);
            }}
            className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200'>
            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className='p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200'>
            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/** Panel for managing layers (add, remove, select, reorder). */
const LayerPanel: React.FC<{
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
}> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onMoveLayer,
}) => {
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => b.zIndex - a.zIndex),
    [layers],
  );

  return (
    <div className='flex flex-col'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='text-lg font-semibold text-white'>Layers</h3>
        <button
          onClick={onAddLayer}
          className='px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium'>
          + Add Layer
        </button>
      </div>
      <div className='space-y-2 max-h-64 overflow-y-auto'>
        {sortedLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={layer.id === selectedLayerId}
            onSelect={onSelectLayer}
            onDelete={onDeleteLayer}
            onMoveUp={(id) => onMoveLayer(id, 'up')}
            onMoveDown={(id) => onMoveLayer(id, 'down')}
          />
        ))}
        {sortedLayers.length === 0 && (
          <div className='bg-white/5 border border-white/10 rounded-xl p-6 text-center'>
            <div className='w-12 h-12 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl mx-auto mb-3 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-blue-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
            </div>
            <p className='text-gray-400 text-sm'>No layers yet</p>
            <p className='text-gray-500 text-xs mt-1'>
              Add a layer to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/** Represents a single keyframe marker on the timeline track. */
const KeyframeMarker: React.FC<{
  keyframe: Keyframe;
  position: number; // x-position on the track
  isSelected: boolean;
  onClick: () => void;
  onDrag: (newTime: number) => void;
  timelineInfo: { duration: number; zoom: number };
}> = ({ keyframe, position, isSelected, onClick, onDrag, timelineInfo }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: number }>({
    x: 0,
    time: 0,
  });
  const markerRef = useRef<HTMLButtonElement>(null);

  const msToPx = (ms: number) => (ms / 100) * timelineInfo.zoom;
  const pxToMs = (px: number) => (px / timelineInfo.zoom) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, time: keyframe.time });

    // Add global mouse event listeners
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDragging || moveEvent.buttons === 1) {
        const deltaX = moveEvent.clientX - dragStart.x;
        const deltaTime = pxToMs(deltaX);
        const newTime = Math.max(
          0,
          Math.min(timelineInfo.duration, dragStart.time + deltaTime),
        );

        // Update visual position during drag
        if (markerRef.current) {
          markerRef.current.style.left = `${msToPx(newTime)}px`;
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (isDragging || upEvent.buttons === 0) {
        const deltaX = upEvent.clientX - dragStart.x;
        const deltaTime = pxToMs(deltaX);
        const newTime = Math.max(
          0,
          Math.min(timelineInfo.duration, dragStart.time + deltaTime),
        );

        setIsDragging(false);
        onDrag(newTime);

        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = () => {
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <button
      ref={markerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={`Time: ${keyframe.time}ms, Value: ${keyframe.value} (drag to move)`}
      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
        isSelected
          ? 'bg-yellow-400 border-yellow-500 shadow-yellow-400/50'
          : 'bg-blue-400 border-blue-500 shadow-blue-400/50'
      } ${
        isDragging
          ? 'scale-125 cursor-grabbing shadow-lg'
          : 'cursor-grab hover:scale-110 hover:shadow-lg'
      } transform -translate-x-1/2 transition-all duration-200 select-none shadow-lg`}
      style={{
        left: `${position}px`,
        zIndex: isDragging ? 10 : 1,
      }}
    />
  );
};

/** A single track in the timeline for an animatable property. */
const PropertyTrack: React.FC<{
  layerId: string;
  propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>;
  property: AnimatedProperty;
  timelineInfo: { duration: number; zoom: number; trackWidth: number };
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  onKeyframeClick: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    keyframeId: string,
  ) => void;
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
}> = React.memo(
  ({
    layerId,
    propertyKey,
    property,
    timelineInfo,
    selectedKeyframeInfo,
    onKeyframeClick,
    onAddKeyframe,
    onDragKeyframe,
  }) => {
    const { duration, zoom, trackWidth } = timelineInfo;
    const msToPx = (ms: number) => (ms / 100) * zoom;

    const handleTrackDoubleClick = (
      event: React.MouseEvent<HTMLDivElement>,
    ) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left - 32; // Account for 32px offset alignment
      const timeAtClick = Math.round((clickX / zoom) * 100);
      if (timeAtClick >= 0 && timeAtClick <= duration) {
        onAddKeyframe(layerId, propertyKey, timeAtClick);
      }
    };

    return (
      <div className='flex items-center h-12 border-b border-white/10 hover:bg-white/5 transition-all duration-200'>
        <div className='w-32 px-4 py-2 text-sm font-medium bg-white/5 border-r border-white/10 truncate self-stretch flex items-center text-gray-300'>
          {propertyKey}
        </div>
        <div
          className='relative flex-1 h-full bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200'
          style={{ width: `${trackWidth}px` }}
          onDoubleClick={handleTrackDoubleClick}
          title='Double-click to add keyframe'>
          {property.keyframes.map((kf) => (
            <KeyframeMarker
              key={kf.id}
              keyframe={kf}
              position={msToPx(kf.time) + 32}
              isSelected={
                selectedKeyframeInfo?.keyframeId === kf.id &&
                selectedKeyframeInfo.propertyKey === propertyKey
              }
              onClick={() => onKeyframeClick(layerId, propertyKey, kf.id)}
              onDrag={(newTime) =>
                onDragKeyframe(layerId, propertyKey, kf.id, newTime)
              }
              timelineInfo={{ duration, zoom }}
            />
          ))}
        </div>
      </div>
    );
  },
);

/** Timeline Panel: Displays animation timeline, keyframes, and playback controls. */
const TimelinePanel: React.FC<{
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
}> = ({
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
    currentTime,
    isPlaying,
    duration,
    timelineZoom,
    selectedKeyframeInfo,
  } = appState;
  const timelineRef = useRef<HTMLDivElement>(null);
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const trackWidth = useMemo(
    () => (duration / 100) * timelineZoom,
    [duration, timelineZoom],
  );
  const timeIndicatorPosition = useMemo(
    () => (currentTime / 100) * timelineZoom,
    [currentTime, timelineZoom],
  );

  const handleTimelineScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let newTime = Math.round((x / timelineZoom) * 100);
      newTime = Math.max(0, Math.min(duration, newTime));
      onSetCurrentTime(newTime);
    }
  };

  const timeMarkers = useMemo(() => {
    const markers: { time: number; position: number }[] = [];
    const interval = timelineZoom > 30 ? 100 : timelineZoom > 10 ? 500 : 1000; // ms per marker
    for (let t = 0; t <= duration; t += interval) {
      markers.push({ time: t, position: (t / 100) * timelineZoom });
    }
    return markers;
  }, [duration, timelineZoom]);

  return (
    <div className='flex flex-col h-full'>
      {/* Controls */}
      <div className='p-4 flex items-center space-x-4 border-b border-white/10 bg-white/5 flex-shrink-0'>
        <button
          onClick={onTogglePlay}
          className='px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2'>
          {isPlaying ? (
            <>
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                  clipRule='evenodd'
                />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        <div className='flex items-center space-x-2'>
          <label
            htmlFor='duration'
            className='text-sm font-medium text-gray-300'>
            Duration:
          </label>
          <input
            type='number'
            id='duration'
            value={duration}
            onChange={(e) =>
              onChangeDuration(
                Math.max(100, parseInt(e.target.value) || duration),
              )
            }
            className='w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
          />
          <span className='text-xs text-gray-400'>ms</span>
        </div>

        <div className='flex items-center space-x-2'>
          <label htmlFor='zoom' className='text-sm font-medium text-gray-300'>
            Zoom:
          </label>
          <input
            type='range'
            id='zoom'
            min='5'
            max='200'
            value={timelineZoom}
            onChange={(e) => onChangeZoom(parseInt(e.target.value))}
            className='w-32 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider'
          />
          <span className='text-xs text-gray-400 min-w-max'>
            {timelineZoom}px/100ms
          </span>
        </div>

        {/* Time Indicator */}
        <div className='px-4 py-2 bg-white/5 rounded-xl border border-white/10'>
          <div className='text-sm font-medium text-white'>
            {Math.round(currentTime)}ms / {duration}ms
          </div>
        </div>
      </div>

      {/* Timeline Content - Horizontally Scrollable */}
      <div className='flex-1 overflow-x-auto scrollbar-thin'>
        <div style={{ width: `${Math.max(trackWidth + 64, 800)}px` }}>
          {/* Timeline Header (Ruler) */}
          <div
            ref={timelineRef}
            className='relative h-16 bg-white/5 border-b border-white/10 cursor-pointer px-8 flex items-center'
            onClick={handleTimelineScrub}>
            {/* Current Time Position Marker */}
            <div
              className='absolute top-0 h-full w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 z-20 shadow-lg'
              style={{
                left: `${(currentTime / 100) * timelineZoom + 32}px`,
              }}>
              {/* Playhead handle */}
              <div className='absolute -top-1 -left-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg'></div>
              {/* Current time label */}
              <div className='absolute -top-8 -left-6 px-2 py-1 bg-blue-500 text-white text-xs rounded shadow-lg whitespace-nowrap'>
                {(currentTime / 1000).toFixed(1)}s
              </div>
            </div>

            {/* Seconds Markers */}
            {timeMarkers.map((marker) => (
              <div
                key={marker.time}
                className='absolute h-full top-0'
                style={{ left: `${marker.position + 32}px` }}>
                <div className='w-px h-3 bg-white/30'></div>
                <span className='absolute text-xs text-gray-300 top-3 transform -translate-x-1/2 font-medium'>
                  {marker.time / 1000}s
                </span>
              </div>
            ))}
          </div>

          {/* Property Tracks for selected layer */}
          <div className='relative'>
            {selectedLayer ? (
              ANIMATABLE_PROPERTY_KEYS.map((propKey) => {
                const property = selectedLayer[propKey] as
                  | AnimatedProperty
                  | undefined;
                if (!property) return null;
                return (
                  <PropertyTrack
                    key={`${selectedLayer.id}-${propKey}`}
                    layerId={selectedLayer.id}
                    propertyKey={propKey}
                    property={property}
                    timelineInfo={{ duration, zoom: timelineZoom, trackWidth }}
                    selectedKeyframeInfo={selectedKeyframeInfo}
                    onKeyframeClick={(layerId, propertyKey, keyframeId) =>
                      onSelectKeyframe({
                        layerId,
                        propertyKey,
                        keyframeId,
                      })
                    }
                    onAddKeyframe={onAddKeyframe}
                    onDragKeyframe={onDragKeyframe}
                  />
                );
              })
            ) : (
              <div className='p-8 text-center text-gray-400'>
                Select a layer to edit keyframes
              </div>
            )}
            {/* Current Time Indicator Line for Property Tracks */}
            <div
              className='absolute top-0 left-32 h-full w-1 bg-gradient-to-b from-red-400 to-red-600 z-20 shadow-lg pointer-events-none'
              style={{
                transform: `translateX(${timeIndicatorPosition}px)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Canvas for real-time animation preview. */
const PreviewCanvas: React.FC<{
  layers: Layer[];
  currentTime: number;
  canvasSize: { width: number; height: number };
}> = ({ layers, currentTime, canvasSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with solid background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort layers by zIndex for correct stacking
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    sortedLayers.forEach((layer) => {
      const x = getAnimatedValueAtTime(layer.x, currentTime);
      const y = getAnimatedValueAtTime(layer.y, currentTime);
      const width = getAnimatedValueAtTime(layer.width, currentTime);
      const height = getAnimatedValueAtTime(layer.height, currentTime);
      const opacity = getAnimatedValueAtTime(layer.opacity, currentTime);
      const rotation = getAnimatedValueAtTime(layer.rotation, currentTime); // degrees
      const scale = getAnimatedValueAtTime(layer.scale, currentTime);

      ctx.save();

      // Apply transformations
      // Translate to the element's anchor point (center for rotation/scale)
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      // Set appearance
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity)); // Clamp opacity
      ctx.fillStyle = layer.color;

      // Draw the element (origin is now its center)
      ctx.fillRect(-width / 2, -height / 2, width, height);

      ctx.restore();
    });
  }, [layers, currentTime, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className='border border-white/20 rounded-lg shadow-lg'
      style={{ display: 'block', backgroundColor: '#ffffff' }}
    />
  );
};

/** Export modal for displaying and managing export content. */
const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  fileExtension: string;
  mimeType: string;
}> = ({ isOpen, onClose, title, content, fileExtension, mimeType }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `animation.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
      <div className='bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-full max-w-4xl max-h-[90vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-600'>
          <h2 className='text-xl font-semibold text-white'>{title}</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white text-2xl font-bold'>
            ×
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 p-4 overflow-hidden flex flex-col'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-gray-300'>
              Preview and export your animation
            </span>
            <div className='flex space-x-2'>
              <button
                onClick={copyToClipboard}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button
                onClick={downloadFile}
                className='px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm'>
                💾 Download
              </button>
            </div>
          </div>

          {/* Code Preview */}
          <div className='flex-1 border border-gray-600 rounded overflow-hidden'>
            <pre className='h-full overflow-auto p-4 bg-gray-900 text-gray-100 text-sm leading-relaxed'>
              <code>{content}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-gray-600 flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded'>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/** Export controls with functional CSS and SVG export. */
const ExportControls: React.FC<{
  layers: Layer[];
  duration: number;
}> = ({ layers, duration }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    fileExtension: string;
    mimeType: string;
  }>({
    isOpen: false,
    title: '',
    content: '',
    fileExtension: '',
    mimeType: '',
  });
  const generateCSSKeyframes = (
    property: AnimatedProperty,
    propertyName: string,
    layerId: string,
  ): string => {
    if (property.keyframes.length === 0) return '';

    const sortedKeyframes = [...property.keyframes].sort(
      (a, b) => a.time - b.time,
    );
    let keyframeRules = '';

    sortedKeyframes.forEach((kf) => {
      const percentage = (kf.time / duration) * 100;
      const unit =
        propertyName === 'opacity' || propertyName === 'scale'
          ? ''
          : propertyName === 'rotation'
          ? 'deg'
          : 'px';

      keyframeRules += `  ${percentage.toFixed(1)}% {\n`;
      keyframeRules += `    ${
        propertyName === 'rotation'
          ? 'transform: rotate(' + kf.value + 'deg)'
          : propertyName === 'scale'
          ? 'transform: scale(' + kf.value + ')'
          : propertyName + ': ' + kf.value + unit
      };\n`;
      keyframeRules += `  }\n`;
    });

    return `@keyframes ${layerId}-${propertyName} {\n${keyframeRules}}\n\n`;
  };

  const handleExportCSS = () => {
    let cssContent = '/* Generated CSS Animation */\n\n';
    cssContent +=
      '.animation-container {\n  position: relative;\n  width: 800px;\n  height: 600px;\n}\n\n';

    layers.forEach((layer) => {
      const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      const zIndex = sortedLayers.findIndex((l) => l.id === layer.id);

      // Generate CSS class for the layer
      cssContent += `.layer-${layer.id} {\n`;
      cssContent += `  position: absolute;\n`;
      cssContent += `  background-color: ${layer.color};\n`;
      cssContent += `  z-index: ${zIndex};\n`;

      // Set initial values
      cssContent += `  left: ${
        layer.x.keyframes[0]?.value || layer.x.defaultValue
      }px;\n`;
      cssContent += `  top: ${
        layer.y.keyframes[0]?.value || layer.y.defaultValue
      }px;\n`;
      cssContent += `  width: ${
        layer.width.keyframes[0]?.value || layer.width.defaultValue
      }px;\n`;
      cssContent += `  height: ${
        layer.height.keyframes[0]?.value || layer.height.defaultValue
      }px;\n`;
      cssContent += `  opacity: ${
        layer.opacity.keyframes[0]?.value || layer.opacity.defaultValue
      };\n`;

      // Add animations
      const animations: string[] = [];
      if (layer.x.keyframes.length > 0)
        animations.push(`${layer.id}-x ${duration}ms infinite`);
      if (layer.y.keyframes.length > 0)
        animations.push(`${layer.id}-y ${duration}ms infinite`);
      if (layer.width.keyframes.length > 0)
        animations.push(`${layer.id}-width ${duration}ms infinite`);
      if (layer.height.keyframes.length > 0)
        animations.push(`${layer.id}-height ${duration}ms infinite`);
      if (layer.opacity.keyframes.length > 0)
        animations.push(`${layer.id}-opacity ${duration}ms infinite`);
      if (layer.rotation.keyframes.length > 0)
        animations.push(`${layer.id}-rotation ${duration}ms infinite`);
      if (layer.scale.keyframes.length > 0)
        animations.push(`${layer.id}-scale ${duration}ms infinite`);

      if (animations.length > 0) {
        cssContent += `  animation: ${animations.join(', ')};\n`;
      }

      cssContent += '}\n\n';

      // Generate keyframe animations
      if (layer.x.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.x, 'left', layer.id);
      }
      if (layer.y.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.y, 'top', layer.id);
      }
      if (layer.width.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.width, 'width', layer.id);
      }
      if (layer.height.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.height, 'height', layer.id);
      }
      if (layer.opacity.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.opacity, 'opacity', layer.id);
      }
      if (layer.rotation.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(
          layer.rotation,
          'rotation',
          layer.id,
        );
      }
      if (layer.scale.keyframes.length > 0) {
        cssContent += generateCSSKeyframes(layer.scale, 'scale', layer.id);
      }
    });

    // Add HTML example
    cssContent += '\n/* HTML Structure:\n';
    cssContent += '<div class="animation-container">\n';
    layers.forEach((layer) => {
      cssContent += `  <div class="layer-${layer.id}">${layer.name}</div>\n`;
    });
    cssContent += '</div>\n*/';

    setModalState({
      isOpen: true,
      title: 'Export CSS Animation',
      content: cssContent,
      fileExtension: 'css',
      mimeType: 'text/css',
    });
  };

  const handleExportSVG = () => {
    let svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">\n`;
    svgContent += `  <defs>\n`;

    // Generate SVG animations for each layer
    layers.forEach((layer) => {
      // X animation
      if (layer.x.keyframes.length > 0) {
        const sortedKeyframes = [...layer.x.keyframes].sort(
          (a, b) => a.time - b.time,
        );
        svgContent += `    <animateTransform id="${layer.id}-x" attributeName="transform" type="translate"\n`;
        svgContent += `      values="${sortedKeyframes
          .map((kf) => `${kf.value} 0`)
          .join('; ')}"\n`;
        svgContent += `      dur="${duration}ms" repeatCount="indefinite"/>\n`;
      }

      // Y animation
      if (layer.y.keyframes.length > 0) {
        const sortedKeyframes = [...layer.y.keyframes].sort(
          (a, b) => a.time - b.time,
        );
        svgContent += `    <animateTransform id="${layer.id}-y" attributeName="transform" type="translate"\n`;
        svgContent += `      values="${sortedKeyframes
          .map((kf) => `0 ${kf.value}`)
          .join('; ')}"\n`;
        svgContent += `      dur="${duration}ms" repeatCount="indefinite"/>\n`;
      }

      // Opacity animation
      if (layer.opacity.keyframes.length > 0) {
        const sortedKeyframes = [...layer.opacity.keyframes].sort(
          (a, b) => a.time - b.time,
        );
        svgContent += `    <animate id="${layer.id}-opacity" attributeName="opacity"\n`;
        svgContent += `      values="${sortedKeyframes
          .map((kf) => kf.value)
          .join('; ')}"\n`;
        svgContent += `      dur="${duration}ms" repeatCount="indefinite"/>\n`;
      }

      // Rotation animation
      if (layer.rotation.keyframes.length > 0) {
        const sortedKeyframes = [...layer.rotation.keyframes].sort(
          (a, b) => a.time - b.time,
        );
        svgContent += `    <animateTransform id="${layer.id}-rotation" attributeName="transform" type="rotate"\n`;
        svgContent += `      values="${sortedKeyframes
          .map(
            (kf) =>
              `${kf.value} ${
                (layer.x.keyframes[0]?.value || layer.x.defaultValue) +
                (layer.width.keyframes[0]?.value || layer.width.defaultValue) /
                  2
              } ${
                (layer.y.keyframes[0]?.value || layer.y.defaultValue) +
                (layer.height.keyframes[0]?.value ||
                  layer.height.defaultValue) /
                  2
              }`,
          )
          .join('; ')}"\n`;
        svgContent += `      dur="${duration}ms" repeatCount="indefinite"/>\n`;
      }
    });

    svgContent += `  </defs>\n\n`;

    // Generate SVG elements for each layer
    layers
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((layer) => {
        const x = layer.x.keyframes[0]?.value || layer.x.defaultValue;
        const y = layer.y.keyframes[0]?.value || layer.y.defaultValue;
        const width =
          layer.width.keyframes[0]?.value || layer.width.defaultValue;
        const height =
          layer.height.keyframes[0]?.value || layer.height.defaultValue;
        const opacity =
          layer.opacity.keyframes[0]?.value || layer.opacity.defaultValue;

        svgContent += `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${layer.color}" opacity="${opacity}">\n`;

        // Add animations
        if (layer.x.keyframes.length > 0) {
          svgContent += `    <use href="#${layer.id}-x"/>\n`;
        }
        if (layer.y.keyframes.length > 0) {
          svgContent += `    <use href="#${layer.id}-y"/>\n`;
        }
        if (layer.opacity.keyframes.length > 0) {
          svgContent += `    <use href="#${layer.id}-opacity"/>\n`;
        }
        if (layer.rotation.keyframes.length > 0) {
          svgContent += `    <use href="#${layer.id}-rotation"/>\n`;
        }

        svgContent += `  </rect>\n`;
      });

    svgContent += `</svg>`;

    setModalState({
      isOpen: true,
      title: 'Export SVG Animation',
      content: svgContent,
      fileExtension: 'svg',
      mimeType: 'image/svg+xml',
    });
  };

  return (
    <>
      <div className='bg-white/5 border border-white/10 rounded-xl p-4'>
        <h4 className='text-lg font-semibold text-white mb-4'>Export</h4>
        <div className='space-y-3'>
          <button
            onClick={handleExportCSS}
            className='w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2'
            title='Export as CSS animations with keyframes'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z'
                clipRule='evenodd'
              />
            </svg>
            <span>Export CSS</span>
          </button>
          <button
            onClick={handleExportSVG}
            className='w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2'
            title='Export as animated SVG'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z'
                clipRule='evenodd'
              />
            </svg>
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      <ExportModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        content={modalState.content}
        fileExtension={modalState.fileExtension}
        mimeType={modalState.mimeType}
      />
    </>
  );
};

// SECTION: Main App Component
const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const animationFrameId = useRef<number | null>(null);

  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  }>({ width: 500, height: 400 });

  // Update canvas size based on container
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setCanvasSize({
          width: Math.max(200, width - 120), // Much larger canvas with minimal padding
          height: Math.max(200, height - 120),
        });
      }
    });

    if (previewAreaRef.current) {
      resizeObserver.observe(previewAreaRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Animation loop - real-time speed
  useEffect(() => {
    if (appState.isPlaying) {
      let lastUpdateTime = performance.now();
      const animate = (timestamp: number) => {
        // Calculate actual time difference since last update
        const deltaTime = timestamp - lastUpdateTime;
        lastUpdateTime = timestamp;

        setAppState((prev) => {
          let newTime = prev.currentTime + deltaTime;
          if (newTime >= prev.duration) {
            newTime = 0; // Loop animation
          }
          return { ...prev, currentTime: newTime };
        });

        animationFrameId.current = requestAnimationFrame(animate);
      };
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [appState.isPlaying, appState.duration]);

  const handleSetCurrentTime = useCallback((time: number) => {
    setAppState((prev) => ({
      ...prev,
      currentTime: Math.max(0, Math.min(prev.duration, time)),
    }));
  }, []);

  const handleTogglePlay = useCallback(() => {
    setAppState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleSelectLayer = useCallback((layerId: string) => {
    setAppState((prev) => ({
      ...prev,
      selectedLayerId: layerId,
      selectedKeyframeInfo: null,
      selectedPropertyKey: null,
    }));
  }, []);

  const handleAddLayer = useCallback(() => {
    setAppState((prev) => {
      const newZIndex =
        prev.layers.reduce((maxZ, l) => Math.max(maxZ, l.zIndex), -1) + 1;
      const newLayer = createNewLayer(
        `Layer ${prev.layers.length + 1}`,
        newZIndex,
      );
      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        selectedLayerId: newLayer.id, // Auto-select new layer
      };
    });
  }, []);

  const handleDeleteLayer = useCallback((layerIdToDelete: string) => {
    setAppState((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerIdToDelete),
      selectedLayerId:
        prev.selectedLayerId === layerIdToDelete ? null : prev.selectedLayerId,
      selectedKeyframeInfo:
        prev.selectedKeyframeInfo?.layerId === layerIdToDelete
          ? null
          : prev.selectedKeyframeInfo,
    }));
  }, []);

  const handleMoveLayer = useCallback(
    (layerId: string, direction: 'up' | 'down') => {
      setAppState((prev) => {
        const layersCopy = [...prev.layers];
        const layerIndex = layersCopy.findIndex((l) => l.id === layerId);
        if (layerIndex === -1) return prev;

        const currentZ = layersCopy[layerIndex].zIndex;
        let otherLayerIndex = -1;

        if (direction === 'up') {
          // Find layer with next highest zIndex
          let minZAbove = Infinity;
          for (let i = 0; i < layersCopy.length; i++) {
            if (i === layerIndex) continue;
            if (
              layersCopy[i].zIndex > currentZ &&
              layersCopy[i].zIndex < minZAbove
            ) {
              minZAbove = layersCopy[i].zIndex;
              otherLayerIndex = i;
            }
          }
          if (
            otherLayerIndex === -1 &&
            layersCopy.some((l) => l.zIndex > currentZ)
          ) {
            // If it's not the topmost, but no single step found, re-evaluate
            // This logic might need refinement for arbitrary z-indices.
            // A simpler z-index swap strategy:
            const sortedByZ = [...layersCopy].sort(
              (a, b) => a.zIndex - b.zIndex,
            );
            const sortedIdx = sortedByZ.findIndex((l) => l.id === layerId);
            if (sortedIdx < sortedByZ.length - 1) {
              otherLayerIndex = layersCopy.findIndex(
                (l) => l.id === sortedByZ[sortedIdx + 1].id,
              );
            }
          }
        } else {
          // 'down'
          // Find layer with next lowest zIndex
          let maxZBelow = -Infinity;
          for (let i = 0; i < layersCopy.length; i++) {
            if (i === layerIndex) continue;
            if (
              layersCopy[i].zIndex < currentZ &&
              layersCopy[i].zIndex > maxZBelow
            ) {
              maxZBelow = layersCopy[i].zIndex;
              otherLayerIndex = i;
            }
          }
          if (
            otherLayerIndex === -1 &&
            layersCopy.some((l) => l.zIndex < currentZ)
          ) {
            const sortedByZ = [...layersCopy].sort(
              (a, b) => a.zIndex - b.zIndex,
            );
            const sortedIdx = sortedByZ.findIndex((l) => l.id === layerId);
            if (sortedIdx > 0) {
              otherLayerIndex = layersCopy.findIndex(
                (l) => l.id === sortedByZ[sortedIdx - 1].id,
              );
            }
          }
        }

        if (otherLayerIndex !== -1) {
          const otherZ = layersCopy[otherLayerIndex].zIndex;
          layersCopy[layerIndex].zIndex = otherZ;
          layersCopy[otherLayerIndex].zIndex = currentZ;
          return { ...prev, layers: layersCopy };
        }
        return prev; // No change if it's already at top/bottom or no layer to swap with
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
        const newLayers = prev.layers.map((layer) => {
          if (layer.id === layerId) {
            const propToUpdate = layer[propertyKey] as AnimatedProperty;
            const updatedKeyframes = propToUpdate.keyframes
              .map((kf) =>
                kf.id === keyframeId ? { ...kf, time: newTime } : kf,
              )
              .sort((a, b) => a.time - b.time);
            return {
              ...layer,
              [propertyKey]: { ...propToUpdate, keyframes: updatedKeyframes },
            };
          }
          return layer;
        });
        return { ...prev, layers: newLayers };
      });
    },
    [],
  );

  const handleAddKeyframe = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      time: number,
    ) => {
      setAppState((prev) => {
        const newLayers = prev.layers.map((layer) => {
          if (layer.id === layerId) {
            const propToUpdate = layer[propertyKey] as AnimatedProperty;
            // Calculate value at this time if adding in between, or use nearest keyframe value. For simplicity, use current value.
            const currentValue = getAnimatedValueAtTime(propToUpdate, time);
            const newKeyframe: Keyframe = {
              id: generateId(),
              time,
              value: currentValue,
              easing: 'linear',
            };

            const updatedKeyframes = [
              ...propToUpdate.keyframes,
              newKeyframe,
            ].sort((a, b) => a.time - b.time); // Ensure sorted

            return {
              ...layer,
              [propertyKey]: { ...propToUpdate, keyframes: updatedKeyframes },
            };
          }
          return layer;
        });
        return { ...prev, layers: newLayers };
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
      propertyKeyStr: string, // This is coming as string from component
      keyframeId: string,
      newTime: number,
      newValue: number,
      newEasing: EasingFunction,
    ) => {
      const propertyKey = propertyKeyStr as keyof Omit<
        Layer,
        'id' | 'name' | 'color' | 'zIndex'
      >;

      setAppState((prev) => {
        const newLayers = prev.layers.map((layer) => {
          if (layer.id === layerId) {
            const propToUpdate = layer[propertyKey] as AnimatedProperty;
            const updatedKeyframes = propToUpdate.keyframes
              .map((kf) =>
                kf.id === keyframeId
                  ? { ...kf, time: newTime, value: newValue, easing: newEasing }
                  : kf,
              )
              .sort((a, b) => a.time - b.time); // Re-sort after time change
            return {
              ...layer,
              [propertyKey]: { ...propToUpdate, keyframes: updatedKeyframes },
            };
          }
          return layer;
        });
        return { ...prev, layers: newLayers };
      });
    },
    [],
  );

  const handleChangeDuration = useCallback((newDuration: number) => {
    setAppState((prev) => ({
      ...prev,
      duration: newDuration,
      currentTime: Math.min(prev.currentTime, newDuration), // Adjust current time if it's beyond new duration
    }));
  }, []);

  const handleChangeZoom = useCallback((newZoom: number) => {
    setAppState((prev) => ({ ...prev, timelineZoom: newZoom }));
  }, []);

  return (
    <div className='h-screen w-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden antialiased'>
      {/* Top Bar - Modern glassmorphism header */}
      <div className='h-16 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center px-6 shadow-lg'>
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
            <svg
              className='w-5 h-5 text-white'
              fill='currentColor'
              viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <h1 className='text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
            Animation Studio
          </h1>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <div className='px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30'>
            Thesis Project
          </div>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Left Panel: Layer Management & Keyframe Editor */}
        <div className='w-80 min-w-[300px] bg-white/5 backdrop-blur-xl p-4 flex flex-col border-r border-white/10 shadow-2xl overflow-hidden'>
          <div className='flex-1 overflow-y-auto scrollbar-thin'>
            <LayerPanel
              layers={appState.layers}
              selectedLayerId={appState.selectedLayerId}
              onSelectLayer={handleSelectLayer}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onMoveLayer={handleMoveLayer}
            />
            {appState.selectedKeyframeInfo && (
              <div className='mt-6 pt-6 border-t border-white/10'>
                <KeyframeEditor
                  selectedKeyframeInfo={appState.selectedKeyframeInfo}
                  layers={appState.layers}
                  onUpdateKeyframe={handleUpdateKeyframe}
                  onClearSelection={() => handleSelectKeyframe(null)}
                />
              </div>
            )}
            <div className='mt-6'>
              <ExportControls
                layers={appState.layers}
                duration={appState.duration}
              />
            </div>
          </div>
        </div>

        {/* Center Panel: Preview Area */}
        <div
          ref={previewAreaRef}
          className='flex-1 bg-gradient-to-br from-slate-800/30 to-slate-900/30 flex items-center justify-center p-12 relative'>
          <div className='w-full h-full max-w-4xl max-h-full bg-slate-800/20 rounded-2xl p-8 shadow-2xl border border-white/10 flex items-center justify-center'>
            <PreviewCanvas
              layers={appState.layers}
              currentTime={appState.currentTime}
              canvasSize={canvasSize}
            />
          </div>
        </div>
      </div>

      {/* Bottom Panel: Timeline */}
      <div
        className='h-80 min-h-[250px] bg-white/5 backdrop-blur-xl border-t border-white/10 shadow-2xl scrollbar-thin'
        style={{ resize: 'vertical' }}>
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
    </div>
  );
};

// SECTION: Main Export
export default App;
