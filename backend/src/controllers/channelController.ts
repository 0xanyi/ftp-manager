import { Request, Response } from 'express';
import { ChannelService } from '../services/channelService';
import { prisma } from '../app';
import { ApiResponse } from '../types';

const channelService = new ChannelService(prisma);

/**
 * Create a new channel (Admin only)
 */
export const createChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, ftpPath } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Channel name is required'
        }
      } as ApiResponse);
      return;
    }

    const result = await channelService.createChannel({
      name: name.trim(),
      description: description?.trim(),
      ftpPath: ftpPath?.trim()
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get all channels (Admin only)
 */
export const getAllChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));

    const result = await channelService.getAllChannels(validPage, validLimit);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all channels error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get channel by ID
 */
export const getChannelById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as { user?: { id: string } }).user?.id;

    const result = await channelService.getChannelById(id, userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Get channel by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get channels accessible to the current user
 */
export const getUserChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as { user?: { id: string } }).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    const result = await channelService.getUserChannels(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get user channels error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Update channel (Admin only)
 */
export const updateChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, ftpPath } = req.body;

    // Validate that at least one field is provided
    if (!name && !description && !ftpPath) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one field must be provided for update'
        }
      } as ApiResponse);
      return;
    }

    const updateData: { name?: string; description?: string; ftpPath?: string } = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Channel name cannot be empty'
          }
        } as ApiResponse);
        return;
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim();
    }
    if (ftpPath !== undefined) {
      updateData.ftpPath = ftpPath?.trim();
    }

    const result = await channelService.updateChannel(id, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Delete channel (Admin only)
 */
export const deleteChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await channelService.deleteChannel(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Assign user to channel (Admin only)
 */
export const assignUserToChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, channelId } = req.body;
    const assignedBy = (req as { user?: { id: string } }).user?.id;

    if (!userId || !channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID and Channel ID are required'
        }
      } as ApiResponse);
      return;
    }

    if (!assignedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    const result = await channelService.assignUserToChannel(userId, channelId, assignedBy);

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Assign user to channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Remove user from channel (Admin only)
 */
export const removeUserFromChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, channelId } = req.body;

    if (!userId || !channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID and Channel ID are required'
        }
      } as ApiResponse);
      return;
    }

    const result = await channelService.removeUserFromChannel(userId, channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Remove user from channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get users assigned to a channel
 */
export const getChannelUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const currentUserId = (req as { user?: { id: string } }).user?.id;
    const currentUserRole = (req as { user?: { role: string } }).user?.role;

    // Verify channel exists and user has access
    const channelResult = await channelService.getChannelById(channelId, currentUserId);
    if (!channelResult.success) {
      const statusCode = channelResult.error?.code === 'NOT_FOUND' ? 404 : 
                        channelResult.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(channelResult);
      return;
    }

    // Only admins can view channel users
    if (currentUserRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Admin access required'
        }
      } as ApiResponse);
      return;
    }

    const result = await channelService.getChannelUsers(channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get channel users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get available users for channel assignment
 */
export const getAvailableUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;

    const result = await channelService.getAvailableUsers(channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};
