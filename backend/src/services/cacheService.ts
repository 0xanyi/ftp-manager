import { redis } from '../app';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export class CacheService {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly USER_CHANNELS_TTL = 600; // 10 minutes
  private static readonly SYSTEM_STATS_TTL = 60; // 1 minute

  /**
   * Get cached value with automatic JSON parsing
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with automatic JSON stringification
   */
  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Cache user channels with proper invalidation
   */
  static async getUserChannels(userId: string, prisma: PrismaClient): Promise<any[]> {
    const cacheKey = `user:${userId}:channels`;
    
    // Try to get from cache first
    const cached = await this.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
        userChannels: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            files: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Cache the result
    await this.set(cacheKey, channels, this.USER_CHANNELS_TTL);
    
    return channels;
  }

  /**
   * Cache system statistics
   */
  static async getSystemStats(prisma: PrismaClient): Promise<any> {
    const cacheKey = 'system:stats';
    
    // Try to get from cache first
    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const [
      totalUsers,
      activeUsers,
      totalChannels,
      activeChannels,
      totalFiles,
      totalStorage,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.file.count({ where: { isActive: true } }),
      prisma.file.aggregate({
        where: { isActive: true },
        _sum: { size: true },
      }),
      prisma.file.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalChannels,
      activeChannels,
      totalFiles,
      totalStorage: totalStorage._sum.size?.toString() || '0',
      recentActivity,
      storageUsageGB: Number(totalStorage._sum.size || BigInt(0)) / (1024 * 1024 * 1024),
      avgFileSize: totalFiles > 0 
        ? Number(totalStorage._sum.size || BigInt(0)) / totalFiles 
        : 0,
    };

    // Cache the result
    await this.set(cacheKey, stats, this.SYSTEM_STATS_TTL);
    
    return stats;
  }

  /**
   * Cache channel file list with pagination
   */
  static async getChannelFiles(
    channelId: string,
    page: number,
    limit: number,
    prisma: PrismaClient
  ): Promise<any> {
    const cacheKey = `channel:${channelId}:files:${page}:${limit}`;
    
    // Try to get from cache first
    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;
    
    const [files, total] = await Promise.all([
      prisma.file.findMany({
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
      prisma.file.count({
        where: {
          channelId,
          isActive: true,
        },
      }),
    ]);

    const result = {
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

    // Cache the result with shorter TTL for file lists
    await this.set(cacheKey, result, 180); // 3 minutes
    
    return result;
  }

  /**
   * Invalidate user-specific caches
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`user:${userId}:*`),
    ]);
  }

  /**
   * Invalidate channel-specific caches
   */
  static async invalidateChannelCaches(channelId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`channel:${channelId}:*`),
      this.invalidatePattern('system:stats'),
    ]);
  }

  /**
   * Invalidate all file-related caches
   */
  static async invalidateFileCaches(): Promise<void> {
    await Promise.all([
      this.invalidatePattern('channel:*:files:*'),
      this.invalidatePattern('system:stats'),
    ]);
  }

  /**
   * Health check for cache service
   */
  static async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    
    try {
      const testKey = 'health:check';
      await redis.set(testKey, 'test', 'EX', 10);
      const value = await redis.get(testKey);
      await redis.del(testKey);
      
      const latency = Date.now() - start;
      
      return {
        status: value === 'test' ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

export default CacheService;
