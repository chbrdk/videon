/**
 * Centralized file handling utilities
 * Provides consistent file operations across the application
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from './logger';
import { AppError, handleFileSystemError } from './error-handler';

const execAsync = promisify(exec);

export { execAsync };

export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  extension: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
}

export class FileHelper {
  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw handleFileSystemError(error, `create directory ${dirPath}`);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(filePath);
      const parsedPath = path.parse(filePath);
      
      return {
        filename: parsedPath.base,
        originalName: parsedPath.base,
        mimeType: this.getMimeType(parsedPath.ext),
        size: stats.size,
        path: filePath,
        extension: parsedPath.ext.toLowerCase()
      };
    } catch (error) {
      throw handleFileSystemError(error, `get file info ${filePath}`);
    }
  }

  static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
        logger.info('File deleted', { filePath });
      }
    } catch (error) {
      logger.warn('Failed to delete file', { filePath, error: (error as Error).message });
      // Don't throw error for file deletion failures
    }
  }

  static async deleteDirectory(dirPath: string): Promise<void> {
    try {
      if (await this.fileExists(dirPath)) {
        await fs.rmdir(dirPath, { recursive: true });
        logger.info('Directory deleted', { dirPath });
      }
    } catch (error) {
      logger.warn('Failed to delete directory', { dirPath, error: (error as Error).message });
    }
  }

  static async copyFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
      logger.info('File copied', { sourcePath, destPath });
    } catch (error) {
      throw handleFileSystemError(error, `copy file from ${sourcePath} to ${destPath}`);
    }
  }

  static async moveFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(destPath));
      await fs.rename(sourcePath, destPath);
      logger.info('File moved', { sourcePath, destPath });
    } catch (error) {
      throw handleFileSystemError(error, `move file from ${sourcePath} to ${destPath}`);
    }
  }

  static async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);

      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream) {
        throw new AppError('No video stream found in file', 400);
      }

      return {
        duration: parseFloat(metadata.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: this.parseFPS(videoStream.r_frame_rate) || 0,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        codec: videoStream.codec_name || 'unknown'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw handleFileSystemError(error, `get video metadata ${videoPath}`);
    }
  }

  private static parseFPS(fpsString: string): number | null {
    if (!fpsString) return null;
    
    const [numerator, denominator] = fpsString.split('/').map(Number);
    if (denominator === 0) return null;
    
    return numerator / denominator;
  }

  static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 0
  ): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(outputPath));
      
      const command = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${outputPath}" -y`;
      await execAsync(command);
      
      logger.info('Thumbnail generated', { videoPath, outputPath, timestamp });
    } catch (error) {
      throw handleFileSystemError(error, `generate thumbnail for ${videoPath}`);
    }
  }

  static async extractAudio(
    videoPath: string,
    outputPath: string,
    format: string = 'wav'
  ): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(outputPath));
      
      const command = `ffmpeg -i "${videoPath}" -vn -acodec ${format} "${outputPath}" -y`;
      await execAsync(command);
      
      logger.info('Audio extracted', { videoPath, outputPath, format });
    } catch (error) {
      throw handleFileSystemError(error, `extract audio from ${videoPath}`);
    }
  }

  static async createVideoSegment(
    videoPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(outputPath));
      
      const duration = endTime - startTime;
      const command = `ffmpeg -i "${videoPath}" -ss ${startTime} -t ${duration} -c copy "${outputPath}" -y`;
      await execAsync(command);
      
      logger.info('Video segment created', { videoPath, outputPath, startTime, endTime });
    } catch (error) {
      throw handleFileSystemError(error, `create video segment from ${videoPath}`);
    }
  }

  static createReadStream(filePath: string) {
    if (!existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }
    return createReadStream(filePath);
  }

  static createWriteStream(filePath: string) {
    return createWriteStream(filePath);
  }

  static async streamFile(
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(destPath));
      
      const readStream = this.createReadStream(sourcePath);
      const writeStream = this.createWriteStream(destPath);
      
      await pipeline(readStream, writeStream);
      
      logger.info('File streamed', { sourcePath, destPath });
    } catch (error) {
      throw handleFileSystemError(error, `stream file from ${sourcePath} to ${destPath}`);
    }
  }

  static getSafeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  static generateUniqueFilename(originalName: string, directory: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const safeBaseName = this.getSafeFilename(baseName);
    
    return path.join(directory, `${safeBaseName}_${timestamp}_${random}${extension}`);
  }
}

export default FileHelper;
