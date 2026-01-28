import axios from 'axios';
import logger from '../utils/logger';

export interface SaliencyAnalysisRequest {
  videoId: string;
  videoPath: string;
  sampleRate?: number;
  modelVersion?: string;
}

export interface SaliencyAnalysisResponse {
  message: string;
  videoId: string;
  status: string;
  saliencyAnalysisId?: string;
}

export interface ReframeRequest {
  videoId: string;
  videoPath: string;
  saliencyDataPath: string;
  aspectRatio: {
    width: number;
    height: number;
  };
  smoothingFactor?: number;
  outputFormat?: string;
  reframedVideoId?: string;
}

export interface ReframeResponse {
  message: string;
  videoId: string;
  jobId: string;
  status: string;
}

export interface StatusResponse {
  status: string;
  progress: number;
  message?: string;
  completed?: boolean;
}

export class SaliencyClient {
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.SALIENCY_SERVICE_URL || 'http://localhost:8002';
  }
  
  /**
   * Get the base URL of the saliency service
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
  
  /**
   * Prüft die Gesundheit des Saliency-Services (alias für healthCheck)
   */
  async getHealth(): Promise<boolean> {
    return this.healthCheck();
  }
  
  /**
   * Triggers saliency analysis for a video
   */
  async analyzeSaliency(
    videoId: string, 
    videoPath: string,
    sampleRate: number = 25,
    modelVersion: string = 'robust-saliency'
  ): Promise<SaliencyAnalysisResponse> {
    try {
      logger.info(`🔍 Starting saliency analysis for video ${videoId}`);
      
      const response = await axios.post(
        `${this.baseUrl}/analyze`,
        {
          videoId,
          videoPath,
          sampleRate,
          modelVersion
        },
        { 
          timeout: 600000, // 10 minutes timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Saliency analysis started for video ${videoId}`);
      return response.data;
      
    } catch (error) {
      logger.error(`❌ Saliency analysis failed for video ${videoId}:`, error);
      throw error;
    }
  }
  
  /**
   * Triggers video reframing based on saliency data
   */
  async reframeVideo(request: ReframeRequest): Promise<ReframeResponse> {
    try {
      logger.info(`🎬 Starting reframing for video ${request.videoId}`);
      
      const response = await axios.post(
        `${this.baseUrl}/reframe-video`,
        request,
        { 
          timeout: 600000, // 10 minutes timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Reframing started for video ${request.videoId}`);
      return response.data;
      
    } catch (error) {
      logger.error(`❌ Reframing failed for video ${request.videoId}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets saliency analysis status for a video
   */
  async getSaliencyStatus(videoId: string): Promise<StatusResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/saliency-status/${videoId}`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get saliency status for video ${videoId}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets reframing job status
   */
  async getReframingStatus(jobId: string): Promise<StatusResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/reframe-status/${jobId}`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get reframing status for job ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error('Saliency service health check failed:', error);
      return false;
    }
  }
}
