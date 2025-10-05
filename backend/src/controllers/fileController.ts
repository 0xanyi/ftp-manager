import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../app';
import { FileService } from '../services/fileService';
import { UploadService } from '../services/uploadService';
import { websocketService } from '../services/websocketService';
import logger from '../utils/logger';
import Joi from 'joi';

// Initialize services
const fileService = new FileService(prisma);
const uploadService = new UploadService();

// Configure multer for chunked uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per chunk
  },
});

// Validation schemas
const initializeUploadSchema = Joi.object({
  filename: Joi.string().required().max(255),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().positive().required().max(5 * 1024 * 1024 * 1024), // 5GB
  channelId: Joi.string().uuid().required(),
});

const chunkUploadSchema = Joi.object({
  uploadId: Joi.string().uuid().required(),
  chunkIndex: Joi.number().integer().min(0).required(),
  totalChunks: Joi.number().integer().positive().required(),
  chunkSize: Joi.number().integer().positive().required(),
  totalSize: Joi.number().integer().positive().required(),
  filename: Joi.string().required().max(255),
  mimeType: Joi.string().required(),
  channelId: Joi.string().uuid().required(),
});

const listFilesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  channelId: Joi.string().uuid().required(),
});

const searchFilesSchema = Joi.object({
  query: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  channelId: Joi.string().uuid().required(),
});

/**
 * Initialize a new file upload session
 */
export const initializeUpload = async (req: Request, res: Response) => {
  try {
    const { error, value } = initializeUploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { filename, mimeType, size, channelId } = value;
    const userId = req.user!.id;

    // Verify channel exists and user has access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found or inactive',
      });
    }

    // Check user permissions (simplified check)
    const userChannel = await prisma.userChannel.findFirst({
      where: { userId, channelId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userChannel && user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this channel',
      });
    }

    const result = await uploadService.initializeUpload(
      filename,
      mimeType,
      size,
      channelId,
      userId
    );

    logger.info(`Upload initialized: ${result.uploadId} by user ${userId}`);

    // Broadcast WebSocket notification
    websocketService.broadcastUploadProgress(userId, result.uploadId, {
      status: 'initialized',
      filename,
      size,
      totalChunks: result.totalChunks,
      progress: 0,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error initializing upload:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize upload',
    });
  }
};

/**
 * Upload a file chunk
 */
export const uploadChunk = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = chunkUploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file chunk provided',
      });
    }

    const {
      uploadId,
      chunkIndex,
      totalChunks,
      chunkSize,
      totalSize,
      filename,
      mimeType,
      channelId,
    } = value;

    const userId = req.user!.id;

    // Verify channel access (simplified)
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found or inactive',
      });
    }

    const result = await uploadService.uploadChunk(
      req.file.buffer,
      uploadId,
      chunkIndex,
      totalChunks,
      chunkSize,
      totalSize,
      filename,
      mimeType,
      channelId,
      userId
    );

    if (result.uploadComplete) {
      // Upload is complete, now transfer to FTP
      const uploadData = await uploadService.completeUpload(uploadId);
      
      // Broadcast completion status
      websocketService.broadcastUploadProgress(userId, uploadId, {
        status: 'processing',
        progress: 100,
        message: 'Upload complete, transferring to FTP...',
      });
      
      try {
        const fileId = await fileService.uploadToFtp({
          filename: uploadData.filename,
          mimeType: uploadData.mimeType,
          size: uploadData.size,
          channelId: uploadData.channelId,
          uploadedBy: uploadData.uploadedBy,
          tempFilePath: uploadData.tempFilePath,
        });

        logger.info(`File uploaded successfully: ${fileId}`);

        // Broadcast successful completion
        websocketService.broadcastUploadComplete(userId, uploadId, fileId);

        res.json({
          success: true,
          uploadComplete: true,
          fileId,
          message: 'File uploaded and transferred to FTP successfully',
        });
      } catch (ftpError) {
        logger.error('Error transferring file to FTP:', ftpError);
        
        // Broadcast error
        websocketService.broadcastUploadError(userId, uploadId, 
          ftpError instanceof Error ? ftpError.message : 'FTP transfer failed'
        );
        
        res.status(500).json({
          success: false,
          error: 'Upload completed but FTP transfer failed',
          details: ftpError instanceof Error ? ftpError.message : 'Unknown FTP error',
        });
      }
    } else {
      // Broadcast chunk upload progress
      const progress = ((chunkIndex + 1) / totalChunks) * 100;
      websocketService.broadcastUploadProgress(userId, uploadId, {
        status: 'uploading',
        chunkIndex: chunkIndex + 1,
        totalChunks,
        progress,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      });

      res.json({
        success: true,
        uploadComplete: false,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      });
    }
  } catch (error) {
    logger.error('Error uploading chunk:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload chunk',
    });
  }
};

/**
 * Get upload progress
 */
export const getUploadProgress = async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.id;

    const progress = await uploadService.getUploadProgress(uploadId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found or expired',
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    logger.error('Error getting upload progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload progress',
    });
  }
};

/**
 * Cancel an upload
 */
export const cancelUpload = async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;

    await uploadService.cancelUpload(uploadId);

    logger.info(`Upload cancelled: ${uploadId} by user ${req.user!.id}`);

    res.json({
      success: true,
      message: 'Upload cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel upload',
    });
  }
};

/**
 * List files in a channel
 */
export const listFiles = async (req: Request, res: Response) => {
  try {
    const { error, value } = listFilesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { page, limit, channelId } = value;
    const userId = req.user!.id;

    const result = await fileService.listChannelFiles(channelId, page, limit, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    });
  }
};

/**
 * Search files in a channel
 */
export const searchFiles = async (req: Request, res: Response) => {
  try {
    const { error, value } = searchFilesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { query, page, limit, channelId } = value;
    const userId = req.user!.id;

    const result = await fileService.searchChannelFiles(channelId, query, page, limit, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search files',
    });
  }
};

/**
 * Download a file
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const fileInfo = await fileService.downloadFromFtp(fileId, userId);

    res.download(fileInfo.filePath, fileInfo.filename, (err) => {
      if (err) {
        logger.error('Error sending file to client:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error downloading file',
          });
        }
      } else {
        // Clean up temporary file after download
        fs.unlink(fileInfo.filePath, (unlinkErr) => {
          if (unlinkErr) {
            logger.error('Error cleaning up temporary file:', unlinkErr);
          }
        });
      }
    });
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file',
    });
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    await fileService.deleteFile(fileId, userId);

    logger.info(`File deleted: ${fileId} by user ${userId}`);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    });
  }
};

// Export upload middleware
export const uploadMiddleware = upload.single('chunk');
