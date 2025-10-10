import {
  apiService,
  ApiResponse
} from './api';
import {
  UploadProgress,
  UploadQueue,
  UploadSession,
  UploadProgressMessage,
  UploadCompleteMessage,
  UploadErrorMessage
} from '../types';

export class UploadService {
  private queue: UploadQueue = {
    files: new Map(),
    activeUploads: new Set(),
    pausedUploads: new Set(),
    maxConcurrentUploads: 3
  };

  private ws: WebSocket | null = null;
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();
  private completeCallbacks: Map<string, (fileId: string, file: any) => void> = new Map();
  private errorCallbacks: Map<string, (error: string, retryable: boolean) => void> = new Map();
  private CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected for upload progress');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'upload_progress':
            this.handleProgressUpdate(message as UploadProgressMessage);
            break;
          case 'upload_complete':
            this.handleUploadComplete(message as UploadCompleteMessage);
            break;
          case 'upload_error':
            this.handleUploadError(message as UploadErrorMessage);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.initializeWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleProgressUpdate(message: UploadProgressMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.loaded = message.progress.loaded;
      upload.total = message.progress.total;
      upload.percentage = message.progress.percentage;
      upload.status = message.progress.status;

      const callback = this.progressCallbacks.get(message.uploadId);
      if (callback) {
        callback(upload);
      }
    }
  }

  private handleUploadComplete(message: UploadCompleteMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.status = 'completed';
      upload.percentage = 100;

      this.queue.activeUploads.delete(message.uploadId);

      const progressCallback = this.progressCallbacks.get(message.uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      const completeCallback = this.completeCallbacks.get(message.uploadId);
      if (completeCallback) {
        completeCallback(message.fileId, message.file);
      }

      this.cleanupCallbacks(message.uploadId);
      this.processQueue();
    }
  }

  private handleUploadError(message: UploadErrorMessage) {
    const upload = this.queue.files.get(message.uploadId);
    if (upload) {
      upload.status = 'error';
      upload.error = message.error;

      this.queue.activeUploads.delete(message.uploadId);

      const errorCallback = this.errorCallbacks.get(message.uploadId);
      if (errorCallback) {
        errorCallback(message.error, message.retryable);
      }

      // Auto-retry if possible
      if (message.retryable && upload.retryCount < upload.maxRetries) {
        setTimeout(() => {
          this.retryUpload(message.uploadId);
        }, this.RETRY_DELAY * (upload.retryCount + 1));
      } else {
        this.cleanupCallbacks(message.uploadId);
        this.processQueue();
      }
    }
  }

  private cleanupCallbacks(uploadId: string) {
    this.progressCallbacks.delete(uploadId);
    this.completeCallbacks.delete(uploadId);
    this.errorCallbacks.delete(uploadId);
  }

  async startUpload(
    file: File,
    channelId: string,
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (fileId: string, file: any) => void,
    onError?: (error: string, retryable: boolean) => void
  ): Promise<string> {
    // Validate file
    if (!this.validateFile(file)) {
      throw new Error('File validation failed');
    }

    const uploadId = this.generateUploadId();
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

    // Create upload progress entry
    const uploadProgress: UploadProgress = {
      uploadId,
      filename: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
      startTime: new Date().toISOString()
    };

    this.queue.files.set(uploadId, uploadProgress);

    // Store callbacks
    if (onProgress) this.progressCallbacks.set(uploadId, onProgress);
    if (onComplete) this.completeCallbacks.set(uploadId, onComplete);
    if (onError) this.errorCallbacks.set(uploadId, onError);

    // Start upload process
    try {
      await this.initiateUploadSession(uploadId, file, channelId, totalChunks);
      this.processQueue();
    } catch (error) {
      uploadProgress.status = 'error';
      uploadProgress.error = error instanceof Error ? error.message : 'Upload initialization failed';

      const errorCallback = this.errorCallbacks.get(uploadId);
      if (errorCallback) {
        errorCallback(uploadProgress.error, false);
      }
    }

    return uploadId;
  }

  private async initiateUploadSession(
    uploadId: string,
    file: File,
    channelId: string,
    totalChunks: number
  ): Promise<void> {
    const response: ApiResponse<UploadSession> = await apiService.post('/uploads/initiate', {
      uploadId,
      filename: file.name,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      totalChunks,
      channelId
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initiate upload session');
    }
  }

  private async processQueue(): Promise<void> {
    // Process pending uploads if we have capacity
    const pendingUploads = Array.from(this.queue.files.entries())
      .filter(([_, upload]) => upload.status === 'pending')
      .map(([uploadId, _]) => uploadId);

    const availableSlots = this.queue.maxConcurrentUploads - this.queue.activeUploads.size;

    for (let i = 0; i < Math.min(availableSlots, pendingUploads.length); i++) {
      const uploadId = pendingUploads[i];
      this.queue.activeUploads.add(uploadId);
      this.processUpload(uploadId);
    }
  }

  private async processUpload(uploadId: string): Promise<void> {
    const upload = this.queue.files.get(uploadId);
    if (!upload) return;

    upload.status = 'uploading';

    const progressCallback = this.progressCallbacks.get(uploadId);
    if (progressCallback) {
      progressCallback(upload);
    }

    // This would trigger the chunk upload process
    // The actual chunking and upload logic would be handled by the client
    // and communicated via WebSocket
  }

  pauseUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload && (upload.status === 'uploading' || upload.status === 'pending')) {
      upload.status = 'paused';
      this.queue.activeUploads.delete(uploadId);
      this.queue.pausedUploads.add(uploadId);

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }
    }
  }

  resumeUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload && upload.status === 'paused') {
      upload.status = 'pending';
      this.queue.pausedUploads.delete(uploadId);

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      this.processQueue();
    }
  }

  cancelUpload(uploadId: string): void {
    const upload = this.queue.files.get(uploadId);
    if (upload) {
      this.queue.files.delete(uploadId);
      this.queue.activeUploads.delete(uploadId);
      this.queue.pausedUploads.delete(uploadId);
      this.cleanupCallbacks(uploadId);

      // Cancel on server
      apiService.delete(`/uploads/${uploadId}`).catch(console.error);
    }
  }

  async retryUpload(uploadId: string): Promise<void> {
    const upload = this.queue.files.get(uploadId);
    if (upload && upload.status === 'error') {
      upload.status = 'retrying';
      upload.retryCount++;
      upload.error = undefined;

      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback(upload);
      }

      // Reset to pending for queue processing
      upload.status = 'pending';
      this.processQueue();
    }
  }

  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.queue.files.get(uploadId);
  }

  getAllUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values());
  }

  getActiveUploads(): UploadProgress[] {
    return Array.from(this.queue.activeUploads)
      .map(id => this.queue.files.get(id))
      .filter(Boolean) as UploadProgress[];
  }

  getCompletedUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values())
      .filter(upload => upload.status === 'completed');
  }

  getFailedUploads(): UploadProgress[] {
    return Array.from(this.queue.files.values())
      .filter(upload => upload.status === 'error');
  }

  clearCompleted(): void {
    const completedIds = Array.from(this.queue.files.entries())
      .filter(([_, upload]) => upload.status === 'completed')
      .map(([uploadId, _]) => uploadId);

    completedIds.forEach(id => {
      this.queue.files.delete(id);
      this.cleanupCallbacks(id);
    });
  }

  private validateFile(file: File): boolean {
    // File size validation (5GB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return false;
    }

    // File type validation (basic)
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
      // Documents
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Archives
      'application/zip', 'application/x-rar-compressed',
      // Other
      'application/octet-stream'
    ];

    return allowedTypes.includes(file.type) || file.type === '';
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  calculateTimeRemaining(loaded: number, total: number, startTime: string): number {
    if (loaded === 0) return 0;

    const elapsed = Date.now() - new Date(startTime).getTime();
    const rate = loaded / elapsed;
    const remaining = total - loaded;

    return Math.round(remaining / rate);
  }
}

export const uploadService = new UploadService();