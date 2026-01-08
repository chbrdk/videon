/**
 * Saliency API Routes für Backend
 * Endpoints für Saliency Detection Integration
 */
import { Router } from 'express';
import { SaliencyService } from '../services/saliencyService';

const router = Router();

// Saliency-Analyse erstellen
router.post('/saliency-analyses', SaliencyService.createSaliencyAnalysis);

// Saliency-Analyse für Video holen
router.get('/videos/:videoId/saliency', SaliencyService.getVideoSaliency);

// Saliency-Analyse für Scene holen
router.get('/scenes/:sceneId/saliency', SaliencyService.getSceneSaliency);

// Alle Saliency-Analysen für Video holen
router.get('/videos/:videoId/saliency/all', SaliencyService.getAllVideoSaliency);

// Saliency-Analyse löschen
router.delete('/saliency-analyses/:analysisId', SaliencyService.deleteSaliencyAnalysis);

// Heatmap-Pfad aktualisieren
router.patch('/saliency-analyses/:analysisId/heatmap', SaliencyService.updateHeatmapPath);

// Saliency-Statistiken holen
router.get('/saliency/stats', SaliencyService.getSaliencyStats);

// ROI-Vorschläge holen
router.get('/videos/:videoId/roi-suggestions', SaliencyService.getROISuggestions);

export default router;
