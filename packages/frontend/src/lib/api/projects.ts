import { api } from '../config/environment';

const API_BASE_URL = api.baseUrl;

export interface Project {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  scenes: ProjectScene[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScene {
  id: string;
  projectId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  order: number;
  audioLevel?: number;
  video: {
    id: string;
    originalName: string;
    filename: string;
  };
}

export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async getProjectById(id: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  async createProject(data: { name: string; description?: string }): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  async updateProject(id: string, data: { name?: string; description?: string }): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  async addSceneToProject(projectId: string, sceneData: {
    videoId: string;
    startTime: number;
    endTime: number;
  }): Promise<ProjectScene> {
    console.log('API: Adding scene to project:', projectId, sceneData);

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sceneData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to add scene: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  async reorderScenes(projectId: string, scenes: { sceneId: string; order: number }[]): Promise<void> {
    console.log('API: Reordering scenes:', projectId, scenes);

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/scenes/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenes })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to reorder scenes: ${response.status} ${errorText}`);
    }
  },

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },

  async updateSceneTiming(sceneId: string, updates: {
    startTime?: number;
    endTime?: number;
    trimStart?: number;
    trimEnd?: number;
  }): Promise<ProjectScene> {
    const response = await fetch(`${API_BASE_URL}/projects/scenes/${sceneId}/timing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update scene timing');
    return response.json();
  },

  async removeScene(sceneId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/scenes/${sceneId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to remove scene');
  },

  async getProjectTranscriptionSegments(projectId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/transcription-segments`);
    if (!response.ok) throw new Error('Failed to fetch transcription segments');
    return response.json();
  },

  // New editing APIs
  async splitScene(sceneId: string, splitTime: number): Promise<{ scene1: ProjectScene; scene2: ProjectScene }> {
    const response = await fetch(`${API_BASE_URL}/projects/scenes/${sceneId}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ splitTime })
    });
    if (!response.ok) throw new Error('Failed to split scene');
    return response.json();
  },

  async updateSceneAudioLevel(sceneId: string, audioLevel: number): Promise<ProjectScene> {
    const response = await fetch(`${API_BASE_URL}/projects/scenes/${sceneId}/audio-level`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioLevel })
    });
    if (!response.ok) throw new Error('Failed to update audio level');
    return response.json();
  },

  async getProjectHistory(projectId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/history`);
    if (!response.ok) throw new Error('Failed to fetch project history');
    return response.json();
  },

  async undoLastAction(projectId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/undo`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to undo last action');
    return response.json();
  },

  async redoLastAction(projectId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/redo`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to redo last action');
    return response.json();
  }
};
