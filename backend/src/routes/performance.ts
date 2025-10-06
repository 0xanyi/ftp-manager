import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import PerformanceService from '../services/performanceService';
import { adminRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all performance routes
router.use(authenticate);
router.use(adminRateLimit);

/**
 * GET /api/performance/metrics
 * Get current performance metrics and historical data
 */
router.get('/metrics', PerformanceService.getPerformanceData);

/**
 * GET /api/performance/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await PerformanceService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/performance/database
 * Get database performance statistics
 */
router.get('/database', async (req, res) => {
  try {
    // This would require more detailed database metrics
    res.json({
      status: 'ok',
      message: 'Database metrics endpoint - would provide detailed DB stats',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/performance/cache
 * Get cache performance statistics
 */
router.get('/cache', async (req, res) => {
  try {
    const cacheHealth = await PerformanceService.healthCheck();
    res.json({
      status: 'ok',
      redis: cacheHealth.checks.redis,
      message: 'Cache metrics endpoint - would provide detailed cache stats',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
