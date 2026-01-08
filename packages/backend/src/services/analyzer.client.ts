import axios from 'axios';
import logger from '../utils/logger';

export interface SceneAudioSeparationRequest {
  startTime: number;
  endTime: number;
  stemTypes: string[];
}

export interface SceneAudioSeparationResponse {
  message: string;
  videoId: string;
  sceneId: string;
  stems: Record<string, string>;
}

export class AnalyzerClient {
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ANALYZER_SERVICE_URL || 'http://localhost:8001';
  }
  
  /**
   * Prüft die Gesundheit des Analyzer-Services
   */
  async getHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Analyzer health check failed:', error);
      return false;
    }
  }
  
  /**
   * Separiert Audio für eine spezifische Scene
   */
  async separateAudioForScene(
    videoId: string, 
    sceneId: string, 
    request: SceneAudioSeparationRequest
  ): Promise<SceneAudioSeparationResponse> {
    try {
      logger.info(`🎵 Starting audio separation for scene ${sceneId} of video ${videoId}`);
      
      const response = await axios.post(
        `${this.baseUrl}/api/separate-audio-scene/${videoId}/${sceneId}`,
        request,
        { 
          timeout: 300000, // 5 Minuten Timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Audio separation completed for scene ${sceneId}`);
      return response.data;
      
    } catch (error) {
      logger.error(`❌ Audio separation failed for scene ${sceneId}:`, error);
      throw error;
    }
  }
  
  /**
   * Separiert Audio für ein komplettes Video
   */
  async separateAudioForVideo(videoId: string, videoPath: string): Promise<void> {
    try {
      logger.info(`🎵 Starting audio separation for video ${videoId}`);
      
      await axios.post(
        `${this.baseUrl}/separate-audio`,
        {
          videoId,
          videoPath
        },
        { 
          timeout: 600000, // 10 Minuten Timeout für komplettes Video
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Audio separation started for video ${videoId}`);
      
    } catch (error) {
      logger.error(`❌ Audio separation failed for video ${videoId}:`, error);
      throw error;
    }
  }
  
  /**
   * Transkribiert ein Video
   */
  async transcribeVideo(videoId: string, language?: string): Promise<void> {
    try {
      logger.info(`🎤 Starting transcription for video ${videoId}`);
      
      await axios.post(
        `${this.baseUrl}/api/transcribe/${videoId}`,
        { language },
        { 
          timeout: 600000, // 10 Minuten Timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Transcription started for video ${videoId}`);
      
    } catch (error) {
      logger.error(`❌ Transcription failed for video ${videoId}:`, error);
      throw error;
    }
  }
  
  /**
   * Analysiert ein Video (Scenes + Keyframes)
   */
  async analyzeVideo(videoId: string, videoPath: string): Promise<void> {
    try {
      logger.info(`🔍 Starting analysis for video ${videoId}`);
      
      await axios.post(
        `${this.baseUrl}/analyze`,
        {
          videoId,
          videoPath
        },
        { 
          timeout: 600000, // 10 Minuten Timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`✅ Analysis started for video ${videoId}`);
      
    } catch (error) {
      logger.error(`❌ Analysis failed for video ${videoId}:`, error);
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
      logger.error('Analyzer service health check failed:', error);
      return false;
    }
  }
}