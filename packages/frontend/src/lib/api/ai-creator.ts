import { apiRequest } from './api-client';
import { api } from '../config/environment';

const API_BASE_URL = api.baseUrl;

// Type Definitions
export interface SelectedScene {
  videoId: string;
  sceneId?: string;
  startTime: number;
  endTime: number;
  order: number;
  reasoning: string;
}

export interface VideoSuggestion {
  id: string;
  title: string;
  description: string;
  scenes: SelectedScene[];
  totalDuration: number;
  tone: string;
  createdAt: string;
}

export interface AnalyzeResponse {
  success: boolean;
  suggestions: VideoSuggestion[];
}

export interface CreateProjectResponse {
  success: boolean;
  projectId: string;
  message: string;
}

export interface SuggestionResponse {
  success: boolean;
  suggestion: VideoSuggestion;
}

export interface HealthResponse {
  success: boolean;
  available: boolean;
  model: string;
  cachedSuggestions: number;
}

/**
 * AI Creator API Client
 * Provides methods for interacting with the AI-powered video creator
 */
export const aiCreatorApi = {
  /**
   * Analyze a user query and generate video suggestions
   * @param query Natural language query describing the desired video
   * @param variantCount Number of video variants to generate (1-3)
   * @returns Array of video suggestions
   */
  async analyzeQuery(
    query: string,
    variantCount: number = 1
  ): Promise<VideoSuggestion[]> {
    const response = await apiRequest(`${API_BASE_URL}/ai-creator/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variantCount })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: Failed to analyze query`);
    }

    const data: AnalyzeResponse = await response.json();
    return data.suggestions;
  },

  /**
   * Create a project from a video suggestion
   * @param suggestionId ID of the cached suggestion
   * @param adjustments Optional adjustments to apply to the suggestion
   * @returns Project ID of the created project
   */
  async createProject(
    suggestionId: string,
    adjustments?: Partial<VideoSuggestion>
  ): Promise<string> {
    const response = await apiRequest(`${API_BASE_URL}/ai-creator/create-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId, adjustments })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: Failed to create project`);
    }

    const data: CreateProjectResponse = await response.json();
    return data.projectId;
  },

  /**
   * Get a cached suggestion by ID
   * @param id Suggestion ID
   * @returns Video suggestion
   */
  async getSuggestion(id: string): Promise<VideoSuggestion> {
    const response = await apiRequest(`${API_BASE_URL}/ai-creator/suggestions/${id}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: Failed to get suggestion`);
    }

    const data: SuggestionResponse = await response.json();
    return data.suggestion;
  },

  /**
   * Check if the AI Creator service is available
   * @returns Health status
   */
  async health(): Promise<HealthResponse> {
    const response = await apiRequest(`${API_BASE_URL}/ai-creator/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Health check failed`);
    }

    return response.json();
  },

  /**
   * Regenerate a suggestion with different parameters
   * This is a convenience method that calls analyzeQuery again
   * @param query Original query
   * @param variantCount Number of variants
   * @returns New suggestions
   */
  async regenerateSuggestion(
    query: string,
    variantCount: number = 1
  ): Promise<VideoSuggestion[]> {
    return this.analyzeQuery(query, variantCount);
  }
};

