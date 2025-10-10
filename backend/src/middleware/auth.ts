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
    
    let channelIds: string[];
    
    // Admins have access to all active channels
    if (user.role === 'ADMIN') {
      const allChannels = await prisma.channel.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      channelIds = allChannels.map(c => c.id);
    } else {
      // Get user's assigned channels
      const userChannels = await prisma.userChannel.findMany({
        where: { userId: user.id },
      });
      
      // Get channel details for active channels only
      const channels = await prisma.channel.findMany({
        where: {
          id: {
            in: userChannels.map(uc => uc.channelId),
          },
          isActive: true,
        },
        select: { id: true, slug: true },
      });
      
      channelIds = channels.map(c => c.id);
    }
    
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