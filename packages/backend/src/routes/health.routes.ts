import { Router, Request, Response } from 'express';
import { AnalyzerClient } from '../services/analyzer.client';
import { AudioSeparationClient } from '../services/audio-separation.client';
import { SaliencyClient } from '../services/saliency.client';
import { VisionClient } from '../services/vision.client';
import { QwenVLService } from '../services/qwen-vl.service';

const router: any = Router();
const analyzerClient = new AnalyzerClient();
const audioSeparationClient = new AudioSeparationClient();
const saliencyClient = new SaliencyClient();
const visionClient = new VisionClient();
const qwenVLService = new QwenVLService();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Run checks in parallel to avoid accumulating timeouts
    const [analyzerResult, saliencyResult, audioSeparationResult, visionResult, qwenVLResult] = await Promise.allSettled([
      analyzerClient.getHealth().catch(err => { console.log('Analyzer unavailable:', err.message); return false; }),
      saliencyClient.getHealth().catch(err => { console.log('Saliency unavailable:', err.message); return false; }),
      audioSeparationClient.getHealth().catch(err => { console.log('Audio Separation unavailable:', err.message); return false; }),
      visionClient.getHealth().catch(err => { console.log('Vision unavailable:', err.message); return false; }),
      qwenVLService.isAvailable().catch(err => { console.log('QwenVL unavailable:', err.message); return false; })
    ]);

    const analyzerHealth = analyzerResult.status === 'fulfilled' ? analyzerResult.value : false;
    const saliencyHealth = saliencyResult.status === 'fulfilled' ? saliencyResult.value : false;
    const audioSeparationHealth = audioSeparationResult.status === 'fulfilled' ? audioSeparationResult.value : false;
    const visionHealth = visionResult.status === 'fulfilled' ? visionResult.value : false;
    const qwenVLHealth = qwenVLResult.status === 'fulfilled' ? qwenVLResult.value : false;

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
        qwenVL: qwenVLHealth ? 'healthy' : 'unavailable',
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
