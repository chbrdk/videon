/**
 * Centralized API client for external service communication
 * Reduces code duplication across services
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from './logger';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VIDEON-Backend/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API response', {
          status: response.status,
          url: response.config.url,
          duration: (response.config as any).metadata?.endTime - (response.config as any).metadata?.startTime
        });
        return response;
      },
      async (error) => {
        const config = error.config;
        
        if (config && config.retryCount < this.config.retries) {
          config.retryCount = (config.retryCount || 0) + 1;
          
          logger.warn('API request failed, retrying', {
            url: config.url,
            attempt: config.retryCount,
            error: error.message
          });

          await this.delay(this.config.retryDelay * config.retryCount);
          return this.client(config);
        }

        logger.error('API request failed after retries', {
          url: config?.url,
          status: error.response?.status,
          error: error.message
        });

        return Promise.reject(error);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }

  async upload<T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
    return response.data;
  }
}

// Pre-configured clients for different services
export const analyzerClient = new ApiClient({
  baseURL: process.env.ANALYZER_SERVICE_URL || 'http://localhost:5000'
});

export const visionClient = new ApiClient({
  baseURL: process.env.VISION_SERVICE_URL || 'http://localhost:8080'
});

export default ApiClient;
