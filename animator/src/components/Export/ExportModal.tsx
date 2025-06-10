import React from 'react';
import type { ExportModalProps } from '../../types';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  fileExtension,
  mimeType,
}) => {
  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = () => {
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
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-bold'>{title}</h3>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 text-xl'>
            ✕
          </button>
        </div>

        <div className='mb-4 overflow-auto max-h-96'>
          <pre className='bg-gray-100 p-4 rounded text-sm overflow-auto'>
            <code>{content}</code>
          </pre>
        </div>

        <div className='flex justify-end space-x-2'>
          <button
            onClick={copyToClipboard}
            className='px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500'>
            Copy to Clipboard
          </button>
          <button
            onClick={downloadFile}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'>
            Download File
          </button>
        </div>
      </div>
    </div>
  );
};
