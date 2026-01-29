// @ts-nocheck
/**
 * Centralized error handling utilities
 * Provides consistent error responses across the application
 */

import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(field ? `${field}: ${message}` : message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} service is currently unavailable`, 503);
  }
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
}

export const createErrorResponse = (error: AppError, req: Request): ErrorResponse => {
  return {
    error: error.name,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

export const handleAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else {
    // Handle unexpected errors
    logger.error('Unexpected error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });

    appError = new AppError(
      appError = new AppError(
        error.message, // DEBUG: Temporarily exposed in prod
        500,
        false
      );
  }

  const errorResponse = createErrorResponse(appError, req);

  // Log error based on severity
  if (appError.statusCode >= 500) {
    logger.error('Server error', {
      ...errorResponse,
      stack: error.stack
    });
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error', errorResponse);
  }

  res.status(appError.statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError('Endpoint', req.path);
  const errorResponse = createErrorResponse(error, req);

  logger.warn('Route not found', errorResponse);
  res.status(404).json(errorResponse);
};

// Utility functions for common error scenarios
export const handleDatabaseError = (error: any, operation: string): AppError => {
  logger.error('Database error', { operation, error: error.message });

  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists');
  }

  if (error.code === 'P2025') {
    return new NotFoundError('Resource');
  }

  return new AppError(`Database operation failed: ${operation}`, 500);
};

export const handleFileSystemError = (error: any, operation: string): AppError => {
  logger.error('File system error', { operation, error: error.message });

  if (error.code === 'ENOENT') {
    return new NotFoundError('File');
  }

  if (error.code === 'EACCES') {
    return new ForbiddenError('Insufficient permissions to access file');
  }

  return new AppError(`File operation failed: ${operation}`, 500);
};

export const handleExternalServiceError = (error: any, service: string): AppError => {
  logger.error('External service error', { service, error: error.message });

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new ServiceUnavailableError(service);
  }

  if (error.response?.status === 404) {
    return new NotFoundError(`${service} resource`);
  }

  if (error.response?.status === 429) {
    return new RateLimitError(`${service} rate limit exceeded`);
  }

  return new AppError(`${service} service error`, 502);
};
