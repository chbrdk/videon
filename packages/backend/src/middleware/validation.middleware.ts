import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { 
      path: req.path, 
      method: req.method, 
      errors: errors.array() 
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined
      }))
    });
  }
  next();
};

// Video validation rules
export const validateVideoUpload = [
  body('video').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('Video file is required');
    }
    
    const allowedMimeTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new Error('Invalid file type. Only MP4, AVI, and MOV files are allowed');
    }
    
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (req.file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 1GB');
    }
    
    return true;
  }),
  handleValidationErrors
];

export const validateVideoId = [
  param('id').isLength({ min: 1 }).withMessage('Invalid video ID format'),
  handleValidationErrors
];

export const validateSceneId = [
  param('sceneId').isUUID().withMessage('Invalid scene ID format'),
  handleValidationErrors
];

export const validateProjectId = [
  param('id').isLength({ min: 1 }).withMessage('Invalid project ID format'),
  handleValidationErrors
];

export const validateCreateProject = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

export const validateCreateFolder = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Folder name must be between 1 and 100 characters'),
  body('parentId')
    .optional()
    .isUUID()
    .withMessage('Invalid parent folder ID format'),
  handleValidationErrors
];

export const validateSceneTiming = [
  body('startTime')
    .isFloat({ min: 0 })
    .withMessage('Start time must be a positive number'),
  body('endTime')
    .isFloat({ min: 0 })
    .withMessage('End time must be a positive number'),
  body('trimStart')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim start must be a positive number'),
  body('trimEnd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim end must be a positive number'),
  handleValidationErrors
];

export const validateSearchQuery = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('type')
    .optional()
    .isIn(['all', 'videos', 'scenes'])
    .withMessage('Search type must be one of: all, videos, scenes'),
  handleValidationErrors
];

export const validateAudioLevel = [
  body('audioLevel')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Audio level must be between 0 and 100'),
  handleValidationErrors
];

export const validateSplitTime = [
  body('splitTime')
    .isFloat({ min: 0 })
    .withMessage('Split time must be a positive number'),
  handleValidationErrors
];
