# Implementation Guide - Phase 1: Foundation & Core Infrastructure

## Overview

This guide provides detailed implementation instructions for Phase 1 of the FTP file management system. Development agents should follow these instructions to set up the project structure, database schema, and basic API endpoints.

## Project Structure

Create the following directory structure:

```
ftp-manager/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docs/
├── scripts/
├── docker-compose.dev.yml
├── docker-compose.yml
└── README.md
```

## Backend Implementation

### 1. Package Configuration

Create `backend/package.json`:

```json
{
  "name": "ftp-manager-backend",
  "version": "1.0.0",
  "description": "Backend for FTP file management system",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.9.2",
    "prisma": "^5.2.0",
    "@prisma/client": "^5.2.0",
    "redis": "^4.6.7",
    "basic-ftp": "^5.0.3",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/multer": "^1.4.7",
    "@types/node": "^20.4.5",
    "@types/jest": "^29.5.3",
    "@types/supertest": "^2.0.12",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "eslint": "^8.45.0",
    "@typescript-eslint/eslint-plugin": "^6.2.0",
    "@typescript-eslint/parser": "^6.2.0"
  }
}
```

### 2. TypeScript Configuration

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Database Schema

Create `backend/prisma/schema.prisma`:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         Role     @default(CHANNEL_USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  lastLoginAt  DateTime? @map("last_login_at")
  isActive     Boolean  @default(true) @map("is_active")
  
  // Relations
  uploadedFiles    File[]           @relation("UploadedFiles")
  createdGuestLinks GuestUploadLink[] @relation("CreatedGuestLinks")
  
  @@map("users")
}

model Channel {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(100)
  slug        String   @unique @db.VarChar(100)
  description String?  @db.Text
  ftpPath     String   @map("ftp_path") @db.VarChar(255)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  isActive    Boolean  @default(true) @map("is_active")
  
  // Relations
  files            File[]           @relation("ChannelFiles")
  guestUploadLinks GuestUploadLink[] @relation("GuestUploadLinks")
  
  @@map("channels")
}

model File {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  filename         String   @db.VarChar(255)
  originalName     String   @map("original_name") @db.VarChar(255)
  mimeType         String?  @map("mime_type") @db.VarChar(100)
  size             BigInt
  ftpPath          String   @map("ftp_path") @db.VarChar(500)
  channelId        String   @map("channel_id") @db.Uuid
  uploadedBy       String   @map("uploaded_by") @db.Uuid
  uploadedByGuest  Boolean  @default(false) @map("uploaded_by_guest")
  guestUploadLinkId String? @map("guest_upload_link_id") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  isActive         Boolean  @default(true) @map("is_active")
  
  // Relations
  channel          Channel          @relation("ChannelFiles", fields: [channelId], references: [id], onDelete: Cascade)
  uploader         User             @relation("UploadedFiles", fields: [uploadedBy], references: [id], onDelete: SetNull)
  guestUploadLink  GuestUploadLink? @relation("GuestUploadFiles", fields: [guestUploadLinkId], references: [id], onDelete: SetNull)
  
  @@map("files")
}

model GuestUploadLink {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  token        String    @unique @db.VarChar(255)
  channelId    String?   @map("channel_id") @db.Uuid
  channel      Channel?  @relation("GuestUploadLinks", fields: [channelId], references: [id], onDelete: Cascade)
  guestFolder  String?   @map("guest_folder") @db.VarChar(255)
  description  String?   @db.Text
  expiresAt    DateTime? @map("expires_at")
  maxUploads   Int?      @map("max_uploads")
  uploadCount  Int       @default(0) @map("upload_count")
  isActive     Boolean   @default(true) @map("is_active")
  createdBy    String?   @map("created_by") @db.Uuid
  creator      User?     @relation("CreatedGuestLinks", fields: [createdBy], references: [id], onDelete: SetNull)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  
  // Relations
  files File[] @relation("GuestUploadFiles")
  
  @@map("guest_upload_links")
}

