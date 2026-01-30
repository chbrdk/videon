import { Request, Response } from 'express';
import { SharingService } from '../services/sharing.service';
import logger from '../utils/logger';

const sharingService = new SharingService();

export class SharingController {
    async shareProject(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { email, role } = req.body;
            const user = (req as any).user;

            if (!email || !role) {
                return res.status(400).json({ error: 'Email and role are required' });
            }

            await sharingService.shareProject(projectId, email, role, user.id);
            res.json({ success: true, message: 'Project shared successfully' });
        } catch (error) {
            logger.error('Error sharing project:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async shareVideo(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { email, role } = req.body;
            const user = (req as any).user;

            if (!email || !role) {
                return res.status(400).json({ error: 'Email and role are required' });
            }

            await sharingService.shareVideo(videoId, email, role, user.id);
            res.json({ success: true, message: 'Video shared successfully' });
        } catch (error) {
            logger.error('Error sharing video:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async shareFolder(req: Request, res: Response) {
        try {
            const { folderId } = req.params;
            const { email, role } = req.body;
            const user = (req as any).user;

            if (!email || !role) {
                return res.status(400).json({ error: 'Email and role are required' });
            }

            await sharingService.shareFolder(folderId, email, role, user.id);
            res.json({ success: true, message: 'Folder shared successfully' });
        } catch (error) {
            logger.error('Error sharing folder:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getSharedWithMe(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const sharedItems = await sharingService.getSharedWithMe(user.id);
            res.json(sharedItems);
        } catch (error) {
            logger.error('Error fetching shared items:', error);
            res.status(500).json({ error: 'Failed to fetch shared items' });
        }
    }

    async removeProjectShare(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { userId } = req.body; // Expect userId in body

            if (!userId) {
                return res.status(400).json({ error: 'Target userId required' });
            }

            await sharingService.removeProjectShare(projectId, userId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async removeVideoShare(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'Target userId required' });
            }

            await sharingService.removeVideoShare(videoId, userId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async removeFolderShare(req: Request, res: Response) {
        try {
            const { folderId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'Target userId required' });
            }

            await sharingService.removeFolderShare(folderId, userId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getProjectCollaborators(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const collaborators = await sharingService.getProjectCollaborators(projectId);
            res.json(collaborators);
        } catch (error) {
            logger.error('Error fetching project collaborators:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getVideoCollaborators(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const collaborators = await sharingService.getVideoCollaborators(videoId);
            res.json(collaborators);
        } catch (error) {
            logger.error('Error fetching video collaborators:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getFolderCollaborators(req: Request, res: Response) {
        try {
            const { folderId } = req.params;
            const collaborators = await sharingService.getFolderCollaborators(folderId);
            res.json(collaborators);
        } catch (error) {
            logger.error('Error fetching folder collaborators:', error);
            res.status(500).json({ error: (error as Error).message });
        }
    }
}
