# FTP Integration & File Synchronization Design

## Overview

The FTP integration component is responsible for securely transferring files between our application and the FTP server. It handles file uploads, downloads, directory management, and synchronization of file metadata between the FTP server and our database.

## FTP Connection Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Backend API   │    │  FTP Service    │    │   FTP Server    │
│                 │    │                 │    │                 │
│ File Operations │───►│ Connection Pool │───►│   File Storage  │
│ Metadata Sync   │◄───│ Queue Manager   │◄───│   Directory     │
│ Progress Track  │    │ Error Handler   │    │   Structure     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Metadata DB   │
                       └─────────────────┘
```

## FTP Service Design

### 1. Connection Management

```javascript
class FTPConnectionManager {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 21,
      user: config.user,
      password: config.password,
      secure: config.secure || false,
      secureOptions: config.secureOptions || {},
      connTimeout: config.connTimeout || 10000,
      pasvTimeout: config.pasvTimeout || 10000,
      aliveTimeout: config.aliveTimeout || 60000
    };
    
    this.connectionPool = new Map();
    this.maxConnections = config.maxConnections || 5;
    this.activeConnections = 0;
  }
  
  async getConnection() {
    // Check if we have available connections in the pool
    if (this.connectionPool.size > 0) {
      const connection = this.connectionPool.values().next().value;
      this.connectionPool.delete(connection.id);
      
      // Verify connection is still alive
      if (await this.isConnectionAlive(connection)) {
        return connection;
      } else {
        // Connection is dead, create a new one
        await this.closeConnection(connection);
      }
    }
    
    // Check if we can create a new connection
    if (this.activeConnections >= this.maxConnections) {
      throw new Error('Maximum FTP connections reached');
    }
    
    // Create new connection
    return await this.createConnection();
  }
  
  async createConnection() {
    const ftp = new Client();
    const connectionId = this.generateConnectionId();
    
    try {
      await ftp.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure,
        secureOptions: this.config.secureOptions
      });
      
      // Set connection timeouts
      ftp.ftp.connTimeout = this.config.connTimeout;
      ftp.ftp.pasvTimeout = this.config.pasvTimeout;
      ftp.ftp.aliveTimeout = this.config.aliveTimeout;
      
      const connection = {
        id: connectionId,
        client: ftp,
        createdAt: new Date(),
        lastUsed: new Date()
      };
      
      this.activeConnections++;
      return connection;
    } catch (error) {
      this.activeConnections--;
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }
  
  async releaseConnection(connection) {
    if (!connection) return;
    
    connection.lastUsed = new Date();
    
    // Check if connection is still healthy
    if (await this.isConnectionAlive(connection)) {
      this.connectionPool.set(connection.id, connection);
    } else {
      await this.closeConnection(connection);
    }
  }
  
  async isConnectionAlive(connection) {
    try {
      await connection.client.list();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async closeConnection(connection) {
    if (connection && connection.client) {
      try {
        connection.client.close();
      } catch (error) {
        console.error('Error closing FTP connection:', error);
      } finally {
        this.activeConnections--;
      }
    }
  }
  
  generateConnectionId() {
    return `ftp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. File Transfer Service

```javascript
class FTPFileService {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }
  
  async uploadFile(localPath, remotePath, options = {}) {
    const connection = await this.connectionManager.getConnection();
    
    try {
      // Ensure remote directory exists
      const remoteDir = path.dirname(remotePath);
      await this.ensureDirectoryExists(connection, remoteDir);
      
      // Upload file with progress tracking
      const stats = await fs.stat(localPath);
      let bytesTransferred = 0;
      
      const progressCallback = options.onProgress || (() => {});
      
      await connection.client.uploadFrom(localPath, remotePath, (info) => {
        bytesTransferred = info.bytes;
        const progress = (bytesTransferred / stats.size) * 100;
        progressCallback(progress, bytesTransferred, stats.size);
      });
      
      // Verify file was uploaded successfully
      const remoteStats = await connection.client.size(remotePath);
      if (remoteStats !== stats.size) {
        throw new Error('File verification failed: size mismatch');
      }
      
      return {
        success: true,
        remotePath,
        size: stats.size,
        bytesTransferred
      };
    } finally {
      await this.connectionManager.releaseConnection(connection);
    }
  }
  
  async downloadFile(remotePath, localPath, options = {}) {
    const connection = await this.connectionManager.getConnection();
    
    try {
      // Get remote file info
      const remoteSize = await connection.client.size(remotePath);
      
      // Ensure local directory exists
      const localDir = path.dirname(localPath);
      await fs.ensureDir(localDir);
      
      // Download file with progress tracking
      let bytesTransferred = 0;
      
      const progressCallback = options.onProgress || (() => {});
      
      await connection.client.downloadTo(localPath, remotePath, (info) => {
        bytesTransferred = info.bytes;
        const progress = (bytesTransferred / remoteSize) * 100;
        progressCallback(progress, bytesTransferred, remoteSize);
      });
      
      // Verify file was downloaded successfully
      const localStats = await fs.stat(localPath);
      if (localStats.size !== remoteSize) {
        throw new Error('File verification failed: size mismatch');
      }
      
      return {
        success: true,
        localPath,
        size: localStats.size,
        bytesTransferred
      };
    } finally {
      await this.connectionManager.releaseConnection(connection);
    }
  }
  
  async deleteFile(remotePath) {
    const connection = await this.connectionManager.getConnection();
    
    try {
      await connection.client.remove(remotePath);
      return { success: true, remotePath };
    } finally {
      await this.connectionManager.releaseConnection(connection);
    }
  }
  
  async ensureDirectoryExists(connection, dirPath) {
    const pathParts = dirPath.split('/').filter(part => part.length > 0);
    let currentPath = '';
    
    for (const part of pathParts) {
      currentPath += '/' + part;
      
      try {
        await connection.client.cd(currentPath);
      } catch (error) {
        // Directory doesn't exist, create it
        await connection.client.mkdir(currentPath);
        await connection.client.cd(currentPath);
      }
    }
  }
  
  async listFiles(remotePath) {
    const connection = await this.connectionManager.getConnection();
    
    try {
      const files = await connection.client.list(remotePath);
      
      return files.map(file => ({
        name: file.name,
        type: file.type, // 'd' for directory, '-' for file
        size: file.size,
        modifiedAt: file.modifiedAt,
        path: path.join(remotePath, file.name)
      }));
    } finally {
      await this.connectionManager.releaseConnection(connection);
    }
  }
}
```

### 3. Synchronization Service

```javascript
class FTPSyncService {
  constructor(ftpService, databaseService) {
    this.ftpService = ftpService;
    this.databaseService = databaseService;
  }
  
  async syncChannel(channelId) {
    // Get channel info from database
    const channel = await this.databaseService.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    // Get files from FTP server
    const ftpFiles = await this.ftpService.listFiles(channel.ftpPath);
    
    // Get files from database
    const dbFiles = await this.databaseService.getChannelFiles(channelId);
    
    // Compare and sync
    const syncResult = await this.compareAndSync(channel, ftpFiles, dbFiles);
    
    return syncResult;
  }
  
  async compareAndSync(channel, ftpFiles, dbFiles) {
    const result = {
      added: [],
      updated: [],
      deleted: [],
      errors: []
    };
    
    // Create lookup maps
    const ftpFileMap = new Map(ftpFiles.map(file => [file.name, file]));
    const dbFileMap = new Map(dbFiles.map(file => [file.filename, file]));
    
    // Check for new or updated files in FTP
    for (const [filename, ftpFile] of ftpFileMap) {
      if (ftpFile.type === 'd') continue; // Skip directories
      
      const dbFile = dbFileMap.get(filename);
      
      if (!dbFile) {
        // New file in FTP, add to database
        try {
          const newFile = await this.addFileToDatabase(channel, ftpFile);
          result.added.push(newFile);
        } catch (error) {
          result.errors.push({
            type: 'add',
            filename,
            error: error.message
          });
        }
      } else if (this.isFileModified(ftpFile, dbFile)) {
        // File modified in FTP, update database
        try {
          const updatedFile = await this.updateFileInDatabase(channel, ftpFile, dbFile);
          result.updated.push(updatedFile);
        } catch (error) {
          result.errors.push({
            type: 'update',
            filename,
            error: error.message
          });
        }
      }
    }
    
    // Check for files in database but not in FTP
    for (const [filename, dbFile] of dbFileMap) {
      if (!ftpFileMap.has(filename)) {
        // File exists in database but not in FTP
        try {
          await this.markFileAsDeleted(dbFile.id);
          result.deleted.push(dbFile);
        } catch (error) {
          result.errors.push({
            type: 'delete',
            filename,
            error: error.message
          });
        }
      }
    }
    
    return result;
  }
  
  isFileModified(ftpFile, dbFile) {
    // Compare modification time and size
    const ftpModifiedTime = new Date(ftpFile.modifiedAt);
    const dbModifiedTime = new Date(dbFile.updatedAt);
    
    return ftpModifiedTime > dbModifiedTime || ftpFile.size !== dbFile.size;
  }
  
  async addFileToDatabase(channel, ftpFile) {
    const fileData = {
      filename: ftpFile.name,
      originalName: ftpFile.name,
      size: ftpFile.size,
      ftpPath: path.join(channel.ftpPath, ftpFile.name),
      channelId: channel.id,
      mimeType: await this.getMimeType(ftpFile.name),
      createdAt: new Date(ftpFile.modifiedAt),
      updatedAt: new Date(ftpFile.modifiedAt)
    };
    
    return await this.databaseService.createFile(fileData);
  }
  
  async updateFileInDatabase(channel, ftpFile, dbFile) {
    const updateData = {
      size: ftpFile.size,
      updatedAt: new Date(ftpFile.modifiedAt)
    };
    
    return await this.databaseService.updateFile(dbFile.id, updateData);
  }
  
  async markFileAsDeleted(fileId) {
    return await this.databaseService.updateFile(fileId, {
      isActive: false,
      updatedAt: new Date()
    });
  }
  
  async getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/mov',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
```

### 4. Queue Management for FTP Operations

```javascript
class FTPOperationQueue {
  constructor(ftpService, concurrency = 3) {
    this.ftpService = ftpService;
    this.concurrency = concurrency;
    this.queue = [];
    this.running = 0;
    this.results = new Map();
  }
  
  async addOperation(operation) {
    const operationId = this.generateOperationId();
    const queuedOperation = {
      id: operationId,
      type: operation.type, // 'upload', 'download', 'delete', 'sync'
      data: operation.data,
      priority: operation.priority || 0,
      attempts: 0,
      maxAttempts: operation.maxAttempts || 3,
      createdAt: new Date()
    };
    
    this.queue.push(queuedOperation);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.processQueue();
    
    return operationId;
  }
  
  async processQueue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    const operation = this.queue.shift();
    this.running++;
    
    try {
      const result = await this.executeOperation(operation);
      this.results.set(operation.id, {
        success: true,
        data: result,
        completedAt: new Date()
      });
    } catch (error) {
      operation.attempts++;
      
      if (operation.attempts < operation.maxAttempts) {
        // Retry the operation
        this.queue.push(operation);
      } else {
        // Mark as failed
        this.results.set(operation.id, {
          success: false,
          error: error.message,
          completedAt: new Date()
        });
      }
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  async executeOperation(operation) {
    switch (operation.type) {
      case 'upload':
        return await this.ftpService.uploadFile(
          operation.data.localPath,
          operation.data.remotePath,
          operation.data.options
        );
      
      case 'download':
        return await this.ftpService.downloadFile(
          operation.data.remotePath,
          operation.data.localPath,
          operation.data.options
        );
      
      case 'delete':
        return await this.ftpService.deleteFile(operation.data.remotePath);
      
      case 'sync':
        return await this.ftpService.syncChannel(operation.data.channelId);
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
  
  getOperationStatus(operationId) {
    return this.results.get(operationId);
  }
  
  generateOperationId() {
    return `ftp-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 5. Error Handling & Recovery

```javascript
class FTPErrorHandler {
  constructor() {
    this.errorTypes = {
      CONNECTION_ERROR: 'connection_error',
      AUTHENTICATION_ERROR: 'authentication_error',
      FILE_NOT_FOUND: 'file_not_found',
      PERMISSION_DENIED: 'permission_denied',
      DISK_FULL: 'disk_full',
      TIMEOUT_ERROR: 'timeout_error',
      NETWORK_ERROR: 'network_error'
    };
  }
  
  handleError(error, context = {}) {
    const errorInfo = {
      type: this.classifyError(error),
      message: error.message,
      code: error.code,
      context,
      timestamp: new Date()
    };
    
    // Log error
    this.logError(errorInfo);
    
    // Return appropriate response
    return this.createErrorResponse(errorInfo);
  }
  
  classifyError(error) {
    if (error.code === 530) {
      return this.errorTypes.AUTHENTICATION_ERROR;
    } else if (error.code === 550) {
      return this.errorTypes.FILE_NOT_FOUND;
    } else if (error.code === 553) {
      return this.errorTypes.PERMISSION_DENIED;
    } else if (error.code === 552) {
      return this.errorTypes.DISK_FULL;
    } else if (error.message.includes('timeout')) {
      return this.errorTypes.TIMEOUT_ERROR;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return this.errorTypes.NETWORK_ERROR;
    } else {
      return this.errorTypes.CONNECTION_ERROR;
    }
  }
  
  logError(errorInfo) {
    console.error('FTP Error:', errorInfo);
    
    // In production, send to logging service
    // this.loggingService.logError(errorInfo);
  }
  
  createErrorResponse(errorInfo) {
    const responses = {
      [this.errorTypes.AUTHENTICATION_ERROR]: {
        statusCode: 401,
        message: 'FTP authentication failed. Please check your credentials.',
        retryable: false
      },
      [this.errorTypes.FILE_NOT_FOUND]: {
        statusCode: 404,
        message: 'File not found on FTP server.',
        retryable: false
      },
      [this.errorTypes.PERMISSION_DENIED]: {
        statusCode: 403,
        message: 'Permission denied. Check FTP server permissions.',
        retryable: false
      },
      [this.errorTypes.DISK_FULL]: {
        statusCode: 507,
        message: 'FTP server storage is full.',
        retryable: false
      },
      [this.errorTypes.TIMEOUT_ERROR]: {
        statusCode: 408,
        message: 'FTP operation timed out.',
        retryable: true
      },
      [this.errorTypes.NETWORK_ERROR]: {
        statusCode: 503,
        message: 'Network error connecting to FTP server.',
        retryable: true
      },
      [this.errorTypes.CONNECTION_ERROR]: {
        statusCode: 502,
        message: 'Error connecting to FTP server.',
        retryable: true
      }
    };
    
    return responses[errorInfo.type] || {
      statusCode: 500,
      message: 'Unknown FTP error occurred.',
      retryable: false
    };
  }
}
```

## Configuration Management

```javascript
// config/ftp.js
module.exports = {
  host: process.env.FTP_HOST,
  port: process.env.FTP_PORT || 21,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: process.env.FTP_SECURE === 'true',
  secureOptions: {
    rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false'
  },
  connTimeout: parseInt(process.env.FTP_CONN_TIMEOUT) || 10000,
  pasvTimeout: parseInt(process.env.FTP_PASV_TIMEOUT) || 10000,
  aliveTimeout: parseInt(process.env.FTP_ALIVE_TIMEOUT) || 60000,
  maxConnections: parseInt(process.env.FTP_MAX_CONNECTIONS) || 5,
  operationConcurrency: parseInt(process.env.FTP_OPERATION_CONCURRENCY) || 3,
  retryAttempts: parseInt(process.env.FTP_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.FTP_RETRY_DELAY) || 1000
};
```

## Monitoring & Health Checks

```javascript
class FTPHealthMonitor {
  constructor(ftpService) {
    this.ftpService = ftpService;
    this.healthStatus = {
      isHealthy: false,
      lastCheck: null,
      responseTime: null,
      error: null
    };
  }
  
  async checkHealth() {
    const startTime = Date.now();
    
    try {
      // Try to list root directory
      await this.ftpService.listFiles('/');
      
      this.healthStatus = {
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: null
      };
    } catch (error) {
      this.healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
    
    return this.healthStatus;
  }
  
  getHealthStatus() {
    return this.healthStatus;
  }
  
  startHealthCheck(interval = 60000) {
    // Check health every minute
    setInterval(() => {
      this.checkHealth();
    }, interval);
    
    // Initial check
    this.checkHealth();
  }
}
```

This FTP integration design provides a robust, scalable solution for handling file transfers between your application and the FTP server, with features like connection pooling, queue management, error handling, and synchronization capabilities.