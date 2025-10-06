import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Pause, Play, RotateCcw, FileText, Image, Film, Music, Archive } from 'lucide-react';
import { uploadService } from '../services/uploadService';
import { UploadProgress, Channel } from '../types';
import toast from 'react-hot-toast';

interface FileUploadProps {
  channelId: string;
  channels: Channel[];
  onUploadComplete?: (fileId: string, file: any) => void;
  className?: string;
}

interface FileUploadItemProps {
  upload: UploadProgress;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
}

const FileUploadItem: React.FC<FileUploadItemProps> = ({
  upload,
  onPause,
  onResume,
  onRetry,
  onCancel
}) => {
  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType?.startsWith('video/')) return <Film className="w-4 h-4" />;
    if (mimeType?.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return <Archive className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'retrying': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressBarColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'retrying': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 text-gray-500">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {upload.filename}
            </p>
            <p className="text-xs text-gray-500">
              {uploadService.formatFileSize(upload.loaded)} / {uploadService.formatFileSize(upload.total)}
              {upload.estimatedTimeRemaining && upload.status === 'uploading' && (
                <span className="ml-2">
                  • {Math.round(upload.estimatedTimeRemaining / 1000)}s remaining
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {upload.status === 'uploading' && onPause && (
            <button
              onClick={onPause}
              className="p-1 text-gray-500 hover:text-yellow-600 transition-colors"
              title="Pause upload"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {upload.status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className="p-1 text-gray-500 hover:text-green-600 transition-colors"
              title="Resume upload"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {(upload.status === 'error' || upload.status === 'retrying') && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
              title="Retry upload"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(upload.status)}`}
            style={{ width: `${upload.percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${getStatusColor(upload.status)}`}>
          {upload.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Error message */}
      {upload.error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {upload.error}
        </div>
      )}

      {/* Retry count */}
      {upload.retryCount > 0 && (
        <div className="text-xs text-gray-500">
          Retry attempt {upload.retryCount} of {upload.maxRetries}
        </div>
      )}
    </div>
  );
};

const FileUpload: React.FC<FileUploadProps> = ({
  channelId,
  channels,
  onUploadComplete,
  className = ''
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState(channelId);

  // Update uploads periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const allUploads = uploadService.getAllUploads();
      setUploads(allUploads);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      uploadService.startUpload(
        file,
        selectedChannelId,
        (_progress) => {
          setUploads(uploadService.getAllUploads());
        },
        (fileId, _fileData) => {
          toast.success(`Upload completed: ${file.name}`);
          if (onUploadComplete) {
            onUploadComplete(fileId, _fileData);
          }
        },
        (error, _retryable) => {
          toast.error(`Upload failed: ${error}`);
        }
      );
    });
  }, [selectedChannelId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
  });

  const handlePauseUpload = (uploadId: string) => {
    uploadService.pauseUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleResumeUpload = (uploadId: string) => {
    uploadService.resumeUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleRetryUpload = async (uploadId: string) => {
    await uploadService.retryUpload(uploadId);
    setUploads(uploadService.getAllUploads());
  };

  const handleCancelUpload = (uploadId: string) => {
    uploadService.cancelUpload(uploadId);
    setUploads(uploadService.getAllUploads());
    toast.success('Upload cancelled');
  };

  const handleClearCompleted = () => {
    uploadService.clearCompleted();
    setUploads(uploadService.getAllUploads());
  };

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const failedUploads = uploads.filter(u => u.status === 'error');
  const pausedUploads = uploads.filter(u => u.status === 'paused');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Channel selector */}
      {channels.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload to Channel
          </label>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-gray-500 text-sm">
              Maximum file size: 5GB • Multiple files supported
            </p>
          </div>
        )}
      </div>

      {/* Upload statistics */}
      {(activeUploads.length > 0 || completedUploads.length > 0 || failedUploads.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Upload Queue</h3>
            {completedUploads.length > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {activeUploads.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">
                  {activeUploads.length} active
                </span>
              </div>
            )}
            {pausedUploads.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">
                  {pausedUploads.length} paused
                </span>
              </div>
            )}
            {completedUploads.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">
                  {completedUploads.length} completed
                </span>
              </div>
            )}
            {failedUploads.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">
                  {failedUploads.length} failed
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <FileUploadItem
              key={upload.uploadId}
              upload={upload}
              onPause={() => handlePauseUpload(upload.uploadId)}
              onResume={() => handleResumeUpload(upload.uploadId)}
              onRetry={() => handleRetryUpload(upload.uploadId)}
              onCancel={() => handleCancelUpload(upload.uploadId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;