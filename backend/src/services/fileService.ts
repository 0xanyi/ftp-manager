import { PrismaClient } from '@prisma/client';
import ftp from 'basic-ftp';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { validateDirectoryPath, sanitizeFilename } from '../utils/fileValidation';

// Global declarations
declare const setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
declare global {
  namespace NodeJS {
    interface Timeout {}
  }
}

export interface UploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface FileUploadOptions {
  filename: string;
  mimeType: string;
  size: number;
  channelId: string;
  uploadedBy: string;
  tempFilePath: string;
}

export class FileService {
  private ftpClient: ftp.Client;
  private activeUploads: Map<string, UploadProgress> = new Map();

  constructor(private prisma: PrismaClient) {
    this.ftpClient = new ftp.Client();
    this.ftpClient.ftp.verbose = process.env.NODE_ENV === 'development';
  }

  /**
   * Establishes connection to FTP server
   */
  async connectToFtp(): Promise<void> {
    try {
      await this.ftpClient.access({
        host: process.env.FTP_HOST!,
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASSWORD!,
        port: parseInt(process.env.FTP_PORT || '21'),
        secure: process.env.FTP_SECURE === 'true',
      });
      
      logger.info('Connected to FTP server');
    } catch (error) {
      logger.error('Failed to connect to FTP server:', error);
      throw new Error('Failed to connect to FTP server');
    }
  }

  /**
   * Disconnects from FTP server
   */
  async disconnectFromFtp(): Promise<void> {
    try {
      this.ftpClient.close();
      logger.info('Disconnected from FTP server');
    } catch (error) {
      logger.error('Error disconnecting from FTP server:', error);
    }
  }

  /**
   * Uploads a file to FTP server
   */
  async uploadToFtp(options: FileUploadOptions): Promise<string> {
    const uploadId = uuidv4();
    const sanitizedFilename = sanitizeFilename(options.filename);
    
    // Get channel information
    const channel = await this.prisma.channel.findUnique({
      where: { id: options.channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Validate directory path
    const pathValidation = validateDirectoryPath(channel.ftpPath);
    if (!pathValidation.isValid) {
      throw new Error(pathValidation.error);
    }

    const ftpPath = path.posix.join(channel.ftpPath, sanitizedFilename);
    
    // Initialize progress tracking
    const progress: UploadProgress = {
      uploadId,
      filename: sanitizedFilename,
      progress: 0,
      bytesUploaded: 0,
      totalBytes: options.size,
      status: 'uploading',
    };
    
    this.activeUploads.set(uploadId, progress);

    try {
      await this.connectToFtp();
      
      // Ensure directory exists on FTP server
      await this.ftpClient.ensureDir(channel.ftpPath);
      
      // Upload file with progress tracking
      await this.ftpClient.uploadFrom(
        options.tempFilePath,
        ftpPath,
        {
          progress: (bytesTransferred) => {
            progress.bytesUploaded = bytesTransferred;
            progress.progress = (bytesTransferred / options.totalBytes) * 100;
            logger.info(`Upload progress for ${sanitizedFilename}: ${progress.progress.toFixed(2)}%`);
          },
        }
      );
      
      progress.status = 'processing';
      logger.info(`Successfully uploaded file to FTP: ${ftpPath}`);
      
      // Store file metadata in database
      const fileRecord = await this.prisma.file.create({
        data: {
          id: uploadId,
          filename: sanitizedFilename,
          originalName: options.filename,
          mimeType: options.mimeType,
          size: BigInt(options.size),
          ftpPath,
          channelId: options.channelId,
          uploadedBy: options.uploadedBy,
          uploadedByGuest: false,
        },
      });
      
      progress.status = 'completed';
      progress.progress = 100;
      
      logger.info(`File metadata stored in database: ${fileRecord.id}`);
      
      return fileRecord.id;
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error uploading file to FTP:', error);
      throw error;
    } finally {
      await this.disconnectFromFtp();
      
      // Clean up temporary file
      try {
        await fs.remove(options.tempFilePath);
        logger.info(`Cleaned up temporary file: ${options.tempFilePath}`);
      } catch (error) {
        logger.error('Error cleaning up temporary file:', error);
      }
      
      // Remove progress tracking after completion
      setTimeout(() => {
        this.activeUploads.delete(uploadId);
      }, 60000); // Keep progress info for 1 minute
    }
  }

  /**
   * Downloads a file from FTP server
   */
  async downloadFromFtp(fileId: string, _userId: string): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { channel: true },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check user permissions (simplified - should be enhanced based on channel access)
      // For now, we'll assume user has access if they're authenticated
      logger.info(`User ${_userId} downloading file ${fileId}`);

      // Create temporary download path
      const tempDir = path.join(process.cwd(), 'temp', 'downloads');
      await fs.ensureDir(tempDir);
      
      const tempFilePath = path.join(tempDir, `${fileId}_${path.basename(file.filename)}`);

      await this.connectToFtp();
      
      // Download file from FTP
      await this.ftpClient.downloadTo(tempFilePath, file.ftpPath);
      
      logger.info(`Successfully downloaded file from FTP: ${file.ftpPath}`);
      
      return {
        filePath: tempFilePath,
        filename: file.originalName,
        mimeType: file.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      logger.error('Error downloading file from FTP:', error);
      throw error;
    } finally {
      await this.disconnectFromFtp();
    }
  }

  /**
   * Deletes a file from FTP server and database
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      // Get file information
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Delete from FTP server
      await this.connectToFtp();
      
      try {
        await this.ftpClient.remove(file.ftpPath);
        logger.info(`Successfully deleted file from FTP: ${file.ftpPath}`);
      } catch (error) {
        logger.error('Error deleting file from FTP:', error);
        // Continue with database deletion even if FTP deletion fails
      }
      
      // Delete from database
      await this.prisma.file.delete({
        where: { id: fileId },
      });
      
      logger.info(`Successfully deleted file from database: ${fileId}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    } finally {
      await this.disconnectFromFtp();
    }
  }

  /**
   * Gets upload progress for a specific upload
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.activeUploads.get(uploadId);
  }

  /**
   * Lists files in a channel with pagination
   */
  async listChannelFiles(
    channelId: string, 
    page: number = 1, 
    limit: number = 20,
    userId: string
  ) {
    const skip = (page - 1) * limit;
    
    // Check if user has access to the channel
    // This is a simplified check - should be enhanced with proper role-based access
    const userChannel = await this.prisma.userChannel.findFirst({
      where: {
        userId,
        channelId,
      },
    });

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.isActive) {
      throw new Error('Channel not found or inactive');
    }

    // If user is not assigned to channel, check if they're admin
    if (!userChannel) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Access denied to this channel');
      }
    }
    
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          channelId,
          isActive: true,
        },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({
        where: {
          channelId,
          isActive: true,
        },
      }),
    ]);
    
    return {
      files: files.map(file => ({
        ...file,
        size: file.size.toString(), // Convert BigInt to string for JSON serialization
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Searches files in a channel
   */
  async searchChannelFiles(
    channelId: string,
    query: string,
    page: number = 1,
    limit: number = 20,
    userId: string
  ) {
    const skip = (page - 1) * limit;
    
    // Similar access check as listChannelFiles
    const userChannel = await this.prisma.userChannel.findFirst({
      where: { userId, channelId },
    });

    if (!userChannel) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Access denied to this channel');
      }
    }
    
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          channelId,
          isActive: true,
          OR: [
            { filename: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({
        where: {
          channelId,
          isActive: true,
          OR: [
            { filename: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);
    
    return {
      files: files.map(file => ({
        ...file,
        size: file.size.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
