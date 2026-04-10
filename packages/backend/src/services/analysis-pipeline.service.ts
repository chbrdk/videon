import { AnalyzerClient } from './analyzer.client';
import { SaliencyClient } from './saliency.client';
import { VideoService } from './video.service';
import logger from '../utils/logger';

const defaultAnalyzer = new AnalyzerClient();
const defaultSaliency = new SaliencyClient();
const defaultVideoService = new VideoService();

export type AnalysisPipelineDeps = {
  analyzer?: Pick<AnalyzerClient, 'analyzeVideo' | 'separateAudioForVideo'>;
  saliency?: Pick<SaliencyClient, 'analyzeSaliency'>;
  videoService?: Pick<VideoService, 'getVideoStatus'>;
};

function pollIntervalMs(): number {
  const raw = process.env.ANALYSIS_PIPELINE_POLL_MS;
  if (raw) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 500 ? n : 2000;
  }
  if (process.env.NODE_ENV === 'test') {
    return 100;
  }
  return 2000;
}

function sceneAnalysisTimeoutMs(): number {
  const raw = process.env.ANALYSIS_SCENE_WAIT_TIMEOUT_MS;
  if (raw) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 60000 ? n : 6 * 60 * 60 * 1000;
  }
  if (process.env.NODE_ENV === 'test') {
    return 8000;
  }
  return 6 * 60 * 60 * 1000;
}

function staggerEnabled(): boolean {
  return process.env.ANALYSIS_STAGGER_JOBS !== 'false';
}

/**
 * After upload / full analysis: run scene pipeline first, then audio stems and saliency sequentially
 * so the analyzer is not hit with three heavy jobs at once (still subject to analyzer semaphores).
 */
export async function runPostUploadAnalysisPipeline(
  videoId: string,
  localVideoPath: string,
  deps?: AnalysisPipelineDeps
): Promise<void> {
  const analyzer = deps?.analyzer ?? defaultAnalyzer;
  const saliency = deps?.saliency ?? defaultSaliency;
  const videoSvc = deps?.videoService ?? defaultVideoService;
  const stagger = staggerEnabled();

  try {
    await analyzer.analyzeVideo(videoId, localVideoPath);
  } catch (e) {
    logger.error(`Scene analysis trigger failed for video ${videoId}:`, e);
    return;
  }

  if (!stagger) {
    analyzer.separateAudioForVideo(videoId, localVideoPath).catch((err) => {
      logger.error(`Audio separation failed for video ${videoId}:`, err);
    });
    saliency.analyzeSaliency(videoId, localVideoPath).catch((err) => {
      logger.error(`Saliency analysis failed for video ${videoId}:`, err);
    });
    return;
  }

  const deadline = Date.now() + sceneAnalysisTimeoutMs();
  const interval = pollIntervalMs();

  while (Date.now() < deadline) {
    const row = await videoSvc.getVideoStatus(videoId);
    const st = row?.status;
    if (st === 'ANALYZED') break;
    if (st === 'ERROR') {
      logger.warn(`Skipping audio/saliency for video ${videoId}: status=${st}`);
      return;
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  const final = await videoSvc.getVideoStatus(videoId);
  if (final?.status !== 'ANALYZED') {
    logger.warn(
      `Scene analysis did not reach ANALYZED for video ${videoId} (status=${final?.status}); starting audio/saliency anyway`
    );
  }

  try {
    await analyzer.separateAudioForVideo(videoId, localVideoPath);
  } catch (e) {
    logger.error(`Audio separation failed for video ${videoId}:`, e);
  }

  try {
    await saliency.analyzeSaliency(videoId, localVideoPath);
  } catch (e) {
    logger.error(`Saliency analysis failed for video ${videoId}:`, e);
  }
}
