// API Client für PrismVid Backend

export interface SearchResult {
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number; // milliseconds
  endTime: number;   // milliseconds
  content: string;
  thumbnail?: string;
  score: number;
  videoFilePath?: string;
  videoUrl?: string;
}

export interface Config {
  serverUrl: string;
  apiToken?: string;
}

export class SearchApiClient {
  private config: Config;

  constructor() {
    this.config = {
      serverUrl: 'http://localhost:4001',
    };
  }

  async loadConfig(): Promise<void> {
    const settings = await this.getStorage();
    if (settings.serverUrl) {
      this.config.serverUrl = settings.serverUrl;
    }
    if (settings.apiToken) {
      this.config.apiToken = settings.apiToken;
    }
  }

  private async getStorage(): Promise<Record<string, any>> {
    try {
      const settings = localStorage.getItem('prismvid_settings');
      return settings ? JSON.parse(settings) : {};
    } catch {
      return {};
    }
  }

  async saveConfig(config: Partial<Config>): Promise<void> {
    this.config = { ...this.config, ...config };
    const settings = {
      ...(await this.getStorage()),
      ...config,
    };
    localStorage.setItem('prismvid_settings', JSON.stringify(settings));
  }

  getConfig(): Config {
    return { ...this.config };
  }

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const url = `${this.config.serverUrl}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const results: SearchResult[] = await response.json();
      
      // Validate results
      return results.map(result => ({
        ...result,
        startTime: result.startTime || 0,
        endTime: result.endTime || 0,
      }));
    } catch (error: any) {
      console.error('Search API error:', error);
      throw new Error(`Network error: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

