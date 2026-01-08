import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import logger from '../utils/logger';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Use VIDEOS_STORAGE_PATH environment variable or default to /app/storage/videos (Docker path)
    const videoPath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(videoPath)) {
      fs.mkdirSync(videoPath, { recursive: true });
    }
    
    cb(null, videoPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  // Accept all files for local development
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10737418240'), // 10GB default
  },
});

// Single file upload (legacy support)
export const uploadMiddleware: any = upload.single('video');

// Multiple files upload (up to 10 files at once)
export const uploadMultipleMiddleware: any = upload.array('videos', 10);

export const handleUploadError = (error: any, req: Request, res: any, next: Function) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds the maximum limit of 10GB',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed per upload',
      });
    }
  }

  if (error.message === 'Only video files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only video files are allowed',
    });
  }

  next(error);
};
