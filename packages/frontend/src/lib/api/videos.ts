import { browser } from '$app/environment';
import { api } from '../config/environment';
import { apiRequest } from './api-client';

const API_BASE_URL = api.baseUrl;

export interface Video {
  id: string;
  filename: string;
  originalName: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  status: 'UPLOADED' | 'ANALYZING' | 'ANALYZED' | 'ERROR';
  folderId?: string;
  folderName?: string;
  uploadedAt: string;
  analyzedAt?: string;
}

export interface Scene {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  keyframePath?: string;
  visionData?: any;
  createdAt: string;
}

export interface VideoWithScenes extends Video {
  scenes: Scene[];
  analysisLogs: any[];
  audioStems?: AudioStem[];
}

export interface AudioStem {
  id: string;
  videoId: string;
  stemType: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  createdAt: string;
}

export interface UploadResponse {
  message: string;
  video: Video;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

class VideosApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await apiRequest(url, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error: ApiError = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('video', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/videos`);
      xhr.withCredentials = true; // ← Send cookies with upload
      xhr.send(formData);
    });
  }

  async getAllVideos(): Promise<Video[]> {
    return this.request<Video[]>('/videos');
  }

  async getVideosByFolder(folderId: string | null): Promise<Video[]> {
    const params = folderId !== undefined ? `?folderId=${folderId || 'null'}` : '';
    return this.request<Video[]>(`/videos${params}`);
  }

  async getVideoById(id: string): Promise<VideoWithScenes> {
    return this.request<VideoWithScenes>(`/videos/${id}`);
  }

  async getVideoScenes(id: string): Promise<Scene[]> {
    return this.request<Scene[]>(`/videos/${id}/scenes`);
  }

  getVideoUrl(id: string): string {
    return `${API_BASE_URL}/videos/${id}/file`;
  }

  async getHealth(): Promise<any> {
    return this.request('/health');
  }

  async updateVideo(id: string, data: { originalName?: string; description?: string }): Promise<Video> {
    return this.request<Video>(`/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteVideo(videoId: string): Promise<{ message: string; deletedItems: any }> {
    return this.request<{ message: string; deletedItems: any }>(`/videos/${videoId}`, {
      method: 'DELETE',
    });
  }

  async moveVideo(videoId: string, folderId: string | null): Promise<void> {
    await this.request(`/videos/${videoId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ folderId }),
    });
  }

  async analyzeFull(videoId: string): Promise<{ message: string; videoId: string }> {
    return this.request<{ message: string; videoId: string }>(`/videos/${videoId}/analyze/full`, {
      method: 'POST',
    });
  }

  // Audio Stems API
  async getAudioStems(videoId: string): Promise<AudioStem[]> {
    return this.request<AudioStem[]>(`/audio-stems/videos/${videoId}/audio-stems`);
  }

  async separateAudio(videoId: string): Promise<{ message: string; videoId: string }> {
    return this.request<{ message: string; videoId: string }>(`/audio-stems/videos/${videoId}/separate-audio`, {
      method: 'POST',
    });
  }

  async spleeterSeparateAudio(videoId: string): Promise<{ message: string; videoId: string }> {
    return this.request<{ message: string; videoId: string }>(`/audio-stems/videos/${videoId}/spleeter-separate`, {
      method: 'POST',
    });
  }

  async getAudioSeparationStatus(videoId: string): Promise<{
    status: 'processing' | 'completed' | 'failed' | 'not_started';
    videoId: string;
    stemsCount?: number;
    stems?: Array<{
      id: string;
      stemType: string;
      filePath: string;
      fileSize: number;
      duration?: number;
      createdAt: string;
    }>;
    message?: string;
  }> {
    return this.request(`/audio-stems/videos/${videoId}/status`);
  }

  getAudioStemUrl(audioStemId: string): string {
    return `${API_BASE_URL}/audio-stems/${audioStemId}/stream`;
  }

  getSceneVideoUrl(videoId: string, startTime: number, endTime: number, trimStart: number = 0, trimEnd: number = 0): string {
    return `${API_BASE_URL}/videos/${videoId}/scene-video?startTime=${startTime}&endTime=${endTime}&trimStart=${trimStart}&trimEnd=${trimEnd}`;
  }

  async deleteSceneVideo(videoId: string, startTime: number, endTime: number): Promise<void> {
    const response = await apiRequest(
      `${API_BASE_URL}/videos/${videoId}/scene-video?startTime=${startTime}&endTime=${endTime}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete scene video');
  }
}

export const videosApi = new VideosApi();
