import React, { useState, useEffect } from 'react';
import { X, Download, Eye, EyeOff, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fileService } from '../services/fileService';
import { File as FileType, FilePreview } from '../types';

interface FilePreviewProps {
  file: FileType | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const FilePreviewModal: React.FC<FilePreviewProps> = ({
  file,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) => {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      loadPreview();
    }
  }, [file, isOpen]);

  const loadPreview = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const previewData = await fileService.getFilePreview(file.id);
      setPreview(previewData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      await fileService.downloadFile(file.id, file.originalName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (hasPrevious && onPrevious) onPrevious();
        break;
      case 'ArrowRight':
        if (hasNext && onNext) onNext();
        break;
      case 'f':
      case 'F':
        setIsFullscreen(!isFullscreen);
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasPrevious, hasNext, isFullscreen]);

  if (!isOpen || !file) return null;

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-red-600">
            <EyeOff className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Preview not available</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      );
    }

    if (!preview) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <EyeOff className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Preview not available</p>
            <p className="text-sm mt-2">This file type cannot be previewed</p>
          </div>
        </div>
      );
    }

    switch (preview.type) {
      case 'image':
        return (
          <div className="flex items-center justify-center p-4">
            <img
              src={preview.url}
              alt={file.originalName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              style={{
                maxHeight: isFullscreen ? '90vh' : '70vh',
                maxWidth: '100%'
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center p-4">
            <video
              src={preview.url}
              controls
              className="max-w-full max-h-full rounded-lg shadow-lg"
              style={{
                maxHeight: isFullscreen ? '90vh' : '70vh',
                maxWidth: '100%'
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{file.originalName}</h3>
              <p className="text-gray-500 mb-6">Audio file</p>
              <audio
                src={preview.url}
                controls
                className="w-full"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4">
              <iframe
                src={preview.url}
                className="w-full h-full rounded-lg shadow-lg border border-gray-200"
                title={`PDF preview: ${file.originalName}`}
                style={{
                  minHeight: '70vh'
                }}
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
              <iframe
                src={preview.url}
                className="w-full h-96 border border-gray-200 rounded bg-white"
                title={`Text preview: ${file.originalName}`}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
              <EyeOff className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">Preview not available</p>
              <p className="text-sm mt-2">Download the file to view its contents</p>
            </div>
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className={`relative bg-white rounded-lg ${isFullscreen ? 'w-full h-full' : 'max-w-6xl max-h-[90vh]'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium text-gray-900 truncate" title={file.originalName}>
              {file.originalName}
            </h2>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{file.mimeType || 'Unknown type'}</span>
              <span>•</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Navigation buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous file (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next file (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> to close</span>
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">→</kbd> to navigate</span>
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">F</kbd> for fullscreen</span>
            </div>
            {preview?.metadata && (
              <div className="flex items-center space-x-4">
                {preview.metadata.dimensions && (
                  <span>Dimensions: {preview.metadata.dimensions.width} × {preview.metadata.dimensions.height}</span>
                )}
                {preview.metadata.duration && (
                  <span>Duration: {Math.round(preview.metadata.duration)}s</span>
                )}
                {preview.metadata.pages && (
                  <span>Pages: {preview.metadata.pages}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;