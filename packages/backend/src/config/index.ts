/**
 * Centralized configuration management
 * Provides consistent configuration across the application
 */

import path from 'path';
import dotenv from 'dotenv';
import { getDatabaseUrl, getStorageConfig } from './storion';
import { getUnionConfig } from './union';

// Zentrale Konfiguration
const environment = process.env.NODE_ENV || 'development';

// Load environment variables (project root .env for monorepo)
const projectRoot = path.resolve(__dirname, '../../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config(); // Fallback: cwd .env

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    useStorion: boolean;
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
    storion?: {
      url: string;
    };
    union?: {
      baseUrl: string;
      enabled: boolean;
    };
  };
  storage: {
    type: 'local' | 'storion';
    videos: string;
    keyframes: string;
    audioStems: string;
    thumbnails: string;
    baseUrl?: string; // For STORION
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

// Storage config is evaluated at runtime, not build time
// We'll create a function that returns the config dynamically
function createConfig(): AppConfig {
  const storageConfig = getStorageConfig();
  
  return {
    port: parseInt(process.env.PORT || '4001', 10),
    nodeEnv: environment,
    
    database: {
      url: getDatabaseUrl(),
      useStorion: process.env.USE_STORION_DB?.toLowerCase() === 'true' || 
                  (process.env.STORION_DATABASE_URL !== undefined && 
                   process.env.STORION_DATABASE_URL.toLowerCase().includes('storion'))
    },
    
    services: {
      analyzer: {
        url: process.env.ANALYZER_SERVICE_URL || 'http://localhost:8001',
        timeout: parseInt(process.env.ANALYZER_TIMEOUT || '30000', 10)
      },
      vision: {
        url: process.env.VISION_SERVICE_URL || 'http://localhost:8004',
        timeout: parseInt(process.env.VISION_TIMEOUT || '30000', 10)
      },
      ...(storageConfig.type === 'storion' && 'baseUrl' in storageConfig ? {
        storion: {
          url: storageConfig.baseUrl
        }
      } : {}),
      ...(getUnionConfig().enabled ? {
        union: {
          baseUrl: getUnionConfig().baseUrl,
          enabled: true,
        }
      } : {})
    },
    
    storage: {
      type: storageConfig.type,
      videos: storageConfig.videos,
      keyframes: storageConfig.keyframes,
      audioStems: storageConfig.audioStems,
      thumbnails: storageConfig.thumbnails,
      ...(storageConfig.type === 'storion' && 'baseUrl' in storageConfig ? { baseUrl: storageConfig.baseUrl } : {})
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
}

// Create config instance (evaluated at runtime)
const config = createConfig();

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
