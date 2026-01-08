import { PrismaClient } from '@prisma/client';
import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

export interface VisionAnalysisResult {
  objects: Array<{
    label: string;
    confidence: number;
    boundingBox: number[];
  }>;
  faces: Array<{
    confidence: number;
    landmarks?: { [key: string]: number[] };
    boundingBox: number[];
  }>;
  processingTime: number;
  visionVersion: string;
  timestamp: string;
}

export class VisionService {
  private prisma: PrismaClient;
  private visionServiceUrl: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.visionServiceUrl = process.env.VISION_SERVICE_URL || 'http://localhost:8080';
  }

  async analyzeScene(sceneId: string): Promise<void> {
    try {
      // Get scene with keyframe path
      const scene = await this.prisma.scene.findUnique({
        where: { id: sceneId },
        include: { visionAnalysis: true }
      });

      if (!scene) {
        throw new Error(`Given scene ${sceneId} does not exist`);
      }

      if (!scene.keyframePath) {
        logger.warn(`No keyframe available for scene ${sceneId}`);
        return;
      }

      // Check if vision analysis already exists
      if (scene.visionAnalysis) {
        logger.info(`Vision analysis already exists for scene ${sceneId}`);
        return;
      }

      logger.info(`Starting vision analysis for scene ${sceneId}`);

      // Call Vision Service
      const response: AxiosResponse<VisionAnalysisResult> = await axios.post(
        `${this.visionServiceUrl}/analyze/vision`,
        {
          sceneId,
          keyframePath: scene.keyframePath
        },
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const visionResult = response.data;

      // Store results in database
      const textRecognitions = (visionResult as any).textRecognitions || [];
      await this.prisma.visionAnalysis.create({
        data: {
          sceneId,
          objects: JSON.stringify(visionResult.objects),
          objectCount: visionResult.objects.length,
          faces: JSON.stringify(visionResult.faces),
          faceCount: visionResult.faces.length,
          textRecognitions: textRecognitions.length > 0 ? JSON.stringify(textRecognitions) : null,
          textCount: textRecognitions.length,
          sceneClassification: JSON.stringify((visionResult as any).sceneClassification || []),
          customObjects: JSON.stringify((visionResult as any).customObjects || []),
          sceneCategory: (visionResult as any).sceneClassification?.[0]?.category || null,
          customObjectCount: (visionResult as any).customObjects?.length || 0,
          processingTime: visionResult.processingTime,
          visionVersion: visionResult.visionVersion,
          coreMLVersion: (visionResult as any).sceneClassification || (visionResult as any).customObjects ? "1.0.0" : null,
          aiDescription: (visionResult as any).aiDescription?.text || null,
          aiTags: JSON.stringify((visionResult as any).aiDescription ? [(visionResult as any).aiDescription.text] : [])
        }
      });

      logger.info(`Vision analysis completed for scene ${sceneId}: ${visionResult.objects.length} objects, ${visionResult.faces.length} faces, ${textRecognitions.length} text regions`);
    } catch (error) {
      logger.error(`Vision analysis failed for scene ${sceneId}:`, error);
      
      // Get scene info for error logging
      const sceneInfo = await this.prisma.scene.findUnique({
        where: { id: sceneId },
        select: { videoId: true }
      });

      // Create error log
      await this.prisma.analysisLog.create({
        data: {
          videoId: sceneInfo?.videoId || '',
          level: 'ERROR',
          message: `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: JSON.stringify({
            sceneId,
            error: error instanceof Error ? error.stack : String(error)
          })
        }
      });

      throw error;
    }
  }

  async getVisionAnalysisForVideo(videoId: string): Promise<any[]> {
    try {
      const scenes = await this.prisma.scene.findMany({
        where: { videoId },
        include: { visionAnalysis: true },
        orderBy: { startTime: 'asc' }
      });

      return scenes.map((scene: any) => ({
        sceneId: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        keyframePath: scene.keyframePath,
        visionAnalysis: scene.visionAnalysis ? {
          objects: scene.visionAnalysis.objects,
          faces: scene.visionAnalysis.faces,
          objectCount: scene.visionAnalysis.objectCount,
          faceCount: scene.visionAnalysis.faceCount,
          processingTime: scene.visionAnalysis.processingTime,
          visionVersion: scene.visionAnalysis.visionVersion,
          aiDescription: scene.visionAnalysis.aiDescription,
          aiTags: scene.visionAnalysis.aiTags
        } : null
      }));
    } catch (error) {
      logger.error(`Failed to get vision analysis for video ${videoId}:`, error);
      throw error;
    }
  }

  async isVisionServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.visionServiceUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.warn(`Vision service not available at ${this.visionServiceUrl}:`, error);
      return false;
    }
  }

  async triggerVisionAnalysisForVideo(videoId: string): Promise<void> {
    try {
      const scenes = await this.prisma.scene.findMany({
        where: { 
          videoId,
          visionAnalysis: null // Only scenes without vision analysis
        },
        select: { id: true, keyframePath: true }
      });

      if (scenes.length === 0) {
        logger.info(`No scenes found for vision analysis in video ${videoId}`);
        return;
      }

      logger.info(`Triggering vision analysis for ${scenes.length} scenes in video ${videoId}`);

      // Process scenes in parallel (with concurrency limit)
      const concurrency = 3;
      for (let i = 0; i < scenes.length; i += concurrency) {
        const batch = scenes.slice(i, i + concurrency);
        await Promise.all(
          batch.map((scene: any) => this.analyzeScene(scene.id))
        );
      }

      logger.info(`Vision analysis completed for all scenes in video ${videoId}`);
    } catch (error) {
      logger.error(`Failed to trigger vision analysis for video ${videoId}:`, error);
      throw error;
    }
  }
}
