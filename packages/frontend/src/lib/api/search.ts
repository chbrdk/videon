import { api } from '../config/environment';

const API_BASE_URL = api.baseUrl;

export interface SearchResult {
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number;
  endTime: number;
  content: string;
  thumbnail?: string;
  score: number;
}

export const searchApi = {
  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    return response.json();
  }
};
