import { Router } from 'express';
import { SharingController } from '../controllers/sharing.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();
const sharingController = new SharingController();

router.use(isAuthenticated);

// Sharing
router.post('/projects/:projectId/share', sharingController.shareProject);
router.post('/videos/:videoId/share', sharingController.shareVideo);
router.post('/folders/:folderId/share', sharingController.shareFolder);
router.get('/shared-with-me', sharingController.getSharedWithMe);

// Collaborators
router.get('/projects/:projectId/collaborators', sharingController.getProjectCollaborators);
router.get('/videos/:videoId/collaborators', sharingController.getVideoCollaborators);
router.get('/folders/:folderId/collaborators', sharingController.getFolderCollaborators);

// Revocation
router.delete('/projects/:projectId/share', sharingController.removeProjectShare);
router.delete('/videos/:videoId/share', sharingController.removeVideoShare);
router.delete('/folders/:folderId/share', sharingController.removeFolderShare);

export const sharingRouter = router;
