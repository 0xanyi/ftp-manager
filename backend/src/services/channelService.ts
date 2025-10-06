import { PrismaClient } from '@prisma/client';
import { ApiResponse, ErrorCode } from '../types';
import { generateSlug } from '../utils/helpers';
import CacheService from './cacheService';

export class ChannelService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new channel
   */
  async createChannel(data: {
    name: string;
    description?: string;
    ftpPath?: string;
  }): Promise<ApiResponse<{ channel: import('@prisma/client').Channel }>> {
    try {
      // Validate channel name uniqueness
      const existingChannel = await this.prisma.channel.findFirst({
        where: {
          OR: [
            { name: data.name },
            { slug: generateSlug(data.name) }
          ]
        }
      });

      if (existingChannel) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Channel with this name already exists'
          }
        };
      }

      const slug = generateSlug(data.name);
      const ftpPath = data.ftpPath || `/channels/${slug}`;

      const channel = await this.prisma.channel.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ftpPath
        }
      });

      return {
        success: true,
        data: { channel }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to create channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get all channels (admin only)
   */
  async getAllChannels(
    page: number = 1,
    limit: number = 20,
    where?: any,
    orderBy?: any
  ): Promise<ApiResponse<{ channels: import('@prisma/client').Channel[]; total: number; page: number; totalPages: number }>> {
    try {
      const skip = (page - 1) * limit;

      const [channels, total] = await Promise.all([
        this.prisma.channel.findMany({
          where: where || { isActive: true },
          orderBy: orderBy || { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                files: true,
                guestUploadLinks: true
              }
            }
          },
          skip,
          take: limit
        }),
        this.prisma.channel.count({
          where: where || { isActive: true }
        })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          channels,
          total,
          page,
          totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channels',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get channel by ID
   */
  async getChannelById(id: string, userId?: string): Promise<ApiResponse<{ channel: import('@prisma/client').Channel & { files: import('@prisma/client').File[]; _count: { files: number; guestUploadLinks: number } } }>> {
    try {
      const channel = await this.prisma.channel.findFirst({
        where: {
          id,
          isActive: true
        },
        include: {
          files: {
            where: { isActive: true },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              uploader: {
                select: { id: true, email: true }
              }
            }
          },
          _count: {
            select: {
              files: true,
              guestUploadLinks: true
            }
          }
        }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // If userId is provided, check if user has access to this channel
      if (userId) {
        const hasAccess = await this.checkChannelAccess(userId, channel.id);
        if (!hasAccess) {
          return {
            success: false,
            error: {
              code: ErrorCode.AUTHORIZATION_ERROR,
              message: 'Access denied to this channel'
            }
          };
        }
      }

      return {
        success: true,
        data: { channel }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get channels accessible to a user
   */
  async getUserChannels(userId: string): Promise<ApiResponse<{ channels: unknown[] }>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User not found'
          }
        };
      }

      // Get user channel assignments with caching
      const channels = await CacheService.getUserChannels(userId, this.prisma);

      return {
        success: true,
        data: { channels }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve user channels',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update channel
   */
  async updateChannel(
    id: string,
    data: {
      name?: string;
      description?: string;
      ftpPath?: string;
    }
  ): Promise<ApiResponse<{ channel: import('@prisma/client').Channel }>> {
    try {
      const existingChannel = await this.prisma.channel.findUnique({
        where: { id }
      });

      if (!existingChannel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Check if name is being updated and validate uniqueness
      if (data.name && data.name !== existingChannel.name) {
        const nameConflict = await this.prisma.channel.findFirst({
          where: {
            OR: [
              { name: data.name },
              { slug: generateSlug(data.name) }
            ],
            NOT: { id }
          }
        });

        if (nameConflict) {
          return {
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Channel with this name already exists'
            }
          };
        }
      }

      const updateData: { name?: string; slug?: string; description?: string; ftpPath?: string } = { ...data };
      if (data.name) {
        updateData.slug = generateSlug(data.name);
      }

      const channel = await this.prisma.channel.update({
        where: { id },
        data: updateData
      });

      return {
        success: true,
        data: { channel }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to update channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Delete channel (soft delete)
   */
  async deleteChannel(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: { id }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Soft delete the channel
      await this.prisma.channel.update({
        where: { id },
        data: { isActive: false }
      });

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Assign user to channel
   */
  async assignUserToChannel(
    userId: string,
    channelId: string,
    assignedBy: string
  ): Promise<ApiResponse<{ userChannel: unknown }>> {
    try {
      // Verify user and channel exist
      const [user, channel] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.channel.findUnique({ where: { id: channelId } })
      ]);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User not found'
          }
        };
      }

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Check if assignment already exists
      const existingAssignment = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      if (existingAssignment) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'User is already assigned to this channel'
          }
        };
      }

      // Create the assignment
      await this.prisma.userChannel.create({
        data: {
          userId,
          channelId,
          assignedBy
        }
      });

      // Get the created assignment with related data
      const userChannelWithDetails = await this.prisma.userChannel.findUnique({
        where: { 
          userId_channelId: { userId, channelId }
        },
        include: {
          user: {
            select: { id: true, email: true }
          },
          channel: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!userChannelWithDetails) {
        return {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Failed to retrieve created assignment'
          }
        };
      }

      return {
        success: true,
        data: { userChannel: userChannelWithDetails }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to assign user to channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Remove user from channel
   */
  async removeUserFromChannel(userId: string, channelId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const existingAssignment = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      if (!existingAssignment) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User channel assignment not found'
          }
        };
      }

      await this.prisma.userChannel.delete({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to remove user from channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get users assigned to a channel
   */
  async getChannelUsers(channelId: string): Promise<ApiResponse<{ users: unknown[] }>> {
    try {
      const userChannels = await this.prisma.userChannel.findMany({
        where: { channelId },
        include: {
          user: {
            select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      const users = userChannels.map(uc => {
        const user = uc.user;
        return {
          ...user,
          assignedAt: uc.assignedAt
        };
      });

      return {
        success: true,
        data: { users }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channel users',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check if user has access to a channel
   */
  private async checkChannelAccess(userId: string, channelId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.isActive) {
        return false;
      }

      // Admins have access to all channels
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check if user is assigned to the channel
      const userChannel = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      return !!userChannel;
    } catch {
      return false;
    }
  }

  /**
   * Get available users for channel assignment
   */
  async getAvailableUsers(channelId: string): Promise<ApiResponse<{ users: unknown[] }>> {
    try {
      // Get all active users who are not assigned to this channel
      const assignedUserIds = await this.prisma.userChannel
        .findMany({
          where: { channelId },
          select: { userId: true }
        })
        .then(ucs => ucs.map(uc => uc.userId));

      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          id: { notIn: assignedUserIds }
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { email: 'asc' }
      });

      return {
        success: true,
        data: { users }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve available users',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}
