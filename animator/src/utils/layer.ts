import type { AnimatedProperty, Layer } from '../types';
import { generateId } from './animation';

/**
 * Creates a default AnimatedProperty with optional initial keyframe.
 * @param defaultValue The default value for the property.
 * @param initialValue If provided, creates an initial keyframe at time 0 with this value.
 * @returns A new AnimatedProperty.
 */
export const createDefaultAnimatedProperty = (
  defaultValue: number,
  initialValue?: number,
): AnimatedProperty => ({
  keyframes:
    initialValue !== undefined
      ? [
          {
            id: generateId(),
            time: 0,
            value: initialValue,
            easing: 'linear' as const,
          },
        ]
      : [],
  defaultValue,
});

/**
 * Creates a new Layer with default properties.
 * @param name The display name of the layer.
 * @param zIndex The stacking order.
 * @param color The color of the layer (hex string).
 * @returns A new Layer object.
 */
export const createNewLayer = (
  name: string,
  zIndex: number,
  color: string = '#3B82F6',
): Layer => ({
  id: generateId(),
  name,
  color,
  zIndex,
  x: createDefaultAnimatedProperty(100, 100),
  y: createDefaultAnimatedProperty(100, 100),
  width: createDefaultAnimatedProperty(100, 100),
  height: createDefaultAnimatedProperty(100, 100),
  opacity: createDefaultAnimatedProperty(1, 1),
  rotation: createDefaultAnimatedProperty(0, 0),
  scale: createDefaultAnimatedProperty(1, 1),
});

/**
 * Finds the maximum z-index among all layers.
 * @param layers Array of layers.
 * @returns The maximum z-index, or 0 if no layers.
 */
export const getMaxZIndex = (layers: Layer[]): number => {
  return layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) : 0;
};
