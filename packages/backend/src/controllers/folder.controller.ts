import { Request, Response } from 'express';
import { FolderService } from '../services/folder.service';
import logger from '../utils/logger';

const folderService = new FolderService();

export class FolderController {
  async getAllFolders(req: Request, res: Response) {
    try {
      const { parentId } = req.query;
      const folders = await folderService.getAllFolders(parentId as string);
      res.json(folders);
    } catch (error) {
      logger.error('Error in getAllFolders:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch folders',
        message: (error as Error).message
      });
    }
  }

  async getFolderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const folderId = id === 'root' ? null : id;
      const folder = await folderService.getFolderById(folderId);
      
      if (!folder) {
        return res.status(404).json({
          error: 'Folder not found'
        });
      }
      
      res.json(folder);
    } catch (error) {
      logger.error('Error in getFolderById:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch folder',
        message: (error as Error).message
      });
    }
  }

  async createFolder(req: Request, res: Response) {
    try {
      const { name, uploaderId } = req.body;
      const { parentId } = req.query;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          error: 'Folder name is required'
        });
      }

      const folder = await folderService.createFolder(
        { name: name.trim(), uploaderId },
        parentId as string
      );

      logger.info(`Created folder: ${folder.name} in parent: ${parentId || 'root'}`);
      res.status(201).json(folder);
    } catch (error) {
      logger.error('Error in createFolder:', error as Error);
      res.status(500).json({
        error: 'Failed to create folder',
        message: (error as Error).message
      });
    }
  }

  async updateFolder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          error: 'Folder name is required'
        });
      }

      const folder = await folderService.updateFolder(id, {
        name: name.trim()
      });

      logger.info(`Updated folder: ${folder.name}`);
      res.json(folder);
    } catch (error) {
      logger.error('Error in updateFolder:', error as Error);
      res.status(500).json({
        error: 'Failed to update folder',
        message: (error as Error).message
      });
    }
  }

  async deleteFolder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await folderService.deleteFolder(id);

      logger.info(`Deleted folder: ${id}`, result.deletedItems);
      res.json({
        message: 'Folder deleted successfully',
        deletedItems: result.deletedItems
      });
    } catch (error) {
      logger.error('Error in deleteFolder:', error as Error);
      res.status(500).json({
        error: 'Failed to delete folder',
        message: (error as Error).message
      });
    }
  }

  async moveVideos(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { videoIds } = req.body;

      if (!videoIds || !Array.isArray(videoIds)) {
        return res.status(400).json({
          error: 'Video IDs array is required'
        });
      }

      const folderId = id === 'root' ? null : id;
      await folderService.moveVideosToFolder(videoIds, folderId);

      logger.info(`Moved ${videoIds.length} videos to folder: ${id || 'root'}`);
      res.json({
        message: 'Videos moved successfully',
        movedCount: videoIds.length
      });
    } catch (error) {
      logger.error('Error in moveVideos:', error as Error);
      res.status(500).json({
        error: 'Failed to move videos',
        message: (error as Error).message
      });
    }
  }

  async getBreadcrumbs(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const folderId = id === 'root' ? null : id;
      const breadcrumbs = await folderService.getBreadcrumbs(folderId);

      res.json(breadcrumbs);
    } catch (error) {
      logger.error('Error in getBreadcrumbs:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch breadcrumbs',
        message: (error as Error).message
      });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.trim() === '') {
        return res.status(400).json({
          error: 'Search query is required'
        });
      }

      const results = await folderService.searchAll(q.trim());
      res.json(results);
    } catch (error) {
      logger.error('Error in search:', error as Error);
      res.status(500).json({
        error: 'Failed to search',
        message: (error as Error).message
      });
    }
  }
}
