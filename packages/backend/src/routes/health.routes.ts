import { Router, Request, Response } from 'express';
import { AnalyzerClient } from '../services/analyzer.client';
import { AudioSeparationClient } from '../services/audio-separation.client';
import { SaliencyClient } from '../services/saliency.client';
import { VisionClient } from '../services/vision.client';

const router: any = Router();
const analyzerClient = new AnalyzerClient();
const audioSeparationClient = new AudioSeparationClient();
const saliencyClient = new SaliencyClient();
const visionClient = new VisionClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Check analyzer health (optional)
    let analyzerHealth = false;
    try {
      analyzerHealth = await analyzerClient.getHealth();
    } catch (error) {
      console.log('Analyzer service not available:', (error as Error).message);
    }
    
    // Check saliency service health (optional)
    let saliencyHealth = false;
    try {
      saliencyHealth = await saliencyClient.getHealth();
    } catch (error) {
      console.log('Saliency service not available:', (error as Error).message);
    }
    
    // Check audio separation service health (optional)
    let audioSeparationHealth = false;
    try {
      audioSeparationHealth = await audioSeparationClient.getHealth();
    } catch (error) {
      console.log('Audio separation service not available:', (error as Error).message);
    }
    
    // Check vision service health (optional - native macOS service)
    let visionHealth = false;
    try {
      visionHealth = await visionClient.getHealth();
    } catch (error) {
      console.log('Vision service not available:', (error as Error).message);
    }
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'healthy',
        database: 'healthy', // TODO: Add actual DB health check
        analyzer: analyzerHealth ? 'healthy' : 'unavailable',
        saliency: saliencyHealth ? 'healthy' : 'unavailable',
        audioSeparation: audioSeparationHealth ? 'healthy' : 'unavailable',
        vision: visionHealth ? 'healthy' : 'unavailable',
      },
    };

    // Immer 200 für UI-Availability, Detailstatus in Payload
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
