import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export class VisionClient {
  private client: AxiosInstance;
  private visionServiceUrl: string;

  constructor(visionServiceUrl?: string) {
    this.visionServiceUrl = visionServiceUrl || process.env.VISION_SERVICE_URL || 'http://localhost:8080';
    this.client = axios.create({
      baseURL: this.visionServiceUrl,
      timeout: 5000,
    });
  }

  async getHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn(`Vision service health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.getHealth();
  }
}

