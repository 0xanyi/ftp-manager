import { prisma } from '../app';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

export class AdminService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse> {
    try {
      // Get user statistics
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { isActive: true }
      });

      const totalUsers = await prisma.user.count({ where: { isActive: true } });

      // Get channel statistics
      const totalChannels = await prisma.channel.count({ where: { isActive: true } });

      // Get file statistics
      const [totalFiles, totalStorage] = await Promise.all([
        prisma.file.count({ where: { isActive: true } }),
        prisma.file.aggregate({
          where: { isActive: true },
          _sum: { size: true }
        })
      ]);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentUsers, recentFiles] = await Promise.all([
        prisma.user.count({
          where: {
            isActive: true,
            createdAt: { gte: sevenDaysAgo }
          }
        }),
        prisma.file.count({
          where: {
            isActive: true,
            createdAt: { gte: sevenDaysAgo }
          }
        })
      ]);

      // Get channel usage statistics
      const channelStats = await prisma.channel.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              files: {
                where: { isActive: true }
              },
              guestUploadLinks: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          files: {
            _count: 'desc'
          }
        },
        take: 10
      });

      const stats = {
        users: {
          total: totalUsers,
          byRole: userStats.reduce((acc, stat) => {
            acc[stat.role] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          recent: recentUsers
        },
        channels: {
          total: totalChannels,
          topByUsage: channelStats
        },
        files: {
          total: totalFiles,
          recent: recentFiles,
          totalStorageBytes: totalStorage._sum.size || BigInt(0)
        },
        period: 'last_7_days'
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get system health information
   */
  async getSystemHealth(): Promise<ApiResponse> {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      const health = {
        database: {
          status: 'healthy',
          connectedAt: new Date().toISOString()
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: health
      };
    } catch (error) {
      logger.error('Error checking system health:', error);
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'System health check failed'
        }
      };
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(): Promise<ApiResponse> {
    try {
      // Get user registration trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const userRegistrationTrend = await prisma.user.findMany({
        where: {
          isActive: true,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          createdAt: true,
          role: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get user login activity (if lastLoginAt is tracked)
      const recentLogins = await prisma.user.findMany({
        where: {
          isActive: true,
          lastLoginAt: { not: null }
        },
        select: {
          id: true,
          email: true,
          lastLoginAt: true,
          role: true
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 20
      });

      // Get user channel assignments
      const userChannelStats = await prisma.userChannel.groupBy({
        by: ['userId'],
        _count: { channelId: true }
      });

      const analytics = {
        registrationTrend: userRegistrationTrend,
        recentLogins: recentLogins,
        channelAssignments: userChannelStats.map(stat => ({
          userId: stat.userId,
          channelCount: stat._count.channelId
        })),
        period: 'last_30_days'
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error fetching user activity analytics:', error);
      throw new Error('Failed to fetch user activity analytics');
    }
  }

  /**
   * Get file usage analytics
   */
  async getFileUsageAnalytics(): Promise<ApiResponse> {
    try {
      // Get file upload trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const fileUploadTrend = await prisma.file.findMany({
        where: {
          isActive: true,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          createdAt: true,
          size: true,
          mimeType: true,
          channelId: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get file type distribution
      const fileTypeDistribution = await prisma.file.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        _sum: { size: true },
        where: {
          isActive: true,
          mimeType: { not: null }
        },
        orderBy: { _count: { id: 'desc' } }
      });

      // Get storage usage by channel
      const storageByChannel = await prisma.channel.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              files: {
                where: { isActive: true }
              }
            }
          },
          files: {
            where: { isActive: true },
            select: { size: true }
          }
        }
      });

      const analytics = {
        uploadTrend: fileUploadTrend,
        typeDistribution: fileTypeDistribution.map(stat => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          totalSize: stat._sum.size || BigInt(0)
        })),
        storageByChannel: storageByChannel.map(channel => ({
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          fileCount: channel._count.files,
          totalSize: channel.files.reduce((acc: bigint, file) => acc + file.size, BigInt(0))
        })),
        period: 'last_30_days'
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error fetching file usage analytics:', error);
      throw new Error('Failed to fetch file usage analytics');
    }
  }
}