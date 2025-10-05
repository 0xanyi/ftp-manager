# Security Measures & Access Controls

## Overview

Security is a critical aspect of the FTP file management system, especially given that it handles file uploads, user authentication, and FTP server connections. This document outlines the comprehensive security measures and access controls implemented throughout the system.

## Authentication & Authorization

### 1. Password Security

```javascript
class PasswordSecurity {
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
  
  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 2. JWT Token Management

```javascript
class TokenManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
    this.blacklistedTokens = new Set();
  }
  
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      channels: user.channels
    };
    
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry
    });
    
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
    
    return { accessToken, refreshToken };
  }
  
  verifyAccessToken(token) {
    try {
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token is blacklisted');
      }
      
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
  
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  blacklistToken(token) {
    this.blacklistedTokens.add(token);
    
    // Clean up expired tokens from blacklist periodically
    this.cleanupBlacklist();
  }
  
  cleanupBlacklist() {
    // Implementation to remove expired tokens
    // This would run periodically to prevent memory leaks
  }
}
```

### 3. Role-Based Access Control (RBAC)

```javascript
class AccessControl {
  constructor() {
    this.permissions = {
      admin: [
        'channel:create',
        'channel:read',
        'channel:update',
        'channel:delete',
        'user:create',
        'user:read',
        'user:update',
        'user:delete',
        'file:read',
        'file:delete',
        'system:configure',
        'system:monitor'
      ],
      channel_user: [
        'channel:read',
        'file:create',
        'file:read',
        'file:update',
        'file:delete:own'
      ]
    };
  }
  
  hasPermission(userRole, permission, resource = null) {
    const userPermissions = this.permissions[userRole] || [];
    
    if (!userPermissions.includes(permission)) {
      return false;
    }
    
    // Check resource-specific permissions
    if (resource && permission.includes('own')) {
      return this.checkOwnership(user, resource);
    }
    
    return true;
  }
  
  checkOwnership(user, resource) {
    // Check if user owns the resource
    switch (resource.type) {
      case 'file':
        return resource.uploadedBy === user.id;
      case 'channel':
        return user.channels.includes(resource.id);
      default:
        return false;
    }
  }
  
  middleware(permission) {
    return (req, res, next) => {
      const user = req.user;
      const resource = req.resource;
      
      if (!this.hasPermission(user.role, permission, resource)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action'
          }
        });
      }
      
      next();
    };
  }
}
```

## Input Validation & Sanitization

### 1. Request Validation

```javascript
const Joi = require('joi');

const validationSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  
  createChannel: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
    description: Joi.string().max(500).optional(),
    ftpPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_-]*$/).required()
  }),
  
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'channel_user').required(),
    channelIds: Joi.array().items(Joi.string().uuid()).optional()
  }),
  
  fileUpload: Joi.object({
    filename: Joi.string().max(255).required(),
    fileSize: Joi.number().max(5 * 1024 * 1024 * 1024).required(), // 5GB
    mimeType: Joi.string().valid(
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/avi', 'video/mov',
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain'
    ).required()
  })
};

