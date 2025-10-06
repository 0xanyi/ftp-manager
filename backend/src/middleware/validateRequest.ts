import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ApiResponse, ErrorCode } from '../types';

/**
 * Middleware to validate request body against a Joi schema
 */
export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errorMessage
        }
      } as ApiResponse);
      return;
    }

    // Replace req.body with validated and cleaned data
    req.body = value;
    next();
  };
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Query validation failed',
          details: errorMessage
        }
      } as ApiResponse);
      return;
    }

    // Replace req.query with validated and cleaned data
    req.query = value;
    next();
  };
};

/**
 * Middleware to validate URL parameters
 */
export const validateParams = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Parameter validation failed',
          details: errorMessage
        }
      } as ApiResponse);
      return;
    }

    // Replace req.params with validated and cleaned data
    req.params = value;
    next();
  };
};
