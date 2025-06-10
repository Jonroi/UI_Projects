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

/** Canvas size configuration */
export interface CanvasSize {
  width: number;
  height: number;
}

/** Export modal props */
export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  fileExtension: string;
  mimeType: string;
}
