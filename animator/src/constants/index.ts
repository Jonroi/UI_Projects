import type { CanvasSize } from '../types';

// Application Configuration
export const APP_CONFIG = {
  name: 'Animation Studio',
  version: '1.0.0',
  description: 'Professional Animation Editor',
} as const;

// Canvas Configuration
export const DEFAULT_CANVAS_SIZE: CanvasSize = {
  width: 800,
  height: 600,
} as const;

// Animation Configuration
export const ANIMATION_CONFIG = {
  defaultDuration: 5000, // 5 seconds
  defaultZoom: 1,
  minDuration: 1000, // 1 second
  maxDuration: 60000, // 1 minute
  minZoom: 0.1,
  maxZoom: 5,
  keyframeSnapDistance: 100, // ms
  animationSteps: 30, // for SVG export
} as const;

// UI Configuration
export const UI_CONFIG = {
  layerPanelWidth: 256, // w-64 in Tailwind
  exportPanelWidth: 256, // w-64 in Tailwind
  timelineHeight: 300,
  keyframeSize: 12, // w-3 h-3 in Tailwind
} as const;

// Export Configuration
export const EXPORT_CONFIG = {
  defaultFilename: 'animation',
  formats: {
    css: {
      extension: 'css',
      mimeType: 'text/css',
    },
    svg: {
      extension: 'svg',
      mimeType: 'image/svg+xml',
    },
    json: {
      extension: 'json',
      mimeType: 'application/json',
    },
  },
} as const;

// Default Colors for Layers
export const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500
] as const; 