import { Request, Response, NextFunction } from 'express';
import { getRequestLocale } from '../utils/i18n';

/**
 * Middleware to detect and set locale from request headers
 */
export function localeMiddleware(req: Request, res: Response, next: NextFunction) {
  req.locale = getRequestLocale(req);
  next();
}

// Extend Express Request type to include locale
declare global {
  namespace Express {
    interface Request {
      locale?: 'en' | 'de';
    }
  }
}