model UserChannel {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  channelId  String   @map("channel_id") @db.Uuid
  assignedAt DateTime @default(now()) @map("assigned_at")
  assignedBy String?  @map("assigned_by") @db.Uuid
  
  @@unique([userId, channelId])
  @@map("user_channels")
}

enum Role {
  ADMIN
  CHANNEL_USER
}
```

### 4. Environment Configuration

Create `backend/.env.example`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ftp_manager"

# JWT
JWT_ACCESS_SECRET="your-super-secret-access-key-at-least-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-characters"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# FTP
FTP_HOST="localhost"
FTP_PORT="21"
FTP_USER="ftpuser"
FTP_PASSWORD="ftppassword"
FTP_SECURE="false"
FTP_REJECT_UNAUTHORIZED="true"

# File Upload
MAX_FILE_SIZE="5368709120"  # 5GB in bytes
CHUNK_SIZE="5242880"  # 5MB in bytes
UPLOAD_DIR="./uploads"
TEMP_DIR="./uploads/temp"

# Server
PORT="3000"
NODE_ENV="development"

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### 5. Core Application Setup

Create `backend/src/app.ts`:

```typescript
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

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize Redis client
export const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD || undefined,
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
```

Create `backend/src/server.ts`:

```typescript
import app from './app';
import { prisma, redis } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to Redis
    await redis.connect();
    console.log('Connected to Redis');
    
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  await prisma.$disconnect();
  await redis.disconnect();
  
  process.exit(0);
});

startServer();
```

### 6. Type Definitions

Create `backend/src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'channel_user';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size: number;
  ftpPath: string;
  channelId: string;
  uploadedBy: string;
  uploadedByGuest: boolean;
  guestUploadLinkId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface GuestUploadLink {
  id: string;
  token: string;
  channelId?: string;
  guestFolder?: string;
  description?: string;
  expiresAt?: Date;
  maxUploads?: number;
  uploadCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
  channels?: string[];
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  FTP_ERROR = 'FTP_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### 7. Utility Functions

Create `backend/src/utils/logger.ts`:

```typescript
import winston from 'winston';
import path from 'path';

const logDir = 'logs';
const logFile = path.join(logDir, 'app.log');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ftp-manager-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // Write all logs to `app.log`
    new winston.transports.File({ filename: logFile }),
  ],
});

// If we're not in production, log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

Create `backend/src/utils/validation.ts`:

```typescript
import Joi from 'joi';

// User validation schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),
  role: Joi.string().valid('admin', 'channel_user').default('channel_user'),
});

// Channel validation schemas
export const createChannelSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().max(500).optional(),
  ftpPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_-]*$/).required(),
});

export const updateChannelSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
});

// File validation schemas
export const fileUploadSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  originalName: Joi.string().max(255).required(),
  mimeType: Joi.string().valid(
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/avi', 'video/mov',
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'text/plain'
  ).required(),
  size: Joi.number().max(5 * 1024 * 1024 * 1024).required(), // 5GB
});

// Guest link validation schemas
export const createGuestLinkSchema = Joi.object({
  channelId: Joi.string().uuid().required(),
  guestFolder: Joi.string().max(255).optional(),
  description: Joi.string().max(500).optional(),
  expiresAt: Joi.date().optional(),
  maxUploads: Joi.number().integer().min(1).optional(),
});

export const updateGuestLinkSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  expiresAt: Joi.date().optional(),
  maxUploads: Joi.number().integer().min(1).optional(),
  isActive: Joi.boolean().optional(),
});
```

### 8. Middleware

Create `backend/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ErrorCode, ApiResponse } from '../types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'Internal server error';

  // Handle known errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code as ErrorCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ErrorCode.AUTHENTICATION_ERROR;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = ErrorCode.AUTHENTICATION_ERROR;
    message = 'Token expired';
  }

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  };

  res.status(statusCode).json(response);
};
```

Create `backend/src/middleware/requestLogger.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
    });
  });
  
  next();
};
```

Create `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { AppError } from './errorHandler';
import { AuthPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401, 'AUTHENTICATION_ERROR');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid token', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Get user's channels
    const userChannels = await prisma.userChannel.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          select: { id: true, slug: true },
        },
      },
    });
    
    const channelIds = userChannels.map(uc => uc.channel.id);
    
    // Attach user to request
    req.user = {
      ...user,
      channels: channelIds,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'AUTHORIZATION_ERROR'));
    }
    
    next();
  };
};
```

### 9. Authentication Routes

Create `backend/src/routes/auth.ts`:

```typescript
import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { loginSchema, registerSchema } from '../utils/validation';
import { ApiResponse, JwtTokens, AuthPayload } from '../types';

