/**
 * STORION Storage Client
 * 
 * Client for interacting with STORION file storage API.
 * STORION provides centralized file storage for all MSQDX services.
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import logger from '../../utils/logger';

export interface StorionFileUpload {
  fileId: string;
  filename: string;
  size: number;
  contentType: string;
  status: string;
  jobId?: string;
}

export interface StorionFileMetadata {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class StorionStorageClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private service: string = 'videon';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes for large video uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Upload a file to STORION
   * 
   * @param filePath Local file path
   * @param entityType Entity type (e.g., 'video', 'keyframe', 'audio_stem', 'thumbnail')
   * @param entityId Entity ID
   * @returns File metadata
   */
  async uploadFile(
    filePath: string,
    entityType: string,
    entityId: string
  ): Promise<StorionFileUpload> {
    try {
      const filename = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      const formData = new FormData();
      formData.append('file', fileStream, filename);
      formData.append('service', this.service);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);

      const response = await this.client.post('/api/v1/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      logger.info('STORION file uploaded', {
        fileId: response.data.fileId,
        filename,
        entityType,
        entityId,
      });

      return response.data;
    } catch (error: any) {
      logger.error('STORION upload failed', {
        filePath,
        entityType,
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFileFromBuffer(
    buffer: Buffer,
    filename: string,
    entityType: string,
    entityId: string,
    contentType?: string
  ): Promise<StorionFileUpload> {
    try {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename,
        contentType: contentType || 'application/octet-stream',
      });
      formData.append('service', this.service);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);

      const response = await this.client.post('/api/v1/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      logger.info('STORION file uploaded from buffer', {
        fileId: response.data.fileId,
        filename,
        entityType,
        entityId,
      });

      return response.data;
    } catch (error: any) {
      logger.error('STORION upload from buffer failed', {
        filename,
        entityType,
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Download a file from STORION
   * 
   * @param fileId STORION file ID
   * @returns File stream
   */
  async downloadFile(fileId: string): Promise<Readable> {
    try {
      const response = await this.client.get(`/api/v1/files/${fileId}/download`, {
        responseType: 'stream',
      });

      return response.data;
    } catch (error: any) {
      logger.error('STORION download failed', {
        fileId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<StorionFileMetadata> {
    try {
      const response = await this.client.get(`/api/v1/files/${fileId}`);
      return response.data;
    } catch (error: any) {
      logger.error('STORION get metadata failed', {
        fileId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files for an entity
   */
  async listFiles(
    entityType: string,
    entityId: string
  ): Promise<StorionFileMetadata[]> {
    try {
      const response = await this.client.get('/api/v1/files', {
        params: {
          service: this.service,
          entity_type: entityType,
          entity_id: entityId,
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error('STORION list files failed', {
        entityType,
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a file from STORION
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/files/${fileId}`);
      logger.info('STORION file deleted', { fileId });
    } catch (error: any) {
      logger.error('STORION delete failed', {
        fileId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate presigned URL for file download (if supported)
   */
  async getPresignedUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const response = await this.client.post(`/api/v1/files/${fileId}/presigned-url`, {
        expires_in: expiresIn,
      });
      return response.data.url;
    } catch (error: any) {
      logger.error('STORION presigned URL failed', {
        fileId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Get STORION storage client instance
 */
let storionClient: StorionStorageClient | null = null;

export function getStorionClient(): StorionStorageClient | null {
  const storionUrl = process.env.STORION_STORAGE_URL || process.env.STORION_BASE_URL;
  
  if (!storionUrl) {
    return null;
  }

  if (!storionClient) {
    storionClient = new StorionStorageClient(storionUrl);
  }

  return storionClient;
}