class ValidationMiddleware {
  static validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
      }
      
      req.validatedBody = value;
      next();
    };
  }
}
```

### 2. File Upload Security

```javascript
class FileSecurity {
  static validateFile(file) {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/avi', 'video/mov',
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain'
    ];
    
    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024 * 1024)}GB`);
    }
    
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
    
    // Check file extension matches MIME type
    const extension = path.extname(file.name).toLowerCase();
    const expectedExtensions = {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/mov': ['.mov'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    };
    
    const validExtensions = expectedExtensions[file.mimetype] || [];
    if (!validExtensions.includes(extension)) {
      throw new Error('File extension does not match file type');
    }
    
    return true;
  }
  
  static sanitizeFilename(filename) {
    // Remove path traversal characters
    const sanitized = filename.replace(/[\.\.\/\\]/g, '');
    
    // Remove special characters except for dots, hyphens, and underscores
    const cleaned = sanitized.replace(/[^\w\.\-]/g, '_');
    
    // Ensure filename is not empty
    if (cleaned.trim() === '') {
      throw new Error('Invalid filename');
    }
    
    return cleaned;
  }
  
  static async scanForMalware(filePath) {
    // Basic malware scanning
    // In production, integrate with a proper antivirus solution
    const buffer = await fs.readFile(filePath, { start: 0, end: 1024 });
    const view = new Uint8Array(buffer);
    
    // Check for common malware signatures
    const suspiciousSignatures = [
      new Uint8Array([0x4D, 0x5A]), // PE executable
      new Uint8Array([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]), // Java class
    ];
    
    for (const signature of suspiciousSignatures) {
      if (this.matchesSignature(view, signature)) {
        throw new Error('File contains suspicious content');
      }
    }
    
    return true;
  }
  
  static matchesSignature(buffer, signature) {
    if (buffer.length < signature.length) {
      return false;
    }
    
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }
    
    return true;
  }
}
```

## Rate Limiting & DDoS Protection

### 1. API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const createRateLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:'
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // Limit each IP to requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  general: createRateLimiter({ max: 100, windowMs: 15 * 60 * 1000 }),
  auth: createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  upload: createRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 }),
  admin: createRateLimiter({ max: 200, windowMs: 15 * 60 * 1000 })
};
```

### 2. Upload Rate Limiting

```javascript
class UploadRateLimiter {
  constructor() {
    this.maxUploadsPerHour = 10;
    this.maxConcurrentUploads = 3;
    this.maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
    this.uploadAttempts = new Map(); // userId -> array of timestamps
    this.activeUploads = new Map(); // userId -> count
  }
  
  async checkUploadLimit(userId) {
    // Check hourly limit
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    if (!this.uploadAttempts.has(userId)) {
      this.uploadAttempts.set(userId, []);
    }
    
    const userAttempts = this.uploadAttempts.get(userId);
    const recentAttempts = userAttempts.filter(timestamp => timestamp > oneHourAgo);
    
    if (recentAttempts.length >= this.maxUploadsPerHour) {
      throw new Error('Upload limit exceeded. Please try again later.');
    }
    
    // Check concurrent limit
    const activeUploads = this.activeUploads.get(userId) || 0;
    if (activeUploads >= this.maxConcurrentUploads) {
      throw new Error('Too many concurrent uploads. Please wait for current uploads to complete.');
    }
    
    // Record this upload attempt
    recentAttempts.push(now);
    this.uploadAttempts.set(userId, recentAttempts);
    
    // Increment active uploads
    this.activeUploads.set(userId, activeUploads + 1);
    
    return () => {
      // Decrement active uploads when done
      const currentActive = this.activeUploads.get(userId) || 0;
      this.activeUploads.set(userId, Math.max(0, currentActive - 1));
    };
  }
}
```

## FTP Connection Security

### 1. Secure FTP Configuration

```javascript
class SecureFTPConfig {
  static getConfig() {
    return {
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT || 21,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true',
      secureOptions: {
        rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.FTP_CA_CERT ? fs.readFileSync(process.env.FTP_CA_CERT) : undefined,
        cert: process.env.FTP_CLIENT_CERT ? fs.readFileSync(process.env.FTP_CLIENT_CERT) : undefined,
        key: process.env.FTP_CLIENT_KEY ? fs.readFileSync(process.env.FTP_CLIENT_KEY) : undefined
      },
      connTimeout: 10000,
      pasvTimeout: 10000,
      aliveTimeout: 60000
    };
  }
  
