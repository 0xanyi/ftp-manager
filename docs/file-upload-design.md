# File Upload Handling Design (Up to 5GB)

## Overview

Handling large file uploads (up to 5GB) requires a robust approach that ensures reliability, progress tracking, and resilience to network interruptions. We'll implement a chunked upload system with resumable capabilities.

## Upload Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   FTP Server    │
│                 │    │                 │    │                 │
│ File Selection  │───►│ Chunk Processing│───►│ File Storage    │
│ Chunk Creation  │    │ Temp Storage    │    │                 │
│ Progress Track  │◄───│ Progress Events │    │                 │
│ Resume Logic    │    │ FTP Transfer    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Metadata DB   │
                       └─────────────────┘
```

## Chunked Upload Strategy

### 1. File Chunking

**Chunk Size Configuration:**
- Default chunk size: 5MB
- Configurable based on file size and network conditions
- Maximum chunks per file: 1000 (for 5GB file with 5MB chunks)

**Chunking Process:**
```javascript
// Frontend chunking logic
function createFileChunks(file, chunkSize = 5 * 1024 * 1024) {
  const chunks = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }
  
  return chunks;
}
```

### 2. Upload Flow

#### Step 1: Initialize Upload
```
POST /api/channels/:slug/files/upload/init
```

**Request Body:**
```json
{
  "filename": "large-audio-file.mp3",
  "fileSize": 5368709120, // 5GB in bytes
  "mimeType": "audio/mpeg",
  "chunkSize": 5242880, // 5MB
  "totalChunks": 1024,
  "checksum": "sha256-hash-of-entire-file"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-upload-id",
    "uploadedChunks": [], // For resume functionality
    "expiresAt": "2023-01-02T00:00:00Z"
  }
}
```

#### Step 2: Upload Chunks
```
POST /api/channels/:slug/files/upload/chunk
```

**Request Body (multipart/form-data):**
- `uploadId`: UUID from initialization
- `chunkIndex`: Index of the chunk (0-based)
- `chunkData`: Binary chunk data
- `chunkChecksum`: SHA-256 hash of this chunk

**Response:**
```json
{
  "success": true,
  "data": {
    "chunkIndex": 0,
    "uploaded": true,
    "uploadedChunks": [0],
    "remainingChunks": 1023
  }
}
```

#### Step 3: Complete Upload
```
POST /api/channels/:slug/files/upload/complete
```

**Request Body:**
```json
{
  "uploadId": "uuid-upload-id",
  "totalChunks": 1024,
  "checksum": "sha256-hash-of-entire-file"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-file-id",
    "filename": "generated-filename.mp3",
    "originalName": "large-audio-file.mp3",
    "size": 5368709120,
    "ftpPath": "/love/generated-filename.mp3"
  }
}
```

## Backend Implementation

### 1. Temporary Storage Strategy

**File System Storage:**
```
/tmp/uploads/
├── upload-id-1/
│   ├── chunk-0
│   ├── chunk-1
│   └── ...
├── upload-id-2/
│   ├── chunk-0
│   └── ...
```

**Database Tracking:**
```sql
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id VARCHAR(255) UNIQUE NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels(id),
    user_id UUID NOT NULL REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    total_chunks INTEGER NOT NULL,
    uploaded_chunks INTEGER[] DEFAULT '{}',
    chunk_size INTEGER NOT NULL,
    checksum VARCHAR(64),
    status VARCHAR(50) DEFAULT 'pending', -- pending, uploading, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
```

### 2. Chunk Processing Service

```javascript
class ChunkUploadService {
  async processChunk(uploadId, chunkIndex, chunkData, checksum) {
    // 1. Verify upload session exists and is valid
    const session = await this.getUploadSession(uploadId);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired upload session');
    }
    
    // 2. Verify chunk checksum
    const calculatedChecksum = this.calculateChecksum(chunkData);
    if (calculatedChecksum !== checksum) {
      throw new Error('Chunk checksum mismatch');
    }
    