const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response, next): Promise<void> => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password, role } = value;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: {
        user,
        tokens,
      },
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req: Request, res: Response, next): Promise<void> => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password } = value;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Get user's channels
    const userChannels = await prisma.userChannel.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          select: { id: true, slug: true, name: true },
        },
      },
    });
    
    const channelIds = userChannels.map(uc => uc.channel.id);
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Prepare user data for response
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      channels: userChannels.map(uc => uc.channel),
      createdAt: user.createdAt,
      lastLoginAt: new Date(),
    };
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: {
        user: userData,
        tokens,
      },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response, next): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token required', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: { tokens },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Get user's channels
    const userChannels = await prisma.userChannel.findMany({
      where: { userId: req.user.id },
      include: {
        channel: {
          select: { id: true, slug: true, name: true },
        },
      },
    });
    
    // Prepare user data
    const userData = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      channels: userChannels.map(uc => uc.channel),
    };
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: { user: userData },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Logout user
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  try {
    // In a real implementation, you would add the token to a blacklist
    // For now, we'll just return a success response
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Helper function to generate JWT tokens
function generateTokens(user: { id: string; email: string; role: string }): JwtTokens {
  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  
  return { accessToken, refreshToken };
}

export default router;
```

### 10. Basic Route Placeholders

Create `backend/src/routes/users.ts`:

```typescript
import { Router } from 'express';

const router = Router();

// User routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'User routes - Coming soon' });
});

export default router;
```

Create `backend/src/routes/channels.ts`:

```typescript
import { Router } from 'express';

const router = Router();

// Channel routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Channel routes - Coming soon' });
});

export default router;
```

Create `backend/src/routes/files.ts`:

```typescript
import { Router } from 'express';

const router = Router();

// File routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'File routes - Coming soon' });
});

export default router;
```

## Frontend Implementation

### 1. Package Configuration

Create `frontend/package.json`:

```json
{
  "name": "ftp-manager-frontend",
  "version": "1.0.0",
  "description": "Frontend for FTP file management system",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "axios": "^1.4.0",
    "react-query": "^3.39.3",
    "react-dropzone": "^14.2.3",
    "react-hook-form": "^7.45.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.263.1",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5",
    "vitest": "^0.34.1"
  }
}
```

### 2. TypeScript Configuration

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 3. Vite Configuration

Create `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 4. Tailwind CSS Configuration

Create `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
```

