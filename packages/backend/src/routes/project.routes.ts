import { Router, Request, Response } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { validateProjectId, validateCreateProject, validateSceneTiming, validateSplitTime, validateAudioLevel } from '../middleware/validation.middleware';
import { PremiereExportService } from '../services/premiere-export.service';

const router: Router = Router();
const projectController = new ProjectController();
const premiereExportService = new PremiereExportService();

router.post('/', validateCreateProject, (req: Request, res: Response) => projectController.createProject(req, res));
router.get('/', (req: Request, res: Response) => projectController.getProjects(req, res));
router.get('/:id/history', (req: Request, res: Response) => projectController.getProjectHistory(req, res));
router.get('/:id/transcription-segments', (req: Request, res: Response) => projectController.getProjectTranscriptionSegments(req, res));
router.post('/:id/scenes', (req: Request, res: Response) => projectController.addScene(req, res));
router.post('/:id/undo', (req: Request, res: Response) => projectController.undoLastAction(req, res));
router.post('/:id/redo', (req: Request, res: Response) => projectController.redoLastAction(req, res));
router.get('/:id', validateProjectId, (req: Request, res: Response) => projectController.getProjectById(req, res));
router.get('/:id/preview', validateProjectId, (req: Request, res: Response) => projectController.generateProjectPreview(req, res));
router.put('/:id/scenes/reorder', (req, res) => projectController.reorderScenes(req, res));
router.put('/scenes/:sceneId/timing', (req, res) => projectController.updateSceneTiming(req, res));
router.delete('/scenes/:sceneId', (req, res) => projectController.removeScene(req, res));
router.delete('/:id/scenes/:sceneId', (req, res) => projectController.removeScene(req, res));
router.delete('/:id', (req, res) => projectController.deleteProject(req, res));

// New editing APIs
router.post('/scenes/:sceneId/split', (req, res) => projectController.splitScene(req, res));
router.put('/scenes/:sceneId/audio-level', (req, res) => projectController.updateSceneAudioLevel(req, res));

// Export routes
router.get('/:id/export/premiere', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`📤 Exporting Premiere project for project ${id}`);

    const projectData = await premiereExportService.getProjectExportData(id);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const xmlContent = premiereExportService.generateProjectPremiereXML(projectData);
    const zipBuffer = await premiereExportService.createPremiereZip(projectData, xmlContent);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="premiere_project_export_${id}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    
    console.log('✅ Premiere project export completed');
    res.send(zipBuffer);
  } catch (error) {
    console.error('❌ Premiere project export error:', error);
    res.status(500).json({ error: 'Failed to export project' });
  }
});

// Export XML only (fast)
router.get('/:id/export/premiere/xml', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`📄 Exporting XML only for project ${id}`);

    const projectData = await premiereExportService.getProjectExportData(id);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const xmlContent = premiereExportService.generateProjectPremiereXML(projectData);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="premiere_project_export_${id}.xml"`);
    
    console.log('✅ XML project export completed');
    res.send(xmlContent);
  } catch (error) {
    console.error('❌ XML project export error:', error);
    res.status(500).json({ error: 'Failed to export project XML' });
  }
});

// Export SRT subtitles
router.get('/:id/export/srt', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`📝 Exporting SRT subtitles for project ${id}`);

    const projectData = await premiereExportService.getProjectExportData(id);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const srtContent = premiereExportService.generateSRT(projectData.transcriptions);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="project_subtitles_${id}.srt"`);
    
    console.log('✅ SRT project export completed');
    res.send(srtContent);
  } catch (error) {
    console.error('❌ SRT project export error:', error);
    res.status(500).json({ error: 'Failed to export project subtitles' });
  }
});

export default router;
