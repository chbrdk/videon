/**
 * STORION Integration Configuration
 * 
 * STORION is the central database and storage service for all MSQDX products.
 * VIDEON uses STORION database with a dedicated 'videon' schema.
 */

import dotenv from 'dotenv';
dotenv.config();

export interface StorionConfig {
  enabled: boolean;
  databaseUrl: string | null;
  storageUrl: string | null;
  useStorionDb: boolean;
}

/**
 * Get STORION configuration
 * 
 * STORION provides:
 * - Centralized PostgreSQL database with schema-based separation
 * - Centralized file storage (S3 or Filesystem)
 * - Vector storage (Qdrant)
 */
export function getStorionConfig(): StorionConfig {
  const storionDatabaseUrl = process.env.STORION_DATABASE_URL || null;
  const storionStorageUrl = process.env.STORION_STORAGE_URL || process.env.STORION_BASE_URL || null;
  const useStorionDb = process.env.USE_STORION_DB?.toLowerCase() === 'true' || 
                       (storionDatabaseUrl !== null && storionDatabaseUrl.toLowerCase().includes('storion'));

  return {
    enabled: useStorionDb || storionDatabaseUrl !== null,
    databaseUrl: storionDatabaseUrl,
    storageUrl: storionStorageUrl,
    useStorionDb,
  };
}

/**
 * Get database URL for VIDEON
 * 
 * Priority:
 * 1. STORION_DATABASE_URL (if set and contains 'storion')
 * 2. DATABASE_URL (fallback to local database)
 * 
 * For STORION, we use the 'videon' schema via search_path.
 */
export function getDatabaseUrl(): string {
  // Check DATABASE_URL first (explicitly set in docker-compose.yml)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost:7505')) {
    return process.env.DATABASE_URL;
  }

  const config = getStorionConfig();

  if (config.useStorionDb && config.databaseUrl) {
    // STORION database URL - replace localhost:7505 with container name
    const dbUrl = config.databaseUrl.replace('localhost:7505', 'msqdx-unison-postgres-1:5432');
    // Replace psycopg protocol with postgresql for Prisma
    return dbUrl.replace('postgresql+psycopg://', 'postgresql://');
  }

  // Fallback to local database
  return process.env.DATABASE_URL || 'postgresql://videon:videon_dev@localhost:5432/videon';
}

/**
 * Get storage configuration
 * 
 * VIDEON now uses STORION exclusively. Local storage is only used if STORION is explicitly disabled.
 */
export function getStorageConfig() {
  const config = getStorionConfig();
  
  // Force STORION if USE_STORION_DB is true or STORION_DATABASE_URL is set
  const forceStorion = process.env.USE_STORION_DB?.toLowerCase() === 'true' || 
                       (process.env.STORION_DATABASE_URL && process.env.STORION_DATABASE_URL.toLowerCase().includes('storion'));
  
  if (forceStorion) {
    if (!config.storageUrl) {
      throw new Error('STORION_STORAGE_URL or STORION_BASE_URL must be set when USE_STORION_DB=true');
    }
    
    return {
      type: 'storion' as const,
      baseUrl: config.storageUrl,
      // STORION storage paths (service=videon)
      videos: 'videon/videos',
      keyframes: 'videon/keyframes',
      audioStems: 'videon/audio_stems',
      thumbnails: 'videon/thumbnails',
    };
  }
  
  // Local storage (only if STORION is explicitly disabled)
  return {
    type: 'local' as const,
    videos: process.env.VIDEOS_STORAGE_PATH || './storage/videos',
    keyframes: process.env.KEYFRAMES_STORAGE_PATH || './storage/keyframes',
    audioStems: process.env.AUDIO_STEMS_STORAGE_PATH || './storage/audio_stems',
    thumbnails: process.env.THUMBNAILS_STORAGE_PATH || './storage/thumbnails',
  };
}
