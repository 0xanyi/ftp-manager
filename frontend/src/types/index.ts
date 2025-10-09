export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CHANNEL_USER';
  channels: Channel[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size: number;
  ftpPath: string;
  channelId: string;
  uploadedBy: string;
  uploadedByGuest: boolean;
  guestUploadLinkId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  uploader?: {
    id: string;
    email: string;
  };
}

export interface GuestUploadLink {
  id: string;
  token: string;
  channelId?: string;
  channel?: Channel;
  guestFolder?: string;
  description?: string;
  expiresAt?: string;
  maxUploads?: number;
  uploadCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Upload related types
export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  totalSize: number;
  filename: string;
  mimeType: string;
  channelId: string;
}

export interface ChunkUploadResponse {
  success: boolean;
  message?: string;
  uploadComplete?: boolean;
  fileId?: string;
}

export interface UploadSession {
  uploadId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  totalChunks: number;
  channelId: string;
  uploadedBy: string;
  uploadedChunks: number[];
  tempFilePath: string;
  createdAt: string;
  expiresAt: string;
}

export interface UploadProgress {
  uploadId: string;
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'retrying';
  error?: string;
  retryCount: number;
  maxRetries: number;
  startTime: string;
  estimatedTimeRemaining?: number;
  speed?: number;
}

export interface UploadQueue {
  files: Map<string, UploadProgress>;
  activeUploads: Set<string>;
  pausedUploads: Set<string>;
  maxConcurrentUploads: number;
}

// File management types
export interface FileListResponse {
  files: File[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FileFilters {
  search?: string;
  mimeType?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  sizeRange?: {
    min?: number;
    max?: number;
  };
  channelId?: string;
}

export interface FilePreview {
  url: string;
  type: 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'other';
  thumbnail?: string;
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number;
    pages?: number;
  };
}

// WebSocket message types
export interface UploadProgressMessage {
  type: 'upload_progress';
  uploadId: string;
  progress: {
    loaded: number;
    total: number;
    percentage: number;
    status: UploadProgress['status'];
  };
}

export interface UploadCompleteMessage {
  type: 'upload_complete';
  uploadId: string;
  fileId: string;
  file: File;
}

export interface UploadErrorMessage {
  type: 'upload_error';
  uploadId: string;
  error: string;
  retryable: boolean;
}