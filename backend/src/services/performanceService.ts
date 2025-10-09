import { Request, Response } from 'express';
import { prisma } from '../app';
import { redis } from '../app';
import logger from '../utils/logger';
import CacheService from './cacheService';

export interface PerformanceMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connectionPool: {
      active: number;
      idle: number;
      total: number;
    };
    queryStats: {
      avgResponseTime: number;
      slowQueries: number;
      totalQueries: number;
    };
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
  };
  uploads: {
    active: number;
    completed: number;
    failed: number;
    totalSize: number;
  };
  websockets: {
    connections: number;
    messagesPerSecond: number;
  };
}

export class PerformanceService {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 1440; // 24 hours of minute data
  private static readonly UPLOAD_METRICS_CACHE_KEY = 'metrics:uploads';
  private static readonly UPLOAD_METRICS_TTL = 300;

  /**
   * Collect current system performance metrics
   */
  static async collectMetrics(): Promise<PerformanceMetrics> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Database metrics
    const dbMetrics = await this.getDatabaseMetrics();
    
    // Cache metrics
    const cacheMetrics = await this.getCacheMetrics();
    
    // Upload metrics (simulated - would come from upload service)
    const uploadMetrics = await this.getUploadMetrics();
    
    // WebSocket metrics (simulated - would come from websocket service)
    const wsMetrics = await this.getWebSocketMetrics();

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      uptime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      database: dbMetrics,
      cache: cacheMetrics,
      uploads: uploadMetrics,
      websockets: wsMetrics,
    };

    // Store metrics
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    return metrics;
  }

  /**
   * Get database performance metrics
   */
  private static async getDatabaseMetrics() {
    try {
      // Get connection pool info (Prisma doesn't expose this directly, so we'll simulate)
      const connectionPool = {
        active: 5,
        idle: 15,
        total: 20,
      };

      // Get query statistics
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const avgResponseTime = Date.now() - start;

      return {
        connectionPool,
        queryStats: {
          avgResponseTime,
          slowQueries: 0, // Would need to implement slow query logging
          totalQueries: 0, // Would need to implement query counting
        },
      };
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
      return {
        connectionPool: { active: 0, idle: 0, total: 0 },
        queryStats: { avgResponseTime: 0, slowQueries: 0, totalQueries: 0 },
      };
    }
  }

  /**
   * Get cache performance metrics
   */
  private static async getCacheMetrics() {
    try {
      const info = await redis.info('memory');
      const memoryUsage = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
      const keyCount = await redis.dbSize();
      
      // Simulate hit rate - would need to implement actual tracking
      const hitRate = 0.85; // 85% hit rate

      return {
        hitRate,
        memoryUsage,
        keyCount,
      };
    } catch (error) {
      logger.error('Error collecting cache metrics:', error);
      return {
        hitRate: 0,
        memoryUsage: 0,
        keyCount: 0,
      };
    }
  }

  /**
   * Get upload metrics
   */
  private static async getUploadMetrics() {
    try {
      // Get upload statistics from cache or database
      type UploadMetrics = PerformanceMetrics['uploads'];
      const cacheKey = this.UPLOAD_METRICS_CACHE_KEY;
      const cached = await CacheService.get<UploadMetrics>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Calculate from database (simplified)
      const [active, completed, failed, totalSizeResult] = await Promise.all([
        0, // Would come from upload service tracking
        prisma.file.count({
          where: {
            isActive: true,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        0, // Would come from upload service tracking
        prisma.file.aggregate({
          where: {
            isActive: true,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          _sum: { size: true },
        }),
      ]);

      const metrics: UploadMetrics = {
        active,
        completed,
        failed,
        totalSize: Number(totalSizeResult._sum.size || BigInt(0)),
      };

      // Cache for 5 minutes
      await CacheService.set(cacheKey, metrics, this.UPLOAD_METRICS_TTL);
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting upload metrics:', error);
      return {
        active: 0,
        completed: 0,
        failed: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Get WebSocket metrics
   */
  private static async getWebSocketMetrics() {
    try {
      // Would get from websocket service
      const connections = 0; // websocketService.getConnectionCount();
      const messagesPerSecond = 0; // websocketService.getMessagesPerSecond();

      return {
        connections,
        messagesPerSecond,
      };
    } catch (error) {
      logger.error('Error collecting WebSocket metrics:', error);
      return {
        connections: 0,
        messagesPerSecond: 0,
      };
    }
  }

  /**
   * Get metrics for the last N minutes
   */
  static getMetricsHistory(minutes: number = 60): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get current performance metrics as API response
   */
  static async getPerformanceData(req: Request, res: Response): Promise<void> {
    try {
      const currentMetrics = await this.collectMetrics();
      const history = this.getMetricsHistory(60); // Last hour

      // Calculate averages and trends
      const avgMemoryUsage = history.reduce((sum, m) => sum + m.memory.percentage, 0) / history.length;
      const avgCpuUsage = history.reduce((sum, m) => sum + m.cpu.usage, 0) / history.length;
      const avgResponseTime = history.reduce((sum, m) => sum + m.database.queryStats.avgResponseTime, 0) / history.length;

      const response = {
        current: currentMetrics,
        summary: {
          avgMemoryUsage,
          avgCpuUsage,
          avgResponseTime,
          uptime: currentMetrics.uptime,
          totalRequests: 0, // Would implement request tracking
          errorRate: 0, // Would implement error tracking
        },
        trends: {
          memoryTrend: this.calculateTrend(history.map(m => m.memory.percentage)),
          cpuTrend: this.calculateTrend(history.map(m => m.cpu.usage)),
          responseTimeTrend: this.calculateTrend(history.map(m => m.database.queryStats.avgResponseTime)),
        },
        alerts: this.checkAlerts(currentMetrics),
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting performance data:', error);
      res.status(500).json({
        error: 'Failed to collect performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Calculate trend from data points
   */
  private static calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-10); // Last 10 data points
    const older = data.slice(-20, -10); // Previous 10 data points
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  /**
   * Check for performance alerts
   */
  private static checkAlerts(metrics: PerformanceMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.memory.percentage > 85) {
      alerts.push('High memory usage detected');
    }

    if (metrics.database.queryStats.avgResponseTime > 1000) {
      alerts.push('Slow database queries detected');
    }

    if (metrics.cache.hitRate < 0.7) {
      alerts.push('Low cache hit rate');
    }

    if (metrics.websockets.connections > 1000) {
      alerts.push('High WebSocket connection count');
    }

    return alerts;
  }

  /**
   * Cleanup old metrics
   */
  static cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ status: string; checks: Record<string, boolean> }> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024, // < 1GB
      uptime: process.uptime() > 60, // Up for at least 1 minute
    };

    const allHealthy = Object.values(checks).every(check => check);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    };
  }

  private static async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private static async checkRedis(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}

export default PerformanceService;
