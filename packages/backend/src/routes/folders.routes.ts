import { Router } from 'express';
import { FolderController } from '../controllers/folder.controller';

const router: any = Router();
const folderController = new FolderController();

// Get all folders (optionally filtered by parentId)
router.get('/', (req: any, res: any) => folderController.getAllFolders(req, res));

// Get folder by ID (use 'root' for root level)
router.get('/:id', (req: any, res: any) => folderController.getFolderById(req, res));

// Get breadcrumbs for a folder
router.get('/:id/breadcrumbs', (req: any, res: any) => folderController.getBreadcrumbs(req, res));

// Create new folder
router.post('/', (req: any, res: any) => folderController.createFolder(req, res));

// Update folder (rename)
router.put('/:id', (req: any, res: any) => folderController.updateFolder(req, res));

// Delete folder
router.delete('/:id', (req: any, res: any) => folderController.deleteFolder(req, res));

// Move videos to folder
router.post('/:id/move-videos', (req: any, res: any) => folderController.moveVideos(req, res));

export default router;
