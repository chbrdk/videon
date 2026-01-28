/**
 * Storage Service
 * 
 * Provides unified storage interface for local and STORION storage.
 */

import fs from 'fs';
import path from 'path';
import { getStorionClient, StorionStorageClient } from './storion.client';
import config from '../../config';
import logger from '../../utils/logger';

export interface StorageService {
  uploadFile(
    filePath: string,
    storagePath: string,
    entityId: string
  ): Promise<string>;
  
  downloadFile(storagePath: string, destinationPath: string): Promise<void>;
  
  deleteFile(storagePath: string): Promise<void>;
  
  fileExists(storagePath: string): Promise<boolean>;
  
  getFileUrl(storagePath: string): string;
}

class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async uploadFile(
    filePath: string,
    storagePath: string,
    entityId: string
  ): Promise<string> {
    const fullPath = path.join(this.basePath, storagePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    fs.mkdirSync(dir, { recursive: true });
    
    // Copy file
    fs.copyFileSync(filePath, fullPath);
    
    logger.info('File uploaded to local storage', {
      filePath,
      storagePath: fullPath,
    });
    
    return fullPath;
  }

  async downloadFile(storagePath: string, destinationPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    const dir = path.dirname(destinationPath);
    
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(fullPath, destinationPath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async fileExists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, storagePath);
    return fs.existsSync(fullPath);
  }

  getFileUrl(storagePath: string): string {
    // For local storage, return relative path
    return `/storage/${storagePath}`;
  }
}

class StorionStorageService implements StorageService {
  private client: StorionStorageClient;
  private baseUrl: string;

  constructor(client: StorionStorageClient, baseUrl: string) {
    this.client = client;
    this.baseUrl = baseUrl;
  }

  async uploadFile(
    filePath: string,
    storagePath: string,
    entityId: string
  ): Promise<string> {
    // Extract entity type from storage path (e.g., 'videos', 'keyframes')
    const entityType = storagePath.split('/')[0] || 'files';
    
    const result = await this.client.uploadFile(filePath, entityType, entityId);
    
    // Return STORION file ID as storage path
    return result.fileId;
  }

  async downloadFile(storagePath: string, destinationPath: string): Promise<void> {
    // storagePath is STORION file ID
    const stream = await this.client.downloadFile(storagePath);
    const writeStream = fs.createWriteStream(destinationPath);
    
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  async deleteFile(storagePath: string): Promise<void> {
    // storagePath is STORION file ID
    await this.client.deleteFile(storagePath);
  }

  async fileExists(storagePath: string): Promise<boolean> {
    try {
      await this.client.getFileMetadata(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(storagePath: string): string {
    // Return STORION download URL
    return `${this.baseUrl}/api/v1/files/${storagePath}/download`;
  }
}

/**
 * Get storage service instance
 */
let storageService: StorageService | null = null;

export function getStorageService(): StorageService {
  if (storageService) {
    return storageService;
  }

  // Check STORION configuration directly from environment variables (runtime)
  const storionStorageUrl = process.env.STORION_STORAGE_URL || process.env.STORION_BASE_URL;
  const useStorionDb = process.env.USE_STORION_DB?.toLowerCase() === 'true' || 
                       (process.env.STORION_DATABASE_URL && process.env.STORION_DATABASE_URL.toLowerCase().includes('storion'));

  // Force STORION if USE_STORION_DB is true or STORION_DATABASE_URL is set
  if (useStorionDb) {
    if (!storionStorageUrl) {
      throw new Error('STORION_STORAGE_URL or STORION_BASE_URL must be set when USE_STORION_DB=true');
    }
    
    const client = getStorionClient();
    if (!client) {
      throw new Error('Failed to initialize STORION client. Check STORION_STORAGE_URL or STORION_BASE_URL.');
    }
    
    storageService = new StorionStorageService(client, storionStorageUrl);
    logger.info('Using STORION storage service (mandatory)', {
      baseUrl: storionStorageUrl,
    });
    return storageService;
  }

  // Fallback to local storage (only if STORION is explicitly disabled)
  const videosPath = process.env.VIDEOS_STORAGE_PATH?.replace('/videos', '') || '/app/storage';
  storageService = new LocalStorageService(videosPath);
  logger.warn('Using local storage service (STORION disabled)', {
    basePath: videosPath,
  });
  
  return storageService;
}