    // 3. Save chunk to temporary storage
    const chunkPath = path.join(UPLOAD_DIR, uploadId, `chunk-${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkData);
    
    // 4. Update database with uploaded chunk
    await this.updateUploadedChunks(uploadId, chunkIndex);
    
    // 5. Check if all chunks are uploaded
    const allChunksUploaded = await this.checkAllChunksUploaded(uploadId);
    if (allChunksUploaded) {
      await this.finalizeUpload(uploadId);
    }
    
    return { chunkIndex, uploaded: true };
  }
  
  async finalizeUpload(uploadId) {
    // 1. Get upload session
    const session = await this.getUploadSession(uploadId);
    
    // 2. Combine chunks into complete file
    const filePath = await this.combineChunks(uploadId, session.totalChunks);
    
    // 3. Verify complete file checksum
    const fileChecksum = await this.calculateFileChecksum(filePath);
    if (fileChecksum !== session.checksum) {
      throw new Error('File checksum verification failed');
    }
    
    // 4. Transfer to FTP server
    const ftpPath = await this.transferToFTP(filePath, session);
    
    // 5. Create file record in database
    const fileRecord = await this.createFileRecord(session, ftpPath);
    
    // 6. Clean up temporary files
    await this.cleanupTempFiles(uploadId);
    
    // 7. Update upload session status
    await this.updateUploadStatus(uploadId, 'completed');
    
    return fileRecord;
  }
}
```

### 3. FTP Transfer Service

```javascript
class FTPTransferService {
  async transferFile(filePath, session) {
    const client = new ftp.Client();
    const ftpPath = `${session.channelFtpPath}/${this.generateFilename(session.originalFilename)}`;
    
    try {
      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD
      });
      
      // Ensure directory exists
      await client.ensureDir(session.channelFtpPath);
      
      // Upload file with progress tracking
      await client.uploadFrom(filePath, ftpPath, (progress) => {
        this.emitProgress(session.uploadId, progress);
      });
      
      return ftpPath;
    } catch (error) {
      throw new Error(`FTP transfer failed: ${error.message}`);
    } finally {
      client.close();
    }
  }
}
```

## Frontend Implementation

### 1. Upload Manager

```javascript
class UploadManager {
  constructor(file, channelId, onProgress, onComplete, onError) {
    this.file = file;
    this.channelId = channelId;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
    this.chunks = [];
    this.uploadedChunks = new Set();
    this.uploadId = null;
    this.isPaused = false;
    this.isCancelled = false;
  }
  
  async start() {
    try {
      // 1. Create chunks
      this.chunks = this.createChunks(this.file);
      
      // 2. Initialize upload
      const initResponse = await this.initializeUpload();
      this.uploadId = initResponse.uploadId;
      
      // 3. Check for existing chunks (resume)
      this.uploadedChunks = new Set(initResponse.uploadedChunks || []);
      
      // 4. Start uploading chunks
      await this.uploadChunks();
    } catch (error) {
      this.onError(error);
    }
  }
  
  async uploadChunks() {
    const uploadPromises = [];
    const maxConcurrentUploads = 3; // Limit concurrent uploads
    
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.uploadedChunks.has(i)) {
        continue; // Skip already uploaded chunks
      }
      
      if (this.isCancelled) {
        break;
      }
      
      // Wait for slot in concurrent upload queue
      if (uploadPromises.length >= maxConcurrentUploads) {
        await Promise.race(uploadPromises);
        uploadPromises.splice(uploadPromises.findIndex(p => p.settled), 1);
      }
      
      const uploadPromise = this.uploadChunk(i);
      uploadPromises.push(uploadPromise);
    }
    
    // Wait for all remaining uploads to complete
    await Promise.all(uploadPromises);
    
    if (!this.isCancelled) {
      await this.completeUpload();
    }
  }
  
  async uploadChunk(chunkIndex) {
    if (this.isPaused) {
      await this.waitForResume();
    }
    
    const chunk = this.chunks[chunkIndex];
    const checksum = await this.calculateChecksum(chunk);
    
    try {
      await api.post(`/channels/${this.channelId}/files/upload/chunk`, {
        uploadId: this.uploadId,
        chunkIndex,
        chunkData: chunk,
        checksum
      });
      
      this.uploadedChunks.add(chunkIndex);
      const progress = (this.uploadedChunks.size / this.chunks.length) * 100;
      this.onProgress(progress);
      
      return { chunkIndex, success: true };
    } catch (error) {
      // Retry logic
      if (this.shouldRetry(error)) {
        return this.uploadChunk(chunkIndex);
      }
      throw error;
    }
  }
  
  pause() {
    this.isPaused = true;
  }
  
  resume() {
    this.isPaused = false;
  }
  
  cancel() {
    this.isCancelled = true;
  }
}
```

### 2. Progress Tracking

```javascript
// WebSocket connection for real-time progress
class ProgressTracker {
  constructor(uploadId, onProgress) {
    this.uploadId = uploadId;
    this.onProgress = onProgress;
    this.socket = null;
  }
  
  connect() {
    this.socket = new WebSocket(`ws://localhost:3000/upload-progress`);
    
    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({
        type: 'subscribe',
        uploadId: this.uploadId
      }));
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'upload_progress') {
        this.onProgress(data.data.progress);
      }
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
```

## Error Handling & Recovery

### 1. Network Error Recovery

```javascript
class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
  
  shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      (error.response && error.response.status >= 500)
    );
  }
  
  calculateDelay(attempt) {
    // Exponential backoff with jitter
    return this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }
}
```

### 2. Resume Functionality

```javascript
class UploadResumer {
  async getUploadStatus(uploadId) {
    try {
      const response = await api.get(`/uploads/${uploadId}/status`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Upload session expired or doesn't exist
      }
      throw error;
    }
  }
  
