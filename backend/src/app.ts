import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import channelRoutes from './routes/channels';
import fileRoutes from './routes/files';
import adminRoutes from './routes/admin';
import performanceRoutes from './routes/performance';
import securityRoutes from './routes/security';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { generalRateLimit, uploadRateLimit, authRateLimit, downloadRateLimit, adminRateLimit } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrfProtection';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize Redis client
export const redis = createClient({
  url: process.env.REDIS_URL,
});

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimit);

// Security utility routes (e.g., CSRF token)
app.use('/api/security', securityRoutes);

// Apply CSRF protection to state-changing requests
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/files', uploadRateLimit, fileRoutes);
app.use('/api/files/:fileId/download', downloadRateLimit);
app.use('/api/admin', adminRateLimit, adminRoutes);
app.use('/api/performance', performanceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
