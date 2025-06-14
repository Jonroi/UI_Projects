export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | [number, number, number, number];

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  easing: string;
}

export interface AnimatedProperty {
  keyframes: Keyframe[];
  defaultValue: number;
}

export interface Layer {
  id: string;
  name: string;
  x: AnimatedProperty;
  y: AnimatedProperty;
  width: AnimatedProperty;
  height: AnimatedProperty;
  opacity: AnimatedProperty;
  rotation: AnimatedProperty;
  scale: AnimatedProperty;
  color: string;
  zIndex: number;
}

export interface SelectedKeyframeInfo {
  layerId: string;
  propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>;
  keyframeId: string;
}

export interface AppState {
  layers: Layer[];
  selectedLayerId: string | null;
  selectedPropertyKey:
    | keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>
    | null;
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  currentTime: number; // Current time in milliseconds
  isPlaying: boolean;
  duration: number; // Total animation duration in milliseconds
  timelineZoom: number; // Pixels per 100ms
}

export interface LayerPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onUpdateLayer: (layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, value: number) => void;
  onUpdateLayerName: (layerId: string, name: string) => void;
  onUpdateLayerColor: (layerId: string, color: string) => void;
}

export interface TimelinePanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  selectedPropertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'> | null;
  selectedKeyframeInfo: SelectedKeyframeInfo | null;
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  timelineZoom: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onDurationChange: (duration: number) => void;
  onTimelineZoom: (zoom: number) => void;
  onKeyframeSelect: (info: SelectedKeyframeInfo | null) => void;
  onKeyframeAdd: (layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, time: number) => void;
  onKeyframeUpdate: (layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, oldTime: number, newTime: number, newValue: number) => void;
  onKeyframeRemove: (layerId: string, propertyKey: keyof Omit<Layer, 'id' | 'name' | 'color' | 'zIndex'>, time: number) => void;
  onExportCSS: () => void;
  onExportSVG: () => void;
}

export interface PreviewCanvasProps {
  layers: Layer[];
  currentTime: number;
  canvasSize: { width: number; height: number };
  onLayerPositionChange?: (layerId: string, x: number, y: number) => void;
}