  static validateConfig() {
    const requiredEnvVars = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required FTP configuration: ${missingVars.join(', ')}`);
    }
    
    return true;
  }
}
```

### 2. FTP Connection Pool Security

```javascript
class SecureFTPConnectionPool {
  constructor(config) {
    this.config = config;
    this.connections = new Map();
    this.maxConnections = config.maxConnections || 5;
    this.connectionTimeout = config.connectionTimeout || 300000; // 5 minutes
  }
  
  async getConnection() {
    // Check if we have available connections
    for (const [id, connection] of this.connections) {
      if (!connection.inUse && this.isConnectionValid(connection)) {
        connection.inUse = true;
        connection.lastUsed = Date.now();
        return connection;
      }
    }
    
    // Check if we can create a new connection
    if (this.connections.size >= this.maxConnections) {
      throw new Error('Maximum FTP connections reached');
    }
    
    // Create new connection
    return await this.createConnection();
  }
  
  async createConnection() {
    const ftp = new Client();
    const connectionId = this.generateConnectionId();
    
    try {
      await ftp.access(this.config);
      
      const connection = {
        id: connectionId,
        client: ftp,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true
      };
      
      this.connections.set(connectionId, connection);
      
      // Set up connection timeout
      setTimeout(() => {
        this.cleanupConnection(connectionId);
      }, this.connectionTimeout);
      
      return connection;
    } catch (error) {
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }
  
  releaseConnection(connection) {
    if (connection && this.connections.has(connection.id)) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }
  
  isConnectionValid(connection) {
    // Check if connection is still valid and not too old
    const maxAge = 30 * 60 * 1000; // 30 minutes
    return (Date.now() - connection.createdAt) < maxAge;
  }
  
  cleanupConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && !connection.inUse) {
      connection.client.close();
      this.connections.delete(connectionId);
    }
  }
  
  generateConnectionId() {
    return `ftp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Data Protection & Privacy

### 1. Sensitive Data Handling

```javascript
class DataProtection {
  static sanitizeUserData(user) {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
  
  static sanitizeFileData(file) {
    // Remove sensitive FTP paths from file data
    const { ftpPath, ...sanitizedFile } = file;
    return sanitizedFile;
  }
  
  static encryptSensitiveData(data, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  static decryptSensitiveData(encryptedData, key) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}
```

### 2. Audit Logging

```javascript
class AuditLogger {
  static log(action, userId, resource, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      resource,
      details,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    };
    
    // Log to secure audit trail
    console.log('AUDIT:', JSON.stringify(logEntry));
    
    // In production, send to secure logging service
    // this.sendToAuditService(logEntry);
  }
  
  static logAuthAttempt(email, success, ipAddress, userAgent) {
    this.log(
      success ? 'auth_success' : 'auth_failure',
      null,
      'authentication',
      { email, success, ipAddress, userAgent }
    );
  }
  
  static logFileUpload(userId, fileId, filename, channel, ipAddress) {
    this.log(
      'file_upload',
      userId,
      'file',
      { fileId, filename, channel, ipAddress }
    );
  }
  
  static logAdminAction(userId, action, resource, resourceId, details = {}) {
    this.log(
      `admin_${action}`,
      userId,
      resource,
      { resourceId, ...details }
    );
  }
}
```

## Security Headers & HTTPS

### 1. Security Middleware

```javascript
const helmet = require('helmet');

const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Custom security headers
const customSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
```

### 2. HTTPS Enforcement

```javascript
const enforceHTTPS = (req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};
```

## Environment Security

### 1. Environment Variable Management

```javascript
// config/env.js
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FTP_HOST',
  'FTP_USER',
  'FTP_PASSWORD',
  'REDIS_HOST',
  'REDIS_PORT'
];

const validateEnvironment = () => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate secret strength
  if (process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }
  
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  return true;
};

module.exports = {
  validateEnvironment,
  requiredEnvVars
};
```

### 2. Database Security

```javascript
// Database connection with security
const { Pool } = require('pg');

const createSecurePool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
};

// SQL injection prevention
class SecureQueryBuilder {
  static buildQuery(baseQuery, params = {}) {
    let query = baseQuery;
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `$${paramIndex}`;
      query = query.replace(new RegExp(`:${key}`, 'g'), placeholder);
      values.push(value);
      paramIndex++;
    }
    
    return { query, values };
  }
}
```

This comprehensive security design ensures that the FTP file management system is protected against common security threats while maintaining proper access controls and data protection measures.