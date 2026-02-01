import { PrismaClient } from '@prisma/client';
import { VideoResponse, SceneResponse, VideoWithScenesResponse } from '../types';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export class VideoService {
  async getAllVideos(userId?: string, isAdmin: boolean = false): Promise<VideoResponse[]> {
    try {
      const where: any = {};
      if (!isAdmin && userId) {
        where.OR = [
          { userId: userId },
          { videoShares: { some: { userId: userId } } }
        ];
      } else if (!isAdmin && !userId) {
        return [];
      }

      const videos = await prisma.video.findMany({
        where,
        include: {
          folder: true,
          videoShares: userId ? { where: { userId } } : false
        },
        orderBy: { uploadedAt: 'desc' },
      });

      return videos.map(this.mapVideoToResponse);
    } catch (error) {
      logger.error('Error fetching videos:', error);
      throw error;
    }
  }

  async getVideosByFolder(folderId: string | null, userId?: string, isAdmin: boolean = false): Promise<VideoResponse[]> {
    try {
      const where: any = { folderId: folderId || null };
      if (!isAdmin && userId) {
        if (folderId === null) {
          // In root view, show owned root videos OR ANY shared videos (regardless of their folder)
          where.OR = [
            { userId, folderId: null },
            { videoShares: { some: { userId } } }
          ];
          // Remove top-level folderId: null constraint since we handled it in OR
          delete where.folderId;
        } else {
          // In a specific folder, show owned videos OR shared videos in THAT folder
          where.OR = [
            { userId, folderId },
            { folderId, videoShares: { some: { userId } } }
          ];
          delete where.folderId;
        }
      } else if (!isAdmin && !userId) {
        return [];
      }

      const videos = await prisma.video.findMany({
        where,
        include: {
          folder: true,
          videoShares: userId ? { where: { userId } } : false
        },
        orderBy: { uploadedAt: 'desc' }
      });

      return videos.map(this.mapVideoToResponse);
    } catch (error) {
      logger.error(`Error fetching videos for folder ${folderId}:`, error);
      throw error;
    }
  }

  async moveVideo(videoId: string, folderId: string | null, userId?: string, isAdmin: boolean = false): Promise<void> {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { folder: true }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      // Permissions check
      if (!isAdmin && userId && video.userId !== userId) {
        throw new Error('Unauthorized');
      }


      // Get target folder path - use VIDEOS_STORAGE_PATH environment variable
      const defaultVideosPath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      let targetPath = defaultVideosPath;
      if (folderId) {
        const targetFolder = await prisma.folder.findUnique({
          where: { id: folderId }
        });
        if (!targetFolder) {
          throw new Error('Target folder not found');
        }
        // Folder permission check
        if (!isAdmin && userId && targetFolder.userId !== userId) {
          throw new Error('Target folder Unauthorized');
        }

        targetPath = targetFolder.path;
      }

      // Get current folder path - use VIDEOS_STORAGE_PATH environment variable
      let currentPath = defaultVideosPath;
      if (video.folder) {
        currentPath = video.folder.path;
      }

      // Move video file physically
      const oldFilePath = path.join(currentPath, video.filename);
      const newFilePath = path.join(targetPath, video.filename);

      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
        logger.info(`Moved video file: ${oldFilePath} -> ${newFilePath}`);
      }

      // Update database
      await prisma.video.update({
        where: { id: videoId },
        data: { folderId }
      });

      logger.info(`Moved video ${video.originalName} to folder: ${folderId || 'root'}`);
    } catch (error) {
      logger.error(`Error moving video ${videoId}:`, error);
      throw new Error(`Failed to move video: ${(error as Error).message}`);
    }
  }

  async getVideoById(id: string, userId?: string, isAdmin: boolean = false): Promise<VideoWithScenesResponse | null> {
    try {
      const video = await prisma.video.findUnique({
        where: { id },
        include: {
          scenes: {
            orderBy: { startTime: 'asc' },
          },
          analysisLogs: {
            orderBy: { createdAt: 'desc' },
          },
          videoShares: userId ? { where: { userId } } : false
        },
      });

      if (!video) {
        return null;
      }

      // Check permissions
      // Check permissions
      if (!isAdmin && userId && video.userId !== userId) {
        // Check share
        const share = await prisma.videoShare.findUnique({
          where: { videoId_userId: { videoId: id, userId } }
        });
        if (!share) return null;
      }

      return {
        ...this.mapVideoToResponse(video),
        scenes: video.scenes.map(this.mapSceneToResponse),
        analysisLogs: video.analysisLogs.map(this.mapAnalysisLogToResponse),
      };
    } catch (error) {
      logger.error(`Error fetching video ${id}:`, error);
      throw new Error('Failed to fetch video');
    }
  }

  async getVideoScenes(videoId: string, userId?: string, isAdmin: boolean = false): Promise<SceneResponse[]> {
    try {
      // First check video access
      // Ideally verify video existence and access first
      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (video) {
        if (!isAdmin && userId && video.userId !== userId) {
          return []; // Unauthorized
        }
      }


      const scenes = await prisma.scene.findMany({
        where: { videoId },
        orderBy: { startTime: 'asc' },
      });

      return scenes.map(this.mapSceneToResponse);
    } catch (error) {
      logger.error(`Error fetching scenes for video ${videoId}:`, error);
      throw new Error('Failed to fetch scenes');
    }
  }

  async createVideo(videoData: {
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
    folderId?: string | null;
    userId?: string; // Add userId
  }): Promise<VideoResponse> {
    try {
      const video = await prisma.video.create({
        data: {
          filename: videoData.filename,
          originalName: videoData.originalName,
          fileSize: videoData.fileSize,
          mimeType: videoData.mimeType,
          duration: videoData.duration,
          status: 'UPLOADED',
          folderId: videoData.folderId || null,
          userId: videoData.userId // Save userId
        },
      });

      return this.mapVideoToResponse(video);
    } catch (error) {
      logger.error('Error creating video:', error);
      throw new Error('Failed to create video');
    }
  }

  async createAnalysisLog(
    videoId: string,
    level: 'INFO' | 'WARNING' | 'ERROR',
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.analysisLog.create({
        data: {
          videoId,
          level,
          message,
          metadata,
        },
      });
    } catch (error) {
      logger.error(`Error creating analysis log for video ${videoId}:`, error);
      throw new Error('Failed to create analysis log');
    }
  }

  private mapVideoToResponse(video: any): VideoResponse {
    // Construct the full file path - use environment variable or default to /app/storage/videos (Docker path)
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const filePath = path.join(videosStoragePath, video.filename);

    return {
      id: video.id,
      filename: video.filename,
      originalName: video.originalName,
      duration: video.duration,
      fileSize: video.fileSize,
      mimeType: video.mimeType,
      status: video.status,
      folderId: video.folderId,
      folderName: video.folder?.name,
      uploadedAt: video.uploadedAt.toISOString(),
      analyzedAt: video.analyzedAt?.toISOString(),
      file_path: filePath, // Add file_path for audio service
      sharedRole: video.videoShares?.[0]?.role as 'VIEWER' | 'EDITOR'
    };
  }

  private mapSceneToResponse(scene: any): SceneResponse {
    return {
      id: scene.id,
      videoId: scene.videoId,
      startTime: scene.startTime,
      endTime: scene.endTime,
      keyframePath: scene.keyframePath,
      visionData: scene.visionData,
      createdAt: scene.createdAt.toISOString(),
    };
  }

  async deleteVideo(videoId: string, userId?: string, isAdmin: boolean = false): Promise<{ success: boolean; deletedItems: any }> {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { scenes: true, transcriptions: true, analysisLogs: true }
      });

      if (!video) throw new Error('Video not found');

      if (!isAdmin && userId && video.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const deletedItems = {
        videoFile: false,
        keyframes: 0,
        scenes: video.scenes.length,
        transcriptions: video.transcriptions.length,
        analysisLogs: video.analysisLogs.length
      };

      // 1. Delete video file - use VIDEOS_STORAGE_PATH environment variable
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, video.filename);
      try {
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          deletedItems.videoFile = true;
        }
      } catch (error) {
        logger.warn(`Failed to delete video file: ${(error as Error).message}`);
      }

      // 2. Delete keyframes/thumbnails
      for (const scene of video.scenes) {
        if (scene.keyframePath) {
          try {
            if (fs.existsSync(scene.keyframePath)) {
              fs.unlinkSync(scene.keyframePath);
              deletedItems.keyframes++;
            }
          } catch (error) {
            logger.warn(`Failed to delete keyframe: ${(error as Error).message}`);
          }
        }
      }

      // 3. Delete database entries (Prisma cascade deletes scenes, transcriptions, analysisLogs)
      await prisma.video.delete({ where: { id: videoId } });

      logger.info(`Video deleted successfully: ${videoId}`, deletedItems);
      return { success: true, deletedItems };

    } catch (error) {
      logger.error(`Error deleting video ${videoId}:`, error);
      throw new Error(`Failed to delete video: ${(error as Error).message}`);
    }
  }

  async updateVideoStatus(videoId: string, status: string) {
    try {
      logger.info(`Updating video ${videoId} status to ${status}`);

      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: { status: status as any },
        include: { folder: true }
      });

      logger.info(`Video ${videoId} status updated to ${status}`);
      return this.mapVideoToResponse(updatedVideo);

    } catch (error) {
      logger.error(`Error updating video ${videoId} status:`, error);
      throw new Error(`Failed to update video status: ${(error as Error).message}`);
    }
  }

  async updateVideo(videoId: string, data: { originalName?: string; description?: string }, userId?: string, isAdmin: boolean = false) {
    try {
      logger.info(`Updating video ${videoId}`, data);

      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (!video) throw new Error('Video not found');

      if (!isAdmin && userId && video.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          originalName: data.originalName,
          // description: data.description // Assuming description might be added later to schema if not present
        },
        include: { folder: true }
      });

      return this.mapVideoToResponse(updatedVideo);
    } catch (error) {
      logger.error(`Error updating video ${videoId}:`, error);
      throw new Error(`Failed to update video: ${(error as Error).message}`);
    }
  }

  private mapAnalysisLogToResponse(log: any) {
    return {
      id: log.id,
      videoId: log.videoId,
      level: log.level,
      message: log.message,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