  async resumeUpload(uploadId, file, channelId) {
    const status = await this.getUploadStatus(uploadId);
    
    if (!status) {
      // Start new upload
      return new UploadManager(file, channelId);
    }
    
    // Resume existing upload
    const manager = new UploadManager(file, channelId);
    manager.uploadId = uploadId;
    manager.uploadedChunks = new Set(status.uploadedChunks);
    
    return manager;
  }
}
```

## Security Considerations

### 1. File Validation

```javascript
class FileValidator {
  static validateFile(file, maxSize = 5 * 1024 * 1024 * 1024) { // 5GB
    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024 * 1024)}GB`);
    }
    
    // Check file type (whitelist approach)
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/avi', 'video/mov',
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }
    
    // Scan for malicious content (basic check)
    return this.scanFile(file);
  }
  
  static async scanFile(file) {
    // Basic malware scanning
    // In production, integrate with a proper antivirus solution
    const buffer = await file.slice(0, 1024).arrayBuffer();
    const view = new Uint8Array(buffer);
    
    // Check for common malware signatures
    const suspiciousSignatures = [
      new Uint8Array([0x4D, 0x5A]), // PE executable
      new Uint8Array([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
    ];
    
    for (const signature of suspiciousSignatures) {
      if (this.matchesSignature(view, signature)) {
        throw new Error('File contains suspicious content');
      }
    }
    
    return true;
  }
}
```

### 2. Rate Limiting

