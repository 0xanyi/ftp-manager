import React from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { 
  FileText, 
  Image, 
  Film, 
  Music, 
  Archive, 
  Download, 
  Trash2, 
  Eye,
  Check
} from 'lucide-react';
import { File } from '../types';
import { formatFileSize, formatDate } from '../utils/helpers';

interface VirtualFileListProps {
  files: File[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onFileDownload: (fileId: string) => void;
  onFilePreview: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  selectedFiles: Set<string>;
  className?: string;
}

interface FileItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    files: File[];
    selectedFiles: Set<string>;
    onFileSelect: (fileId: string, selected: boolean) => void;
    onFileDownload: (fileId: string) => void;
    onFilePreview: (fileId: string) => void;
    onFileDelete: (fileId: string) => void;
  };
}

const FileItem: React.FC<FileItemProps> = React.memo(({ index, style, data }) => {
  const file = data.files[index];
  const isSelected = data.selectedFiles.has(file.id);

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />;
    if (mimeType?.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />;
    if (mimeType?.startsWith('audio/')) return <Music className="w-5 h-5 text-blue-500" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) {
      return <Archive className="w-5 h-5 text-yellow-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    data.onFileSelect(file.id, e.target.checked);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onFileDownload(file.id);
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onFilePreview(file.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onFileDelete(file.id);
  };

  return (
    <div
      style={style}
      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      <div className="flex items-center px-4 py-3 space-x-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />

        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileIcon(file.mimeType)}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.originalName}
            </p>
            {isSelected && (
              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.createdAt)}</span>
            {file.uploader && (
              <span>by {file.uploader.email}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {file.mimeType?.startsWith('image/') || 
           file.mimeType?.startsWith('video/') || 
           file.mimeType?.startsWith('audio/') ||
           file.mimeType === 'application/pdf' ? (
            <button
              onClick={handlePreview}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          ) : null}

          <button
            onClick={handleDownload}
            className="p-1 text-gray-500 hover:text-green-600 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

FileItem.displayName = 'FileItem';

const VirtualFileList: React.FC<VirtualFileListProps> = ({
  files,
  loading,
  hasMore,
  onLoadMore,
  onFileSelect,
  onFileDownload,
  onFilePreview,
  onFileDelete,
  selectedFiles,
  className = ''
}) => {
  const itemCount = hasMore ? files.length + 1 : files.length;
  const isItemLoaded = (index: number) => !hasMore || index < files.length;

  const ItemRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading more files...</p>
          </div>
        </div>
      );
    }

    return (
      <FileItem
        index={index}
        style={style}
        data={{
          files,
          selectedFiles,
          onFileSelect,
          onFileDownload,
          onFilePreview,
          onFileDelete,
        }}
      />
    );
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-medium text-gray-900">
            Files ({files.length})
          </h3>
          {selectedFiles.size > 0 && (
            <span className="text-sm text-blue-600">
              {selectedFiles.size} selected
            </span>
          )}
        </div>
      </div>

      {/* Virtual List */}
      <div className="h-96">
        {files.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No files found</p>
            <p className="text-sm">Upload some files to get started</p>
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={onLoadMore}
            threshold={5}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={384} // 24rem
                itemCount={itemCount}
                itemSize={80} // Height of each file item
                onItemsRendered={onItemsRendered}
                className="group"
              >
                {ItemRenderer}
              </List>
            )}
          </InfiniteLoader>
        )}
      </div>

      {/* Footer with loading indicator */}
      {loading && (
        <div className="flex items-center justify-center px-4 py-3 border-t border-gray-200">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default VirtualFileList;
