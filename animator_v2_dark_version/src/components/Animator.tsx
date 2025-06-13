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

// Array of predefined colors for layers
const LAYER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

const createNewLayer = (
  name: string,
  zIndex: number,
  color: string = LAYER_COLORS[zIndex % LAYER_COLORS.length],
  initialX: number = 50,
  initialY: number = 50,
): Layer => ({
  id: generateId(),
  name,
  color,
  zIndex,
  x: createDefaultAnimatedProperty(initialX, initialX),
  y: createDefaultAnimatedProperty(initialY, initialY),
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

// SECTION: React Components

/** UI for editing a selected keyframe's properties. */
const KeyframeEditor: React.FC<{
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  layers: Layer[];
  onUpdateKeyframe: (
    layerId: string,
    propertyKey: string,
    keyframeId: string,
    newTime: number,
    newValue: number,
    newEasing: EasingFunction,
  ) => void;
  onDeleteKeyframe: (
    layerId: string,
    propertyKey: string,
    keyframeId: string,
  ) => void;
  onClearSelection: () => void;
}> = ({ selectedKeyframeInfo, layers, onUpdateKeyframe, onDeleteKeyframe }) => {
  const [time, setTime] = useState<number>(0);
  const [easing, setEasing] = useState<EasingFunction>('linear');

  useEffect(() => {
    if (selectedKeyframeInfo) {
      const { layerId, propertyKey, keyframeId } = selectedKeyframeInfo;
      const layer = layers.find((l) => l.id === layerId);
      const property = layer
        ? (layer[propertyKey as keyof Layer] as AnimatedProperty)
        : null;
      const keyframe = property?.keyframes.find((kf) => kf.id === keyframeId);

      if (keyframe) {
        setTime(keyframe.time);
        setEasing(keyframe.easing);
      }
    }
  }, [selectedKeyframeInfo, layers]);

  const handleSave = () => {
    if (selectedKeyframeInfo) {
      const { layerId, propertyKey, keyframeId } = selectedKeyframeInfo;
      const layer = layers.find((l) => l.id === layerId);
      const property = layer
        ? (layer[propertyKey as keyof Layer] as AnimatedProperty)
        : null;
      const keyframe = property?.keyframes.find((kf) => kf.id === keyframeId);

      if (keyframe) {
        onUpdateKeyframe(
          layerId,
          propertyKey,
          keyframeId,
          time,
          keyframe.value,
          easing,
        );
      }
    }
  };

  if (!selectedKeyframeInfo) {
    return (
      <div className='p-4 text-center text-white/50'>
        Select a keyframe to edit its properties
      </div>
    );
  }

  return (
    <div className='p-4 space-y-4'>
      <div>
        <label className='block text-xs text-white/50 mb-1'>Time (ms)</label>
        <input
          type='number'
          value={time}
          onChange={(e) => setTime(parseFloat(e.target.value))}
          className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-blue-500/50'
        />
      </div>
      <div>
        <label className='block text-xs text-white/50 mb-1'>Easing</label>
        <select
          value={typeof easing === 'string' ? easing : 'custom'}
          onChange={(e) => setEasing(e.target.value as EasingFunction)}
          className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-blue-500/50'>
          <option value='linear'>Linear</option>
          <option value='easeInQuad'>Ease In Quad</option>
          <option value='easeOutQuad'>Ease Out Quad</option>
          <option value='easeInOutQuad'>Ease In Out Quad</option>
          <option value='custom'>Custom Bezier</option>
        </select>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={handleSave}
          className='flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors'>
          Save Changes
        </button>
        <button
          onClick={() =>
            selectedKeyframeInfo &&
            onDeleteKeyframe(
              selectedKeyframeInfo.layerId,
              selectedKeyframeInfo.propertyKey,
              selectedKeyframeInfo.keyframeId,
            )
          }
          className='flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors'>
          Delete Keyframe
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
      className={`rounded-lg transition-all duration-300 ${
        isSelected ? 'bg-white/10 hover:bg-white/15' : 'hover:bg-white/5'
      }`}>
      <div
        className='flex items-center gap-2 p-2 cursor-pointer'
        onClick={() => onSelect(layer.id)}>
        <div
          className='w-4 h-4 rounded-full'
          style={{ backgroundColor: layer.color }}
        />
        <span className='flex-1 text-sm text-white/90'>{layer.name}</span>
        <div className='flex items-center gap-1'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(layer.id);
            }}
            className='p-1 text-white/50 hover:text-white/90 transition-colors'>
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 15l7-7 7 7'
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(layer.id);
            }}
            className='p-1 text-white/50 hover:text-white/90 transition-colors'>
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className='p-1 text-white/50 hover:text-red-400 transition-colors'>
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isSelected
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}>
        <div className='overflow-hidden'>
          <div className='px-2 pb-2'>
            <div className='space-y-3 border-t border-white/10 pt-2'>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Layer Name
                </label>
                <input
                  type='text'
                  value={layer.name}
                  onChange={(e) => onUpdateLayerName(layer.id, e.target.value)}
                  className='w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
                />
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Layer Color
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    value={layer.color}
                    onChange={(e) =>
                      onUpdateLayerColor(layer.id, e.target.value)
                    }
                    className='w-8 h-8 p-0 bg-transparent border-0 rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded'
                  />
                  <input
                    type='text'
                    value={layer.color}
                    onChange={(e) =>
                      onUpdateLayerColor(layer.id, e.target.value)
                    }
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200'
                  />
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  X Position
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'x',
                        getAnimatedValueAtTime(layer.x, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.x, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'x', value);
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'x',
                        getAnimatedValueAtTime(layer.x, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Y Position
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'y',
                        getAnimatedValueAtTime(layer.y, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.y, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'y', value);
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'y',
                        getAnimatedValueAtTime(layer.y, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Width
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'width',
                        getAnimatedValueAtTime(layer.width, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.width, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'width', value);
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'width',
                        getAnimatedValueAtTime(layer.width, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Height
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'height',
                        getAnimatedValueAtTime(layer.height, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.height, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'height', value);
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'height',
                        getAnimatedValueAtTime(layer.height, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Opacity
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'opacity',
                        getAnimatedValueAtTime(layer.opacity, 0),
                        0.1,
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.opacity, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(
                          layer.id,
                          'opacity',
                          Math.max(0, Math.min(1, value)),
                        );
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'opacity',
                        getAnimatedValueAtTime(layer.opacity, 0),
                        0.1,
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Rotation
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'rotation',
                        getAnimatedValueAtTime(layer.rotation, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.rotation, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'rotation', value);
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'rotation',
                        getAnimatedValueAtTime(layer.rotation, 0),
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-white/50 mb-1'>
                  Scale
                </label>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() =>
                      handleDecrement(
                        layer.id,
                        'scale',
                        getAnimatedValueAtTime(layer.scale, 0),
                        0.1,
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M20 12H4'
                      />
                    </svg>
                  </button>
                  <input
                    type='number'
                    value={getAnimatedValueAtTime(layer.scale, 0)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onUpdateLayer(layer.id, 'scale', Math.max(0.1, value));
                      }
                    }}
                    className='flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  />
                  <button
                    onClick={() =>
                      handleIncrement(
                        layer.id,
                        'scale',
                        getAnimatedValueAtTime(layer.scale, 0),
                        0.1,
                      )
                    }
                    className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
                    <svg
                      className='w-4 h-4 text-gray-400 hover:text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
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
  onUpdateLayer: (
    layerId: string,
    propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
    value: number,
  ) => void;
  onUpdateLayerName: (layerId: string, name: string) => void;
  onUpdateLayerColor: (layerId: string, color: string) => void;
}> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onMoveLayer,
  onUpdateLayer,
  onUpdateLayerName,
  onUpdateLayerColor,
}) => {
  return (
    <div className='space-y-4 pr-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-white/90'>Layers</h2>
        <button
          onClick={onAddLayer}
          className='p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors'>
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
        </button>
      </div>

      <div className='space-y-2'>
        {layers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={layer.id === selectedLayerId}
            onSelect={onSelectLayer}
            onDelete={onDeleteLayer}
            onMoveUp={() => onMoveLayer(layer.id, 'up')}
            onMoveDown={() => onMoveLayer(layer.id, 'down')}
            onUpdateLayer={onUpdateLayer}
            onUpdateLayerName={onUpdateLayerName}
            onUpdateLayerColor={onUpdateLayerColor}
          />
        ))}
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

        <div className='flex items-center gap-2'>
          <button
            onClick={() => onChangeDuration(Math.max(0.1, duration - 1000))}
            className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
            <svg
              className='w-4 h-4 text-gray-400 hover:text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M20 12H4'
              />
            </svg>
          </button>
          <input
            type='number'
            value={duration}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1) {
                onChangeDuration(value);
              }
            }}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1) {
                onChangeDuration(Number(value.toFixed(1)));
              }
            }}
            className='w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            step='0.1'
            min='0.1'
          />
          <span className='text-sm text-gray-300'>ms</span>
          <button
            onClick={() => onChangeDuration(duration + 1000)}
            className='p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors'>
            <svg
              className='w-4 h-4 text-gray-400 hover:text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
          </button>
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
            {currentTime.toFixed(1)}ms / {duration.toFixed(1)}ms
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
  onLayerPositionChange?: (layerId: string, x: number, y: number) => void;
}> = ({ layers, currentTime, canvasSize, onLayerPositionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingLayer, setDraggingLayer] = useState<{
    id: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each layer
    layers.forEach((layer) => {
      const x = getAnimatedValueAtTime(layer.x, currentTime);
      const y = getAnimatedValueAtTime(layer.y, currentTime);
      const width = getAnimatedValueAtTime(layer.width, currentTime);
      const height = getAnimatedValueAtTime(layer.height, currentTime);
      const opacity = getAnimatedValueAtTime(layer.opacity, currentTime);
      const rotation = getAnimatedValueAtTime(layer.rotation, currentTime);
      const scale = getAnimatedValueAtTime(layer.scale, currentTime);

      ctx.save();

      // Apply transformations
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      // Set appearance
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      ctx.fillStyle = layer.color;

      // Draw the element
      ctx.fillRect(-width / 2, -height / 2, width, height);

      ctx.restore();
    });
  }, [layers, currentTime, canvasSize]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingLayer && onLayerPositionChange) {
      const deltaX = mouseX - draggingLayer.startX;
      const deltaY = mouseY - draggingLayer.startY;

      const newX = draggingLayer.offsetX + deltaX;
      const newY = draggingLayer.offsetY + deltaY;

      onLayerPositionChange(draggingLayer.id, newX, newY);
    } else {
      // Check for hover
      let foundHover = false;
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const x = getAnimatedValueAtTime(layer.x, currentTime);
        const y = getAnimatedValueAtTime(layer.y, currentTime);
        const width = getAnimatedValueAtTime(layer.width, currentTime);
        const height = getAnimatedValueAtTime(layer.height, currentTime);

        if (
          mouseX >= x &&
          mouseX <= x + width &&
          mouseY >= y &&
          mouseY <= y + height
        ) {
          setHoveredLayer(layer.id);
          foundHover = true;
          break;
        }
      }
      if (!foundHover) {
        setHoveredLayer(null);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onLayerPositionChange) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check each layer from top to bottom (reverse order)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const x = getAnimatedValueAtTime(layer.x, currentTime);
      const y = getAnimatedValueAtTime(layer.y, currentTime);
      const width = getAnimatedValueAtTime(layer.width, currentTime);
      const height = getAnimatedValueAtTime(layer.height, currentTime);

      if (
        mouseX >= x &&
        mouseX <= x + width &&
        mouseY >= y &&
        mouseY <= y + height
      ) {
        setDraggingLayer({
          id: layer.id,
          startX: mouseX,
          startY: mouseY,
          offsetX: x,
          offsetY: y,
        });
        break;
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingLayer(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={`bg-transparent ${
        draggingLayer ? 'cursor-grabbing' : hoveredLayer ? 'cursor-grab' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animation.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50'>
      <div className='bg-gradient-to-br from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-md rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col border border-white/10'>
        <div className='flex items-center justify-between p-4 border-b border-white/10'>
          <h2 className='text-xl font-semibold text-white'>{title}</h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white/10 rounded-lg transition-colors'>
            <svg
              className='w-5 h-5 text-gray-400 hover:text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
        <div className='flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20'>
          <pre className='bg-gray-900/50 rounded-lg p-4 text-sm text-gray-300 font-mono overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20'>
            {content}
          </pre>
        </div>
        <div className='p-4 border-t border-white/10 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors'>
            Close
          </button>
          <button
            onClick={handleDownload}
            className='px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors'>
            Download
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
  onExport: (modalState: {
    isOpen: boolean;
    title: string;
    content: string;
    fileExtension: string;
    mimeType: string;
  }) => void;
}> = ({ layers, duration, onExport }) => {
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

    onExport({
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

    onExport({
      isOpen: true,
      title: 'Export SVG Animation',
      content: svgContent,
      fileExtension: 'svg',
      mimeType: 'image/svg+xml',
    });
  };

  return (
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
  );
};

// SECTION: Main App Component
const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const animationFrameId = useRef<number | null>(null);
  const [exportModalState, setExportModalState] = useState<{
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
          width: Math.max(200, width - 40), // Reduced padding to make canvas larger
          height: Math.max(200, height - 40), // Reduced padding to make canvas larger
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

  const handleAddLayer = useCallback(() => {
    setAppState((prev) => {
      const newZIndex = prev.layers.length;
      const newLayer = createNewLayer(
        `Layer ${newZIndex + 1}`,
        newZIndex,
        LAYER_COLORS[newZIndex % LAYER_COLORS.length],
        canvasSize.width / 2 - 50, // Center horizontally
        canvasSize.height / 2 - 25, // Center vertically
      );

      // Add initial keyframes for all properties
      newLayer.x.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.x.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.y.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.y.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.width.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.width.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.height.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.height.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.opacity.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.opacity.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.rotation.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.rotation.defaultValue,
          easing: 'linear',
        },
      ];
      newLayer.scale.keyframes = [
        {
          id: generateId(),
          time: 0,
          value: newLayer.scale.defaultValue,
          easing: 'linear',
        },
      ];

      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        selectedLayerId: newLayer.id,
      };
    });
  }, [canvasSize]);

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

  const handleUpdateLayer = useCallback(
    (
      layerId: string,
      propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>,
      value: number,
    ) => {
      setAppState((prev) => ({
        ...prev,
        layers: prev.layers.map((layer) => {
          if (layer.id === layerId) {
            // Update the property's default value
            const updatedProperty = {
              ...layer[propertyKey],
              defaultValue: Number(value.toFixed(1)),
            };

            // If there's a keyframe at time 0, update it too
            const keyframes = layer[propertyKey].keyframes.map((kf) => {
              if (kf.time === 0) {
                return { ...kf, value: Number(value.toFixed(1)) };
              }
              return { ...kf, value: Number(kf.value.toFixed(1)) };
            });

            // If no keyframe at time 0, add one
            if (!keyframes.some((kf) => kf.time === 0)) {
              keyframes.unshift({
                id: generateId(),
                time: 0,
                value: Number(value.toFixed(1)),
                easing: 'linear',
              });
            }

            return {
              ...layer,
              [propertyKey]: {
                ...updatedProperty,
                keyframes,
              },
            };
          }
          return layer;
        }),
      }));
    },
    [],
  );

  const handleUpdateLayerPosition = useCallback(
    (layerId: string, x: number, y: number) => {
      setAppState((prev) => ({
        ...prev,
        layers: prev.layers.map((layer) => {
          if (layer.id === layerId) {
            return {
              ...layer,
              x: {
                ...layer.x,
                defaultValue: x,
                keyframes: layer.x.keyframes.map((kf) => ({
                  ...kf,
                  value: kf.time === 0 ? x : kf.value,
                })),
              },
              y: {
                ...layer.y,
                defaultValue: y,
                keyframes: layer.y.keyframes.map((kf) => ({
                  ...kf,
                  value: kf.time === 0 ? y : kf.value,
                })),
              },
            };
          }
          return layer;
        }),
      }));
    },
    [],
  );

  const handleLayerSelect = (layerId: string) => {
    // If clicking the same layer, deselect it
    if (appState.selectedLayerId === layerId) {
      setAppState((prev) => ({ ...prev, selectedLayerId: null }));
      return;
    }
    setAppState((prev) => ({ ...prev, selectedLayerId: layerId }));
  };

  return (
    <div className='h-screen w-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden antialiased select-none'>
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

      <div className='flex-1 flex flex-col overflow-hidden'>
        <div className='flex-1 flex overflow-hidden'>
          {/* Left Panel: Layer Management & Keyframe Editor */}
          <div className='w-80 min-w-[300px] bg-white/5 backdrop-blur-xl p-4 flex flex-col border-r border-white/10 shadow-2xl overflow-hidden'>
            <div className='flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20'>
              <LayerPanel
                layers={appState.layers}
                selectedLayerId={appState.selectedLayerId}
                onSelectLayer={handleLayerSelect}
                onAddLayer={handleAddLayer}
                onDeleteLayer={handleDeleteLayer}
                onMoveLayer={handleMoveLayer}
                onUpdateLayer={handleUpdateLayer}
                onUpdateLayerName={(layerId, name) =>
                  setAppState((prev) => ({
                    ...prev,
                    layers: prev.layers.map((layer) =>
                      layer.id === layerId ? { ...layer, name } : layer,
                    ),
                  }))
                }
                onUpdateLayerColor={(layerId, color) =>
                  setAppState((prev) => ({
                    ...prev,
                    layers: prev.layers.map((layer) =>
                      layer.id === layerId ? { ...layer, color } : layer,
                    ),
                  }))
                }
              />
              {appState.selectedKeyframeInfo && (
                <div className='mt-6 pt-6 border-t border-white/10'>
                  <KeyframeEditor
                    selectedKeyframeInfo={appState.selectedKeyframeInfo}
                    layers={appState.layers}
                    onUpdateKeyframe={handleUpdateKeyframe}
                    onDeleteKeyframe={handleDeleteLayer}
                    onClearSelection={() =>
                      setAppState((prev) => ({
                        ...prev,
                        selectedKeyframeInfo: null,
                      }))
                    }
                  />
                </div>
              )}
              <div className='mt-6'>
                <ExportControls
                  layers={appState.layers}
                  duration={appState.duration}
                  onExport={setExportModalState}
                />
              </div>
            </div>
          </div>

          {/* Center Panel: Preview Area */}
          <div
            ref={previewAreaRef}
            className='flex-1 bg-gradient-to-br from-slate-800/30 to-slate-900/30 flex items-center justify-center relative'>
            <div className='w-full h-full max-w-4xl max-h-full bg-slate-800/20 rounded-2xl p-2 shadow-2xl flex items-center justify-center'>
              <PreviewCanvas
                layers={appState.layers}
                currentTime={appState.currentTime}
                canvasSize={canvasSize}
                onLayerPositionChange={handleUpdateLayerPosition}
              />
            </div>
          </div>
        </div>

        {/* Bottom Panel: Timeline */}
        <div
          className='h-80 min-h-[250px] bg-white/5 backdrop-blur-xl border-t border-white/10 shadow-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20'
          style={{ resize: 'vertical' }}>
          <TimelinePanel
            appState={appState}
            onSetCurrentTime={(time) =>
              setAppState((prev) => ({ ...prev, currentTime: time }))
            }
            onTogglePlay={() =>
              setAppState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
            }
            onAddKeyframe={handleAddKeyframe}
            onDragKeyframe={handleDragKeyframe}
            onSelectKeyframe={(info) =>
              setAppState((prev) => ({ ...prev, selectedKeyframeInfo: info }))
            }
            onChangeDuration={(duration) =>
              setAppState((prev) => ({ ...prev, duration }))
            }
            onChangeZoom={(zoom) =>
              setAppState((prev) => ({ ...prev, timelineZoom: zoom }))
            }
          />
        </div>
      </div>

      <ExportModal
        isOpen={exportModalState.isOpen}
        onClose={() =>
          setExportModalState((prev) => ({ ...prev, isOpen: false }))
        }
        title={exportModalState.title}
        content={exportModalState.content}
        fileExtension={exportModalState.fileExtension}
        mimeType={exportModalState.mimeType}
      />
    </div>
  );
};

// SECTION: Main Export
export default App;
