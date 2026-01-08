export interface ReframeOptions {
  aspectRatio: string;
  customWidth?: number;
  customHeight?: number;
  smoothingFactor?: number;
}

export interface SaliencyStatus {
  hasAnalysis: boolean;
  analysisCount: number;
  latestAnalysis: {
    id: string;
    createdAt: string;
    frameCount: number;
    sampleRate: number;
    modelVersion: string;
  } | null;
}

export interface ReframingStatus {
  status: string;
  progress: number;
  message?: string;
  completed?: boolean;
}

export interface ReframeResponse {
  message: string;
  videoId: string;
  jobId: string;
  reframedVideoId?: string;
  status: string;
}

export interface ReframedVideo {
  id: string;
  videoId: string;
  aspectRatio: string;
  customWidth?: number;
  customHeight?: number;
  smoothingFactor: number;
  outputPath: string;
  fileSize: number;
  duration: number;
  status: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  saliencyAnalysis?: {
    id: string;
    videoId: string;
    frameCount: number;
    sampleRate: number;
  };
}

import { api } from '../config/environment';

const API_BASE_URL = api.baseUrl;

export const saliencyApi = {
  /**
   * Triggers saliency analysis for a video
   */
  async analyzeSaliency(videoId: string, sampleRate: number = 25, modelVersion: string = 'robust-saliency'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/saliency/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sampleRate,
        modelVersion
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start saliency analysis');
    }
  },
  
  /**
   * Gets saliency analysis status for a video
   */
  async getSaliencyStatus(videoId: string): Promise<SaliencyStatus> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/saliency/status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get saliency status');
    }
    
    return response.json();
  },
  
  /**
   * Triggers video reframing based on saliency data
   */
  async reframeVideo(videoId: string, options: ReframeOptions): Promise<ReframeResponse> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/reframe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start reframing');
    }
    
    return response.json();
  },
  
  /**
   * Gets reframing job status
   */
  async getReframingStatus(jobId: string): Promise<ReframingStatus> {
    const response = await fetch(`${API_BASE_URL}/reframe/${jobId}/status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get reframing status');
    }
    
    return response.json();
  },
  
  /**
   * Gets download URL for completed reframed video
   */
  getReframedVideoUrl(jobId: string): string {
    return `${API_BASE_URL}/reframe/${jobId}/download`;
  },
  
  /**
   * Downloads a reframed video
   */
  async downloadReframedVideo(jobId: string): Promise<void> {
    const url = this.getReframedVideoUrl(jobId);
    window.open(url, '_blank');
  },
  
  /**
   * Gets all reframed versions of a video
   */
  async getReframedVideos(videoId: string): Promise<ReframedVideo[]> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/reframed`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get reframed videos');
    }
    
    return response.json();
  },
  
  /**
   * Deletes a reframed video
   */
  async deleteReframedVideo(reframedVideoId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/reframed-videos/${reframedVideoId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete reframed video');
    }
  },
  
  /**
   * Gets saliency analysis status for a video
   */
  async getSaliencyStatus(videoId: string): Promise<{
    hasAnalysis: boolean;
    analysisCount: number;
    latestAnalysis: {
      id: string;
      createdAt: string;
      frameCount: number;
      sampleRate: number;
      modelVersion: string;
    } | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/saliency/status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get saliency status');
    }
    
    return response.json();
  }
};