```javascript
class UploadRateLimiter {
  constructor(maxUploadsPerHour = 10, maxConcurrentUploads = 3) {
    this.maxUploadsPerHour = maxUploadsPerHour;
    this.maxConcurrentUploads = maxConcurrentUploads;
    this.uploadAttempts = new Map(); // userId -> array of timestamps
    this.activeUploads = new Map(); // userId -> count
  }
  
  async checkUploadLimit(userId) {
    // Check hourly limit
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    if (!this.uploadAttempts.has(userId)) {
      this.uploadAttempts.set(userId, []);
    }
    
    const userAttempts = this.uploadAttempts.get(userId);
    const recentAttempts = userAttempts.filter(timestamp => timestamp > oneHourAgo);
    
    if (recentAttempts.length >= this.maxUploadsPerHour) {
      throw new Error('Upload limit exceeded. Please try again later.');
    }
    
    // Check concurrent limit
    const activeUploads = this.activeUploads.get(userId) || 0;
    if (activeUploads >= this.maxConcurrentUploads) {
      throw new Error('Too many concurrent uploads. Please wait for current uploads to complete.');
    }
    
    // Record this upload attempt
    recentAttempts.push(now);
    this.uploadAttempts.set(userId, recentAttempts);
    
    // Increment active uploads
    this.activeUploads.set(userId, activeUploads + 1);
    
    return () => {
      // Decrement active uploads when done
      const currentActive = this.activeUploads.get(userId) || 0;
      this.activeUploads.set(userId, Math.max(0, currentActive - 1));
    };
  }
}
```

## Performance Optimizations

### 1. Memory Management

```javascript
class MemoryOptimizedUploader {
  constructor() {
    this.maxMemoryUsage = 100 * 1024 * 1024; // 100MB
    this.currentMemoryUsage = 0;
  }
  
  async processChunk(chunk, index) {
    // Check memory usage before processing
    if (this.currentMemoryUsage + chunk.size > this.maxMemoryUsage) {
      await this.waitForMemoryToFree();
    }
    
    this.currentMemoryUsage += chunk.size;
    
    try {
      // Process chunk
      const result = await this.uploadChunk(chunk, index);
      return result;
    } finally {
      // Free memory
      this.currentMemoryUsage -= chunk.size;
    }
  }
  
  async waitForMemoryToFree() {
    // Implement memory pressure handling
    return new Promise(resolve => {
      const checkMemory = () => {
        if (this.currentMemoryUsage < this.maxMemoryUsage * 0.7) {
          resolve();
        } else {
          setTimeout(checkMemory, 100);
        }
      };
      checkMemory();
    });
  }
}
```

### 2. Adaptive Chunk Sizing

```javascript
class AdaptiveChunkSizer {
  constructor() {
    this.baseChunkSize = 5 * 1024 * 1024; // 5MB
    this.minChunkSize = 1 * 1024 * 1024; // 1MB
    this.maxChunkSize = 10 * 1024 * 1024; // 10MB
    this.uploadMetrics = [];
  }
  
  calculateChunkSize(fileSize, networkSpeed) {
    // Adjust chunk size based on file size and network conditions
    let chunkSize = this.baseChunkSize;
    
    // For very large files, use larger chunks
    if (fileSize > 1024 * 1024 * 1024) { // > 1GB
      chunkSize = Math.min(this.maxChunkSize, chunkSize * 2);
    }
    
    // Adjust based on network speed
    if (networkSpeed < 1 * 1024 * 1024) { // < 1MB/s
      chunkSize = Math.max(this.minChunkSize, chunkSize / 2);
    } else if (networkSpeed > 10 * 1024 * 1024) { // > 10MB/s
      chunkSize = Math.min(this.maxChunkSize, chunkSize * 1.5);
    }
    
    return chunkSize;
  }
  
  recordUploadMetric(chunkSize, uploadTime) {
    this.uploadMetrics.push({
      chunkSize,
      uploadTime,
      speed: chunkSize / uploadTime
    });
    
    // Keep only recent metrics
    if (this.uploadMetrics.length > 10) {
      this.uploadMetrics.shift();
    }
  }
  
  getAverageSpeed() {
    if (this.uploadMetrics.length === 0) return 0;
    
    const totalSpeed = this.uploadMetrics.reduce((sum, metric) => sum + metric.speed, 0);
    return totalSpeed / this.uploadMetrics.length;
  }
}
```

This comprehensive file upload design ensures reliable handling of large files up to 5GB with features like chunked uploads, progress tracking, resume functionality, and robust error handling.