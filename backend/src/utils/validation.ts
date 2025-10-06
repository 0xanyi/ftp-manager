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
  role: Joi.string().valid('ADMIN', 'CHANNEL_USER').default('CHANNEL_USER'),
});

// Channel validation schemas
export const createChannelSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  description: Joi.string().max(500).optional().allow(''),
  ftpPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_-]*$/).optional().allow(''),
});

export const updateChannelSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().allow(''),
  description: Joi.string().max(500).optional().allow(''),
  ftpPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_-]*$/).optional().allow(''),
});

export const assignUserToChannelSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  channelId: Joi.string().uuid().required(),
});

export const removeUserFromChannelSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  channelId: Joi.string().uuid().required(),
});

// Query parameter validation schemas
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const idParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const channelIdParamsSchema = Joi.object({
  channelId: Joi.string().uuid().required(),
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