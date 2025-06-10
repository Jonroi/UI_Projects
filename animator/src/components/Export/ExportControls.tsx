import React, { useState } from 'react';
import { ExportModal } from './ExportModal';
import { getAnimatedValueAtTime } from '../../utils/animation';
import type { Layer, AnimatedProperty } from '../../types';

interface ExportControlsProps {
  layers: Layer[];
  duration: number;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  layers,
  duration,
}) => {
  const [exportModal, setExportModal] = useState<{
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
    if (property.keyframes.length === 0) {
      return `/* No keyframes for ${propertyName} */`;
    }

    const keyframes = property.keyframes
      .slice()
      .sort((a, b) => a.time - b.time);

    const cssKeyframes = keyframes.map((kf) => {
      const percentage = ((kf.time / duration) * 100).toFixed(1);
      return `  ${percentage}% { ${propertyName}: ${kf.value}${
        propertyName === 'opacity' ? '' : 'px'
      }; }`;
    });

    return `@keyframes ${layerId}-${propertyName} {
${cssKeyframes.join('\n')}
}`;
  };

  const handleExportCSS = () => {
    const css = layers
      .map((layer) => {
        const properties = [
          'x',
          'y',
          'width',
          'height',
          'opacity',
          'rotation',
          'scale',
        ] as const;
        const keyframes = properties
          .map((prop) => generateCSSKeyframes(layer[prop], prop, layer.id))
          .join('\n\n');

        const animations = properties
          .filter((prop) => layer[prop].keyframes.length > 0)
          .map((prop) => `${layer.id}-${prop} ${duration}ms infinite`)
          .join(', ');

        return `/* Layer: ${layer.name} */
${keyframes}

.${layer.id} {
  position: absolute;
  background-color: ${layer.color};
  z-index: ${layer.zIndex};${
          animations
            ? `
  animation: ${animations};`
            : ''
        }
}`;
      })
      .join('\n\n');

    setExportModal({
      isOpen: true,
      title: 'Export CSS Animation',
      content: css,
      fileExtension: 'css',
      mimeType: 'text/css',
    });
  };

  const handleExportSVG = () => {
    const steps = 30; // Number of animation steps

    let svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>`;

    // Generate animations for each layer
    layers.forEach((layer) => {
      const properties = [
        'x',
        'y',
        'width',
        'height',
        'opacity',
        'rotation',
        'scale',
      ] as const;

      properties.forEach((prop) => {
        if (layer[prop].keyframes.length > 0) {
          const values = [];
          const times = [];

          for (let step = 0; step <= steps; step++) {
            const time = (step / steps) * duration;
            const value = getAnimatedValueAtTime(layer[prop], time);
            values.push(value);
            times.push((step / steps).toFixed(3));
          }

          svgContent += `
    <animate id="${layer.id}-${prop}" 
             attributeName="${prop === 'rotation' ? 'transform' : prop}"
             values="${values.join(';')}"
             keyTimes="${times.join(';')}"
             dur="${duration}ms"
             repeatCount="indefinite" />`;
        }
      });
    });

    svgContent += `
  </defs>`;

    // Generate layer elements
    layers
      .slice()
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((layer) => {
        const x = getAnimatedValueAtTime(layer.x, 0);
        const y = getAnimatedValueAtTime(layer.y, 0);
        const width = getAnimatedValueAtTime(layer.width, 0);
        const height = getAnimatedValueAtTime(layer.height, 0);
        const opacity = getAnimatedValueAtTime(layer.opacity, 0);

        svgContent += `
  <rect id="${layer.id}" 
        x="${x}" 
        y="${y}" 
        width="${width}" 
        height="${height}" 
        fill="${layer.color}" 
        opacity="${opacity}">`;

        // Add animations
        const properties = ['x', 'y', 'width', 'height', 'opacity'] as const;
        properties.forEach((prop) => {
          if (layer[prop].keyframes.length > 0) {
            svgContent += `
    <use href="#${layer.id}-${prop}" />`;
          }
        });

        svgContent += `
  </rect>`;
      });

    svgContent += `
</svg>`;

    setExportModal({
      isOpen: true,
      title: 'Export SVG Animation',
      content: svgContent,
      fileExtension: 'svg',
      mimeType: 'image/svg+xml',
    });
  };

  const handleExportJSON = () => {
    const animationData = {
      version: '1.0',
      duration,
      layers: layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        color: layer.color,
        zIndex: layer.zIndex,
        properties: {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          opacity: layer.opacity,
          rotation: layer.rotation,
          scale: layer.scale,
        },
      })),
      exportedAt: new Date().toISOString(),
    };

    setExportModal({
      isOpen: true,
      title: 'Export Animation Data',
      content: JSON.stringify(animationData, null, 2),
      fileExtension: 'json',
      mimeType: 'application/json',
    });
  };

  return (
    <div className='w-64 bg-gray-50 border-l border-gray-300 p-4'>
      <h2 className='text-lg font-bold mb-4'>Export</h2>

      <div className='space-y-2'>
        <button
          onClick={handleExportCSS}
          className='w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'>
          Export CSS
        </button>

        <button
          onClick={handleExportSVG}
          className='w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500'>
          Export SVG
        </button>

        <button
          onClick={handleExportJSON}
          className='w-full px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500'>
          Export JSON
        </button>
      </div>

      <div className='mt-6 text-xs text-gray-600'>
        <p className='mb-2'>
          <strong>CSS:</strong> Web-compatible CSS animations
        </p>
        <p className='mb-2'>
          <strong>SVG:</strong> Scalable vector animations
        </p>
        <p>
          <strong>JSON:</strong> Animation data for import/backup
        </p>
      </div>

      <ExportModal
        isOpen={exportModal.isOpen}
        onClose={() => setExportModal({ ...exportModal, isOpen: false })}
        title={exportModal.title}
        content={exportModal.content}
        fileExtension={exportModal.fileExtension}
        mimeType={exportModal.mimeType}
      />
    </div>
  );
};
