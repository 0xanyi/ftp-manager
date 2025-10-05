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