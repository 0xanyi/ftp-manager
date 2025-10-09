import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import { registerSchema, userUpdateSchema } from '../utils/validation';
import auditService from '../services/auditService';

/**
 * Get list of users with pagination and filtering
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      role = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = 'true'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      isActive: isActive === 'true'
    };

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              userChannels: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch users', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        userChannels: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: {
            uploadedFiles: true,
            userChannels: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    await auditService.recordEvent({
      action: 'USER_VIEW',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        targetUserId: user.id,
        targetEmail: user.email,
      },
      ipAddress: req.ip,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'VALIDATION_ERROR');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    await auditService.recordEvent({
      action: 'USER_CREATE',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        newUserEmail: user.email,
        role: user.role,
      },
      ipAddress: req.ip,
    });

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to create user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update user
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // If updating email, check for duplicates
    if (value.email && value.email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: value.email }
      });

      if (duplicateUser) {
        throw new AppError('User with this email already exists', 409, 'VALIDATION_ERROR');
      }
    }

    // If updating password, hash it
    let updateData: any = { ...value };
    if (value.password) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(value.password, saltRounds);
      delete updateData.password;
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Prevent deactivating the last admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
          isActive: true
        }
      });

      if (adminCount <= 1) {
        throw new AppError('Cannot deactivate the last admin user', 400, 'VALIDATION_ERROR');
      }
    }

    // Deactivate user
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    await auditService.recordEvent({
      action: 'USER_DEACTIVATE',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      entityType: 'USER',
      entityId: id,
      metadata: {
        targetEmail: existingUser.email,
      },
      ipAddress: req.ip,
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'User deactivated successfully' }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to deactivate user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Reactivate user
 */
export const reactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Reactivate user
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    await auditService.recordEvent({
      action: 'USER_REACTIVATE',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        targetEmail: user.email,
      },
      ipAddress: req.ip,
    });

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to reactivate user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get user's channel assignments
 */
export const getUserChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Get user channels
    const userChannels = await prisma.userChannel.findMany({
      where: { userId: id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    // Get all available channels for assignment
    const allChannels = await prisma.channel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true
      }
    });

    const assignedChannelIds = userChannels.map(uc => uc.channelId);

    const response: ApiResponse = {
      success: true,
      data: {
        assignedChannels: userChannels.map(uc => uc.channel),
        availableChannels: allChannels.filter(ch => !assignedChannelIds.includes(ch.id))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch user channels', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update user's channel assignments
 */
export const updateUserChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { channelIds } = req.body;

    if (!Array.isArray(channelIds)) {
      throw new AppError('channelIds must be an array', 400, 'VALIDATION_ERROR');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Get current channel assignments
    const currentAssignments = await prisma.userChannel.findMany({
      where: { userId: id },
      select: { channelId: true }
    });

    const currentChannelIds = currentAssignments.map(ua => ua.channelId);

    // Calculate additions and removals
    const toAdd = channelIds.filter(id => !currentChannelIds.includes(id));
    const toRemove = currentChannelIds.filter(id => !channelIds.includes(id));

    // Use transaction for atomic updates
    await prisma.$transaction(async (tx) => {
      // Remove old assignments
      if (toRemove.length > 0) {
        await tx.userChannel.deleteMany({
          where: {
            userId: id,
            channelId: { in: toRemove }
          }
        });
      }

      // Add new assignments
      if (toAdd.length > 0) {
        await tx.userChannel.createMany({
          data: toAdd.map(channelId => ({
            userId: id,
            channelId,
            assignedBy: req.user!.id
          }))
        });
      }
    });

    // Get updated assignments
    const updatedAssignments = await prisma.userChannel.findMany({
      where: { userId: id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Channel assignments updated successfully',
        assignedChannels: updatedAssignments.map(ua => ua.channel)
      }
    };

    await auditService.recordEvent({
      action: 'USER_CHANNEL_UPDATE',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      entityType: 'USER',
      entityId: id,
      metadata: {
        addedChannels: toAdd,
        removedChannels: toRemove,
      },
      ipAddress: req.ip,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update user channels', 500, 'INTERNAL_ERROR');
  }
};
