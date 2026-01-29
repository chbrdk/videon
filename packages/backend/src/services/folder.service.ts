import { PrismaClient } from '@prisma/client';
import { VideoResponse } from '../types';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderWithContentsResponse extends FolderResponse {
  folders: FolderResponse[];
  videos: VideoResponse[];
}

export interface CreateFolderDto {
  name: string;
  uploaderId?: string;
}

export interface UpdateFolderDto {
  name: string;
}

export interface DeleteFolderResponse {
  success: boolean;
  deletedItems: {
    folder: boolean;
    videos: number;
    movedVideos: number;
  };
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  path: string;
}

export interface SearchResults {
  folders: FolderResponse[];
  videos: VideoResponse[];
}

export class FolderService {
  // Use environment variable or default to Docker path
  private readonly baseStoragePath = process.env.STORAGE_BASE_PATH || '/app/storage';

  async getAllFolders(parentId?: string, userId?: string, isAdmin: boolean = false): Promise<FolderResponse[]> {
    try {
      const where: any = { parentId: parentId || null };

      if (!isAdmin && userId) {
        where.userId = userId;
      } else if (!isAdmin && !userId) {
        return [];
      }

      const folders = await prisma.folder.findMany({
        where,

        // User Isolation
        // If specific userId is provided (and not explicitly requesting public/all), filter by it. "isAdmin" handling should happen before calling this or added here.
        // But adhering to the pattern in VideoService:
        // Note: We need to change signature to accept userId + isAdmin
        // defaulting to no filter for now to avoid breaking calls without updating signature first
        // But wait, I can update signature.

        include: {
          _count: {
            select: { videos: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      return folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        path: folder.path,
        videoCount: folder._count.videos,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      }));
    } catch (error) {
      logger.error('Error fetching folders:', error as Error);
      throw new Error('Failed to fetch folders');
    }
  }

  async getFolderById(id: string | null, userId?: string, isAdmin: boolean = false): Promise<FolderWithContentsResponse | null> {
    try {
      // Get folder info
      let folder = null;
      if (id) {
        folder = await prisma.folder.findUnique({
          where: { id },
          include: {
            _count: {
              select: { videos: true }
            }
          }
        });
      }

      // Get subfolders
      const folders = await this.getAllFolders(id || undefined, userId, isAdmin);

      // Get videos in this folder
      const videos = await this.getVideosByFolder(id, userId, isAdmin);

      if (id && !folder) {
        return null;
      }

      const folderResponse: FolderResponse = folder ? {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        path: folder.path,
        videoCount: folder._count.videos,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      } : {
        id: '',
        name: 'Root',
        parentId: null,
        path: this.baseStoragePath,
        videoCount: videos.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        ...folderResponse,
        folders,
        videos
      };
    } catch (error) {
      logger.error(`Error fetching folder ${id}:`, error as Error);
      throw new Error('Failed to fetch folder');
    }
  }

  async createFolder(data: CreateFolderDto, parentId?: string): Promise<FolderResponse> {
    try {
      // Get parent folder path
      let parentPath = this.baseStoragePath;
      if (parentId) {
        const parentFolder = await prisma.folder.findUnique({
          where: { id: parentId }
        });
        if (!parentFolder) {
          throw new Error('Parent folder not found');
        }
        parentPath = parentFolder.path;
      }

      // Create physical path
      const folderPath = path.join(parentPath, data.name);

      // Create folder in file system
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        logger.info(`Created physical folder: ${folderPath}`);
      }

      // Create folder in database
      const folder = await prisma.folder.create({
        data: {
          name: data.name,
          parentId: parentId || null,
          path: folderPath,
          userId: data.uploaderId // Save userId
        },
        include: {
          _count: {
            select: { videos: true }
          }
        }
      });

      logger.info(`Created folder: ${folder.name} at ${folder.path}`);

      return {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        path: folder.path,
        videoCount: folder._count.videos,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      };
    } catch (error) {
      logger.error('Error creating folder:', error as Error);
      throw new Error(`Failed to create folder: ${(error as Error).message}`);
    }
  }

  async updateFolder(id: string, data: UpdateFolderDto): Promise<FolderResponse> {
    try {
      const folder = await prisma.folder.findUnique({
        where: { id },
        include: {
          _count: {
            select: { videos: true }
          }
        }
      });

      if (!folder) {
        throw new Error('Folder not found');
      }

      // Update physical folder name
      const oldPath = folder.path;
      const newPath = path.join(path.dirname(oldPath), data.name);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        logger.info(`Renamed physical folder: ${oldPath} -> ${newPath}`);
      }

      // Update database
      const updatedFolder = await prisma.folder.update({
        where: { id },
        data: {
          name: data.name,
          path: newPath
        },
        include: {
          _count: {
            select: { videos: true }
          }
        }
      });

      logger.info(`Updated folder: ${updatedFolder.name}`);

      return {
        id: updatedFolder.id,
        name: updatedFolder.name,
        parentId: updatedFolder.parentId,
        path: updatedFolder.path,
        videoCount: updatedFolder._count.videos,
        createdAt: updatedFolder.createdAt.toISOString(),
        updatedAt: updatedFolder.updatedAt.toISOString()
      };
    } catch (error) {
      logger.error(`Error updating folder ${id}:`, error as Error);
      throw new Error(`Failed to update folder: ${(error as Error).message}`);
    }
  }

