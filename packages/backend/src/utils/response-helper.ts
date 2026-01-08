/**
 * Centralized response helper utilities
 * Provides consistent API responses across the application
 */

import { Response } from 'express';
import logger from './logger';
import { t, type Locale } from './i18n';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
  timestamp: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  total?: number;
}

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
    pagination?: PaginationOptions,
    locale: Locale = 'en'
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message: message || t('success.updated', locale),
      timestamp: new Date().toISOString()
    };

    if (pagination) {
      response.meta = {
        total: pagination.total,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        hasMore: pagination.total ? (pagination.page || 1) * (pagination.limit || 10) < pagination.total : false
      };
    }

    logger.debug('API response', {
      statusCode,
      path: res.req.path,
      method: res.req.method,
      hasData: !!data
    });

    res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message?: string,
    locale: Locale = 'en'
  ): void {
    this.success(res, data, message || t('success.created', locale), 201, undefined, locale);
  }

  static noContent(res: Response, message: string = 'Operation completed successfully'): void {
    const response: ApiResponse = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    logger.debug('API response', {
      statusCode: 204,
      path: res.req.path,
      method: res.req.method
    });

    res.status(204).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    details?: any,
    locale: Locale = 'en'
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.data = details;
    }

    logger.warn('API error response', {
      statusCode,
      path: res.req.path,
      method: res.req.method,
      message
    });

    res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): void {
    this.error(res, message, 400, details);
  }

  static notFound(
    res: Response,
    resource?: string,
    id?: string,
    locale: Locale = 'en'
  ): void {
    const message = id 
      ? `${resource || t('errors.notFound', locale)} with ID '${id}' not found`
      : `${resource || t('errors.notFound', locale)}`;
    this.error(res, message, 404, undefined, locale);
  }

  static conflict(
    res: Response,
    message: string = 'Resource conflict'
  ): void {
    this.error(res, message, 409);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): void {
    this.error(res, message, 401);
  }

  static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): void {
    this.error(res, message, 403);
  }

  static rateLimitExceeded(
    res: Response,
    message: string = 'Too many requests'
  ): void {
    this.error(res, message, 429);
  }

  static serviceUnavailable(
    res: Response,
    service: string = 'Service'
  ): void {
    this.error(res, `${service} is currently unavailable`, 503);
  }

  static internalError(
    res: Response,
    message: string = 'Internal server error',
    details?: any
  ): void {
    this.error(res, message, 500, details);
  }
}

// Convenience functions for common responses
export const sendSuccess = ResponseHelper.success;
export const sendCreated = ResponseHelper.created;
export const sendNoContent = ResponseHelper.noContent;
export const sendError = ResponseHelper.error;
export const sendValidationError = ResponseHelper.validationError;
export const sendNotFound = ResponseHelper.notFound;
export const sendConflict = ResponseHelper.conflict;
export const sendUnauthorized = ResponseHelper.unauthorized;
export const sendForbidden = ResponseHelper.forbidden;
export const sendRateLimitExceeded = ResponseHelper.rateLimitExceeded;
export const sendServiceUnavailable = ResponseHelper.serviceUnavailable;
export const sendInternalError = ResponseHelper.internalError;

export default ResponseHelper;
