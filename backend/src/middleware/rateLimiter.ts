import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Upload rate limiter (more restrictive)
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  message: {
    error: 'Too many upload attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by IP and user ID if authenticated
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'Upload rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Authentication rate limiter (to prevent brute force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Authentication rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// File download rate limiter
export const downloadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 200 downloads per hour
  message: {
    error: 'Too many download requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many download requests',
      message: 'Download rate limit exceeded. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Admin API rate limiter (more restrictive for security)
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 admin requests per windowMs
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `admin:${userId}` : `admin-ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many admin requests',
      message: 'Admin rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// WebSocket connection rate limiter
export const websocketRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 WebSocket connections per minute
  message: {
    error: 'Too many WebSocket connection attempts, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for WebSocket upgrade requests that are already authenticated
    return req.headers.upgrade === 'websocket' && typeof req.headers.authorization === 'string';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many WebSocket connection attempts',
      message: 'WebSocket connection rate limit exceeded. Please try again later.',
      retryAfter: '1 minute'
    });
  }
});