Create `frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 5. Basic HTML Template

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FTP File Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 6. CSS Configuration

Create `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply btn bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
  }
  
  .btn-secondary {
    @apply btn bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500;
  }
  
  .btn-danger {
    @apply btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500;
  }
  
  .card {
    @apply bg-white overflow-hidden shadow rounded-lg;
  }
  
  .card-header {
    @apply px-4 py-5 sm:px-6 border-b border-gray-200;
  }
  
  .card-body {
    @apply px-4 py-5 sm:p-6;
  }
}
```

### 7. Type Definitions

Create `frontend/src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'channel_user';
  channels: Channel[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size: number;
  ftpPath: string;
  channelId: string;
  uploadedBy: string;
  uploadedByGuest: boolean;
  guestUploadLinkId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface GuestUploadLink {
  id: string;
  token: string;
  channelId?: string;
  channel?: Channel;
  guestFolder?: string;
  description?: string;
  expiresAt?: string;
  maxUploads?: number;
  uploadCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### 8. API Service

Create `frontend/src/services/api.ts`:

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const tokens = localStorage.getItem('authTokens');
        if (tokens) {
          const { accessToken } = JSON.parse(tokens);
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authTokens');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
```

Create `frontend/src/services/auth.ts`:

```typescript
import { apiService } from './api';
import { User, AuthTokens, ApiResponse } from '../types";

export const authService = {
  async login(email: string, password: string) {
    return apiService.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/login', { email, password });
  },

  async register(email: string, password: string, role?: string) {
    return apiService.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/register', { email, password, role });
  },

  async refreshToken() {
    const tokens = JSON.parse(localStorage.getItem('authTokens') || '{}');
    return apiService.post<{ tokens: AuthTokens }>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
  },

  async getCurrentUser() {
    return apiService.get<{ user: User }>('/auth/me');
  },

  async logout() {
    return apiService.post<{ message: string }>('/auth/logout');
  },
};
```

### 9. Authentication Context

Create `frontend/src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { User, AuthTokens, AuthState } from '../types';
import { authService } from '../services/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        tokens: action.payload.tokens,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        tokens: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        tokens: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const tokens = localStorage.getItem('authTokens');
      const user = localStorage.getItem('user');

      if (tokens && user) {
        try {
          // Verify token is still valid
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            dispatch({
              type: 'SET_USER',
              payload: JSON.parse(user),
            });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authTokens');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('authTokens');
          localStorage.removeItem('user');
        }
      }

      dispatch({ type: 'AUTH_FAILURE' });
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.login(email, password);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const register = async (email: string, password: string, role?: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.register(email, password, role);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    }
    
    // Clear localStorage
    localStorage.removeItem('authTokens');
    localStorage.removeItem('user');
    
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 10. Basic Components

Create `frontend/src/components/Button.tsx`:

```typescript
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;
```

Create `frontend/src/components/Input.tsx`:

```typescript
import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName,
  className,
  ...props
}) => {
  const inputClasses = clsx(
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    error && 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
    className
  );
  
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
```

### 11. Basic Pages

Create `frontend/src/pages/LoginPage.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      await login(data.email, data.password);
      toast.success('Login successful');
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </a>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />
          </div>
          
          <div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
```

Create `frontend/src/pages/DashboardPage.tsx`:

```typescript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              FTP File Manager
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                This is the dashboard page. More features will be implemented in the next phases.
              </p>
              <p className="text-gray-600">
                Your role: <span className="font-semibold">{user?.role}</span>
              </p>
              {user?.channels && user.channels.length > 0 && (
                <p className="text-gray-600 mt-2">
                  You have access to {user.channels.length} channel(s)
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
```

### 12. App Component

Create `frontend/src/App.tsx`:

```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
```

### 13. Main Entry Point

Create `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Docker Configuration

### 1. Development Environment

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ftp_manager_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_dev_data:
  redis_dev_data:
```

### 2. Production Environment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

## Environment Files

Create `.env.example` in the root directory:

```env
# Database
POSTGRES_DB=ftp_manager
POSTGRES_USER=ftp_user
POSTGRES_PASSWORD=secure_password_here

# Redis
REDIS_PASSWORD=redis_password_here

# JWT
JWT_ACCESS_SECRET=very_secure_access_secret_at_least_32_characters
JWT_REFRESH_SECRET=very_secure_refresh_secret_at_least_32_characters

# FTP
FTP_HOST=ftp.example.com
FTP_PORT=21
FTP_USER=ftp_user
FTP_PASSWORD=ftp_password
FTP_SECURE=false
```

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Start development environment: `docker-compose -f docker-compose.dev.yml up -d`
4. Install dependencies:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
5. Run database migrations: `cd backend && npm run prisma:push`
6. Start development servers:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

## Testing

Run tests with:
- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`

This concludes the Phase 1 implementation guide. The next phase will focus on implementing the file upload system and FTP integration.