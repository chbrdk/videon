/**
 * Centralized configuration management
 * Provides consistent configuration across the application
 */

import dotenv from 'dotenv';

// Zentrale Konfiguration
const environment = process.env.NODE_ENV || 'development';

// Load environment variables
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  services: {
    analyzer: {
      url: string;
      timeout: number;
    };
    vision: {
      url: string;
      timeout: number;
    };
  };
  storage: {
    videos: string;
    keyframes: string;
    audioStems: string;
    thumbnails: string;
  };
  security: {
    corsOrigins: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  logging: {
    level: string;
    format: 'json' | 'simple';
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: environment,
  
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db'
  },
  
  services: {
    analyzer: {
      url: process.env.ANALYZER_SERVICE_URL || 'http://localhost:8001',
      timeout: parseInt(process.env.ANALYZER_TIMEOUT || '30000', 10)
    },
    vision: {
      url: process.env.VISION_SERVICE_URL || 'http://localhost:8004',
      timeout: parseInt(process.env.VISION_TIMEOUT || '30000', 10)
    }
  },
  
  storage: {
    videos: process.env.VIDEOS_STORAGE_PATH || './storage/videos',
    keyframes: process.env.KEYFRAMES_STORAGE_PATH || './storage/keyframes',
    audioStems: process.env.AUDIO_STEMS_STORAGE_PATH || './storage/audio_stems',
    thumbnails: process.env.THUMBNAILS_STORAGE_PATH || './storage/thumbnails'
  },
  
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:7020',
      'http://localhost:7024', // Added for current frontend port
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:7020',
      'http://127.0.0.1:7024' // Added for current frontend port
    ],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10) // Increased for development
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: (process.env.LOG_FORMAT as 'json' | 'simple') || 'simple'
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1073741824', 10), // 1GB
    allowedMimeTypes: [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/x-matroska'
    ]
  }
};

// Validation
const validateConfig = (config: AppConfig): void => {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (config.upload.maxFileSize < 1024) {
    errors.push('MAX_FILE_SIZE must be at least 1KB');
  }

  if (config.security.rateLimit.max < 1) {
    errors.push('RATE_LIMIT_MAX must be at least 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Validate configuration on startup
validateConfig(config);

export default config;
