/**
 * Audio Separation Client für das Backend
 * Integriert Audio-Trennung direkt über den Analyzer Service
 */
import axios from 'axios';
import logger from '../utils/logger';

export class AudioSeparationClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.AUDIO_SEPARATION_SERVICE_URL || 'http://localhost:8001';
  }

  /**
   * Prüft die Gesundheit des Audio Separation Services
   */
  async getHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Audio separation health check failed:', error);
      return false;
    }
  }

  /**
   * Startet Audio-Trennung mit Spleeter über Analyzer Service
   */
  async separateWithSpleeter(videoId: string, videoPath: string): Promise<void> {
    try {
      logger.info(`🎵 Starting Spleeter audio separation for video ${videoId}`);

      await axios.post(
        `${this.baseUrl}/separate-audio`,
        {
          videoId: videoId,
          videoPath: videoPath
        },
        {
          timeout: 600000, // 10 Minuten Timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`✅ Spleeter audio separation started for video ${videoId}`);

    } catch (error) {
      logger.error(`❌ Spleeter audio separation failed for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Startet Audio-Trennung mit Demucs über Analyzer Service
   */
  async separateWithDemucs(videoId: string, videoPath: string): Promise<void> {
    try {
      logger.info(`🎵 Starting Demucs audio separation for video ${videoId}`);

      // Für jetzt verwenden wir den gleichen Endpoint wie Spleeter
      // In Zukunft könnte der Analyzer Service verschiedene Methoden unterstützen
      await axios.post(
        `${this.baseUrl}/separate-audio`,
        {
          videoId: videoId,
          videoPath: videoPath,
          method: 'demucs' // Optional parameter
        },
        {
          timeout: 600000, // 10 Minuten Timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`✅ Demucs audio separation started for video ${videoId}`);

    } catch (error) {
      logger.error(`❌ Demucs audio separation failed for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Gibt verfügbare Trennung-Methoden zurück
   */
  async getAvailableMethods(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return {
        "analyzer-service": {
          "name": "Analyzer Service",
          "description": "Uses existing Analyzer service for audio separation",
          "methods": ["spleeter", "demucs"]
        }
      };
    } catch (error) {
      logger.error('Failed to get available methods:', error);
      throw error;
    }
  }
}