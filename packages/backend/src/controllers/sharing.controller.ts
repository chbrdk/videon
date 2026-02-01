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
            const { userId } = req.query; // If admin/owner removes? Or self-remove?
            // Logic for revocation should be simpler: Owner removes specific user.
            // Need to pass userId to remove.

            // For now, assume body contains userId to remove
            const targetUserId = req.body.userId;

            if (!targetUserId) {
                return res.status(400).json({ error: 'Target userId required' });
            }

            await sharingService.removeProjectShare(projectId, targetUserId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async removeVideoShare(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const targetUserId = req.body.userId;

            if (!targetUserId) {
                return res.status(400).json({ error: 'Target userId required' });
            }

            await sharingService.removeVideoShare(videoId, targetUserId);
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
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getVideoCollaborators(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            const collaborators = await sharingService.getVideoCollaborators(videoId);
            res.json(collaborators);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }
}
