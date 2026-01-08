import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  res.status(statusCode).json({
    error: 'API Error',
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  });
};