  async deleteFolder(id: string): Promise<DeleteFolderResponse> {
    try {
      const folder = await prisma.folder.findUnique({
        where: { id },
        include: {
          videos: true,
          children: true
        }
      });

      if (!folder) {
        throw new Error('Folder not found');
      }

      const deletedItems = {
        folder: false,
        videos: 0,
        movedVideos: 0,
        subfolders: 0 // Track subfolder deletions if we enable recursive delete later
      };

      // Check if folder has subfolders
      if (folder.children.length > 0) {
        throw new Error('Cannot delete folder with subfolders. Delete subfolders first.');
      }

      // Move videos to parent folder or root
      if (folder.videos.length > 0) {
        for (const video of folder.videos) {
          await this.moveVideo(video.id, folder.parentId);
        }
        deletedItems.movedVideos = folder.videos.length;
        logger.info(`Moved ${folder.videos.length} videos from deleted folder`);
      }

      // Delete physical folder
      if (fs.existsSync(folder.path)) {
        try {
          fs.rmdirSync(folder.path);
          deletedItems.folder = true;
          logger.info(`Deleted physical folder: ${folder.path}`);
        } catch (error) {
          logger.warn(`Failed to delete physical folder: ${(error as Error).message}`);
        }
      }

      // Delete from database
      await prisma.folder.delete({
        where: { id }
      });

      logger.info(`Deleted folder: ${folder.name}`);

      return { success: true, deletedItems };
    } catch (error) {
      logger.error(`Error deleting folder ${id}:`, error as Error);
      throw new Error(`Failed to delete folder: ${(error as Error).message}`);
    }
  }

  async moveVideosToFolder(videoIds: string[], folderId: string | null): Promise<void> {
    try {
      for (const videoId of videoIds) {
        await this.moveVideo(videoId, folderId);
      }
      logger.info(`Moved ${videoIds.length} videos to folder: ${folderId || 'root'}`);
    } catch (error) {
      logger.error('Error moving videos:', error as Error);
      throw new Error(`Failed to move videos: ${(error as Error).message}`);
    }
  }

  async moveVideo(videoId: string, folderId: string | null): Promise<void> {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { folder: true }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      // Get target folder path
      let targetPath = this.baseStoragePath;
      if (folderId) {
        const targetFolder = await prisma.folder.findUnique({
          where: { id: folderId }
        });
        if (!targetFolder) {
          throw new Error('Target folder not found');
        }
        targetPath = targetFolder.path;
      }

      // Get current folder path
      let currentPath = this.baseStoragePath;
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
      logger.error(`Error moving video ${videoId}:`, error as Error);
      throw new Error(`Failed to move video: ${(error as Error).message}`);
    }
  }

  async getVideosByFolder(folderId: string | null, userId?: string, isAdmin: boolean = false): Promise<VideoResponse[]> {
    try {
      const where: any = { folderId: folderId || null };
      if (!isAdmin && userId) {
        where.userId = userId;
      } else if (!isAdmin && !userId) {
        // If no user context and not admin, return empty? Or public?
        // Assuming Strict Mode:
        return [];
      }

      const videos = await prisma.video.findMany({
        where,
        orderBy: { uploadedAt: 'desc' }
      });

      return videos.map(video => ({
        id: video.id,
        filename: video.filename,
        originalName: video.originalName,
        duration: video.duration || undefined,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        status: video.status,
        uploadedAt: video.uploadedAt.toISOString(),
        analyzedAt: video.analyzedAt?.toISOString()
      }));
    } catch (error) {
      logger.error(`Error fetching videos for folder ${folderId}:`, error as Error);
      throw new Error('Failed to fetch videos');
    }
  }

  async getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
    try {
      const breadcrumbs: BreadcrumbItem[] = [];
      let currentId = folderId;

      while (currentId) {
        const folder = await prisma.folder.findUnique({
          where: { id: currentId },
          select: { id: true, name: true, path: true, parentId: true }
        });

        if (!folder) break;

        breadcrumbs.unshift({
          id: folder.id,
          name: folder.name,
          path: folder.path
        });

        currentId = folder.parentId;
      }

      return breadcrumbs;
    } catch (error) {
      logger.error(`Error fetching breadcrumbs for folder ${folderId}:`, error as Error);
      throw new Error('Failed to fetch breadcrumbs');
    }
  }

  async searchAll(query: string): Promise<SearchResults> {
    try {
      const searchTerm = `%${query}%`;

      // Search folders
      const folders = await prisma.folder.findMany({
        where: {
          name: {
            contains: searchTerm
          }
        },
        include: {
          _count: {
            select: { videos: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Search videos
      const videos = await prisma.video.findMany({
        where: {
          OR: [
            {
              originalName: {
                contains: searchTerm
              }
            },
            {
              filename: {
                contains: searchTerm
              }
            }
          ]
        },
        orderBy: { uploadedAt: 'desc' }
      });

      return {
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          path: folder.path,
          videoCount: folder._count.videos,
          createdAt: folder.createdAt.toISOString(),
          updatedAt: folder.updatedAt.toISOString()
        })),
        videos: videos.map(video => ({
          id: video.id,
          filename: video.filename,
          originalName: video.originalName,
          duration: video.duration || undefined,
          fileSize: video.fileSize,
          mimeType: video.mimeType,
          status: video.status,
          uploadedAt: video.uploadedAt.toISOString(),
          analyzedAt: video.analyzedAt?.toISOString()
        }))
      };
    } catch (error) {
      logger.error(`Error searching for "${query}":`, error as Error);
      throw new Error('Failed to search');
    }
  }
}
