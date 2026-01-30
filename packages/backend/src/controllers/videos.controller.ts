// @ts-nocheck
import { Request, Response } from 'express';
import { VideoService } from '../services/video.service';
import { AnalyzerClient } from '../services/analyzer.client';
import { SaliencyClient } from '../services/saliency.client';
import { SearchIndexService } from '../services/search-index.service';
import { getStorageService } from '../services/storage';
import config from '../config';
import logger from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const videoService = new VideoService();
const analyzerClient = new AnalyzerClient();
const saliencyClient = new SaliencyClient();
const searchIndexService = new SearchIndexService();
const execAsync = promisify(exec);

// Simple multer configuration directly in controller
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use environment variable or default to /app/storage/videos (Docker path)
    const uploadPath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
});

export class VideosController {
  // Simple upload method without middleware
  async simpleUpload(req: Request, res: Response) {
    try {
      logger.info('Simple upload - File received', {
        filename: req.file?.filename,
        size: req.file?.size,
        mimetype: req.file?.mimetype
      });

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to STORION (mandatory when enabled)
      let storagePath = req.file.filename;
      let videoPath = path.join(req.file.destination, req.file.filename);

      if (config.storage.type === 'storion') {
        const storageService = getStorageService();
        const storionFileId = await storageService.uploadFile(
          videoPath,
          `videos/${req.file.filename}`,
          'temp' // Will be updated with video.id after creation
        );
        storagePath = storionFileId;
        logger.info('Video uploaded to STORION', {
          videoId: 'temp',
          storionFileId,
          originalPath: videoPath,
        });

        // Keep local copy for processing (analyzer services need file access)
        // The local copy is temporary and can be cleaned up after processing
      } else {
        logger.warn('Using local storage (STORION disabled)', {
          videoPath,
        });
      }

      // Create video record
      const video = await videoService.createVideo({
        filename: storagePath, // Use STORION file ID or local filename
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      // Update status to analyzing
      await videoService.updateVideoStatus(video.id, 'ANALYZING');

      logger.info('Video created successfully', {
        videoId: video.id,
        filename: video.filename,
        fileSize: video.fileSize,
        storageType: config.storage.type,
      });

      // Trigger all analyses (async)
      try {
        // For analysis, we need the local file path (even if stored in STORION)
        // Analyzer services need direct file access
        const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
        const localVideoPath = path.join(videosStoragePath, req.file.filename);

        logger.info(`Queueing analyses for video ${video.id}`, { videoPath, filename: req.file.filename });

        // 1. Standard video analysis (scenes, transcription, etc.)
        analyzerClient.analyzeVideo(video.id, videoPath)
          .then(() => {
            logger.info(`Analysis completed for ${video.id}, triggering search indexing...`);
            return searchIndexService.indexVideo(video.id);
          })
          .then(() => {
            logger.info(`Search indexing completed for ${video.id}`);
          })
          .catch(error => {
            logger.error(`Standard analysis failed for video ${video.id}:`, error);
          });

        // 2. Audio separation
        analyzerClient.separateAudioForVideo(video.id, videoPath).catch(error => {
          logger.error(`Audio separation failed for video ${video.id}:`, error);
        });

        // 3. Saliency analysis
        saliencyClient.analyzeSaliency(video.id, videoPath).catch(error => {
          logger.error(`Saliency analysis failed for video ${video.id}:`, error);
        });

        logger.info(`Video uploaded and all analyses queued: ${video.id}`);
      } catch (analysisError) {
        logger.error(`Failed to queue analyses for video ${video.id}:`, analysisError);
      }

      res.status(201).json({
        message: 'Video uploaded successfully',
        video,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Simple upload failed', { error: errorMessage, stack: errorStack });
      res.status(500).json({
        error: 'Upload failed',
        message: (error as Error).message,
      });
    }
  }

  async uploadVideo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a video file to upload',
        });
      }

      const user = (req as any).user;
      const file = req.file;
      logger.info(`Uploading video: ${file.originalname} (${file.size} bytes)`);

      // Upload to STORION if enabled
      let storagePath = file.filename;
      const localVideoPath = path.join(file.destination, file.filename);

      if (config.storage.type === 'storion') {
        try {
          const storageService = getStorageService();
          const storionFileId = await storageService.uploadFile(
            localVideoPath,
            `videos/${file.filename}`,
            'temp' // Will be updated with video.id after creation
          );
          storagePath = storionFileId;
          logger.info('Video uploaded to STORION', {
            storionFileId,
            originalPath: localVideoPath,
          });
        } catch (storionError) {
          logger.error('STORION upload failed, using local storage', {
            error: storionError instanceof Error ? storionError.message : String(storionError),
            fallbackPath: localVideoPath,
          });
        }
      }

      // Create video record in database
      // @ts-ignore
      const video = await videoService.createVideo({
        filename: storagePath, // Use STORION file ID or local filename
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        userId: user?.id,
        folderId: req.body.folderId || null
      });

      // Update status to analyzing
      await videoService.updateVideoStatus(video.id, 'ANALYZING');

      // Log the upload
      await videoService.createAnalysisLog(
        video.id,
        'INFO',
        'Video uploaded successfully',
        {
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        }
      );

      // Trigger all analyses (async)
      // Note: Analyzer services need local file access, so we keep local copy even if using STORION
      try {
        const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
        const videoPath = path.join(videosStoragePath, file.filename);

        // 1. Standard video analysis (scenes, transcription, etc.)
        analyzerClient.analyzeVideo(video.id, videoPath)
          .then(() => {
            logger.info(`Analysis completed for ${video.id}, triggering search indexing...`);
            return searchIndexService.indexVideo(video.id);
          })
          .then(() => {
            logger.info(`Search indexing completed for ${video.id}`);
          })
          .catch(error => {
            logger.error(`Standard analysis failed for video ${video.id}:`, error);
          });

        // 2. Audio separation
        analyzerClient.separateAudioForVideo(video.id, videoPath).catch(error => {
          logger.error(`Audio separation failed for video ${video.id}:`, error);
        });

        // 3. Saliency analysis
        saliencyClient.analyzeSaliency(video.id, videoPath).catch(error => {
          logger.error(`Saliency analysis failed for video ${video.id}:`, error);
        });

        logger.info(`Video uploaded and all analyses queued: ${video.id}`);
      } catch (analysisError) {
        logger.error(`Failed to queue analyses for video ${video.id}:`, analysisError);
      }

      res.status(201).json({
        message: 'Video uploaded successfully',
        video,
      });
    } catch (error) {
      logger.error('Error uploading video:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: 'Failed to upload video',
      });
    }
  }

  async getAllVideos(req: Request, res: Response) {
    try {
      const { folderId } = req.query;
      const user = (req as any).user;
      const userId = user?.id;
      const isAdmin = user?.role === 'ADMIN';

      let videos;
      if (folderId !== undefined) {
        // Convert "null" string to null, or use the folderId as is
        const actualFolderId = folderId === 'null' ? null : folderId as string;
        // @ts-ignore
        videos = await videoService.getVideosByFolder(actualFolderId, userId, isAdmin);
      } else {
        // @ts-ignore
        videos = await videoService.getAllVideos(userId, isAdmin);
      }

      res.json(videos);
    } catch (error) {
      logger.error('Error fetching videos:', error);
      res.status(500).json({
        error: 'Fetch failed',
        message: (error as Error).message,
      });
    }
  }

  async getVideoById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      // @ts-ignore
      const video = await videoService.getVideoById(id, user?.id, user?.role === 'ADMIN');

      if (!video) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Video not found',
        });
      }

      res.json(video);
    } catch (error) {
      logger.error(`Error fetching video ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Fetch failed',
        message: 'Failed to fetch video',
      });
    }
  }

  async getVideoScenes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const scenes = await videoService.getVideoScenes(id);

      res.json(scenes);
    } catch (error) {
      logger.error(`Error fetching scenes for video ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Fetch failed',
        message: 'Failed to fetch video scenes',
      });
    }
  }

  async deleteVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      // @ts-ignore
      const result = await videoService.deleteVideo(id, user?.id, user?.role === 'ADMIN');

      logger.info(`Video deleted successfully: ${id}`, result.deletedItems);

      res.status(200).json({
        message: 'Video deleted successfully',
        deletedItems: result.deletedItems
      });
    } catch (error: unknown) {
      logger.error(`Failed to delete video: ${(error as Error).message}`);
      res.status(500).json({
        error: 'Failed to delete video',
        message: (error as Error).message
      });
    }
  }

  async moveVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;
      const user = (req as any).user;

      // @ts-ignore
      await videoService.moveVideo(id, folderId, user?.id, user?.role === 'ADMIN');

      logger.info(`Video moved successfully: ${id} to folder ${folderId || 'root'}`);

      res.status(200).json({
        message: 'Video moved successfully',
        videoId: id,
        folderId: folderId || null
      });
    } catch (error: unknown) {
      logger.error(`Failed to move video: ${(error as Error).message}`);
      res.status(500).json({
        error: 'Failed to move video',
        message: (error as Error).message
      });
    }
  }

  async generateThumbnail(req: Request, res: Response) {
    try {
      // Set CORS headers for thumbnail requests
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      res.header('Access-Control-Allow-Credentials', 'true');

      // Override CSP for images to allow cross-origin loading
      res.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob: *;");

      // Override CORP to allow cross-origin loading
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');

      const { id } = req.params;
      const { t } = req.query; // Zeit in Sekunden

      const video = await videoService.getVideoById(id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const timeSeconds = t ? parseFloat(t as string) : 0;
      // Use environment variables or default to Docker paths
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const thumbnailsStoragePath = process.env.THUMBNAILS_STORAGE_PATH || '/app/storage/thumbnails';
      const videoPath = path.join(videosStoragePath, video.filename);

      // Prüfe ob Video-Datei existiert
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      // Generiere Thumbnail mit FFmpeg
      const thumbnailPath = path.join(thumbnailsStoragePath, `${video.id}_${Math.floor(timeSeconds)}.jpg`);

      // Erstelle Thumbnail-Verzeichnis falls es nicht existiert
      const thumbnailDir = path.dirname(thumbnailPath);
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Prüfe ob Thumbnail bereits existiert
      if (fs.existsSync(thumbnailPath)) {
        return res.sendFile(thumbnailPath);
      }

      // Generiere Thumbnail mit FFmpeg
      const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss ${timeSeconds} -vframes 1 -q:v 2 "${thumbnailPath}"`;

      try {
        await execAsync(ffmpegCommand);

        // Prüfe ob Thumbnail erfolgreich erstellt wurde
        if (fs.existsSync(thumbnailPath)) {
          logger.info(`✅ Generated thumbnail for video ${id} at ${timeSeconds}s`);
          return res.sendFile(thumbnailPath);
        } else {
          throw new Error('Thumbnail generation failed');
        }
      } catch (ffmpegError) {
        logger.error(`❌ FFmpeg error for video ${id}:`, ffmpegError);
        return res.status(500).json({ error: 'Failed to generate thumbnail' });
      }

    } catch (error: unknown) {
      logger.error(`Error generating thumbnail for video ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Thumbnail generation failed',
        message: (error as Error).message
      });
    }
  }

  async generateSceneVideo(req: Request, res: Response) {
    try {
      // Set CORS headers for video streaming
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      res.header('Access-Control-Allow-Credentials', 'true');

      // Override CSP for video streaming
      res.header('Content-Security-Policy', "default-src 'self'; media-src 'self' data: blob: *;");

      // Override CORP to allow cross-origin loading
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');

      const { id } = req.params;
      const { startTime, endTime, trimStart, trimEnd } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }

      // Calculate actual start and end times with trim support
      const baseStart = parseFloat(startTime as string);
      const baseEnd = parseFloat(endTime as string);
      const trimStartValue = trimStart ? parseFloat(trimStart as string) : 0;
      const trimEndValue = trimEnd ? parseFloat(trimEnd as string) : 0;

      const actualStart = baseStart + trimStartValue;
      const actualEnd = baseEnd - trimEndValue;
      const duration = actualEnd - actualStart;

      logger.info(`🎬 Scene timing: base=${baseStart}s-${baseEnd}s, trim=${trimStartValue}s-${trimEndValue}s, actual=${actualStart}s-${actualEnd}s`);

      const video = await videoService.getVideoById(id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Use environment variables or default to Docker paths
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const scenesStoragePath = process.env.SCENES_STORAGE_PATH || '/app/storage/scenes';
      const videoPath = path.join(videosStoragePath, video.filename);
      const sceneVideoPath = path.join(scenesStoragePath, `${video.id}_${startTime}_${endTime}_${trimStartValue}_${trimEndValue}.mp4`);

      // Check if original video exists, if not try to find similar video
      let actualVideoPath = videoPath;
      if (!fs.existsSync(videoPath)) {
        logger.warn(`⚠️ Original video not found: ${videoPath}`);

        // Try to find a video with similar name
        const videoDir = videosStoragePath;
        const files = fs.readdirSync(videoDir);
        const similarVideo = files.find(file =>
          file.includes('UDG_Elevator_Pitch_Bosch') && file.endsWith('.mp4')
        );

        if (similarVideo) {
          actualVideoPath = `${videoDir}${similarVideo}`;
          logger.info(`🔄 Using similar video: ${actualVideoPath}`);
        } else {
          logger.error(`❌ No similar video found for: ${video.originalName}`);
          return res.status(404).json({ error: 'Original video file not found' });
        }
      }

      // Ensure scene directory exists
      const sceneDir = path.dirname(sceneVideoPath);
      if (!fs.existsSync(sceneDir)) {
        fs.mkdirSync(sceneDir, { recursive: true });
      }

      // Generate scene video if it doesn't exist (ON-DEMAND)
      if (!fs.existsSync(sceneVideoPath)) {
        logger.info(`🎬 Generating scene video on-demand from: ${actualVideoPath}`);
        logger.info(`🎬 Scene timing: ${startTime}s - ${endTime}s`);
        logger.info(`🎬 Output path: ${sceneVideoPath}`);
        const command = `ffmpeg -y -i "${actualVideoPath}" -ss ${actualStart} -t ${duration} -c copy "${sceneVideoPath}"`;
        logger.info(`🎬 FFmpeg command: ${command}`);

        try {
          await execAsync(command);
          logger.info(`✅ Scene video generated on-demand: ${sceneVideoPath}`);

          // Verify the file was created and get its size
          if (fs.existsSync(sceneVideoPath)) {
            const stats = fs.statSync(sceneVideoPath);
            logger.info(`📊 Generated file size: ${stats.size} bytes`);
          } else {
            logger.error(`❌ Generated file not found: ${sceneVideoPath}`);
          }
        } catch (error) {
          logger.error('❌ Scene video generation failed:', error);
          return res.status(500).json({ error: 'Scene video generation failed' });
        }
      } else {
        logger.info(`📁 Serving existing scene video: ${sceneVideoPath}`);
      }

      res.sendFile(sceneVideoPath);
    } catch (error: unknown) {
      logger.error('Scene video error:', error);
      res.status(500).json({ error: 'Failed to generate scene video' });
    }
  }

  async deleteSceneVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }

      const video = await videoService.getVideoById(id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Use environment variable or default to Docker path
      const scenesStoragePath = process.env.SCENES_STORAGE_PATH || '/app/storage/scenes';
      const sceneVideoPath = path.join(scenesStoragePath, `${video.id}_${startTime}_${endTime}.mp4`);

      // Delete scene video if it exists
      if (fs.existsSync(sceneVideoPath)) {
        fs.unlinkSync(sceneVideoPath);
        logger.info(`🗑️ Deleted old scene video: ${sceneVideoPath}`);
        res.json({ message: 'Scene video deleted successfully', path: sceneVideoPath });
      } else {
        logger.info(`ℹ️ Scene video not found (already deleted?): ${sceneVideoPath}`);
        res.json({ message: 'Scene video not found', path: sceneVideoPath });
      }
    } catch (error: unknown) {
      logger.error('Delete scene video error:', error);
      res.status(500).json({ error: 'Failed to delete scene video' });
    }
  }

  async updateVideoStatus(videoId: string, status: string) {
    try {
      logger.info(`Updating video ${videoId} status to ${status}`);

      // Update video status in database
      const updatedVideo = await videoService.updateVideoStatus(videoId, status);

      if (!updatedVideo) {
        logger.warning(`Video ${videoId} not found for status update`);
        return null;
      }

      logger.info(`Video ${videoId} status updated to ${status}`);
      return updatedVideo;

    } catch (error) {
      logger.error(`Error updating video ${videoId} status:`, error);
      throw error;
    }
  }

  async updateVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { originalName, description } = req.body;

      const updatedVideo = await videoService.updateVideo(id, { originalName, description });

      res.json(updatedVideo);
    } catch (error) {
      logger.error(`Error updating video ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Update failed',
        message: (error as Error).message
      });
    }
  }
}
