import { api } from '../config/environment';

const API_BASE_URL = api.baseUrl;

export interface Collaborator {
    id: string; // share id
    userId: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: 'VIEWER' | 'EDITOR';
    createdAt: string;
}

export interface SharedItem {
    id: string;
    name: string; // Video filename or Project name
    sharedRole: 'VIEWER' | 'EDITOR';
    type?: 'project' | 'video' | 'folder';
    owner?: {
        name: string | null;
        email: string;
    };
}

export interface SharedItemsResponse {
    projects: any[]; // Typed loosely to avoid circular deps with Project types for now
    videos: any[];
    folders: any[];
}

class SharingApi {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Ensure cookies are sent
            ...options,
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch {
                errorMessage = await response.text() || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async shareProject(projectId: string, email: string, role: 'VIEWER' | 'EDITOR'): Promise<{ success: true, message: string }> {
        return this.request(`/sharing/projects/${projectId}/share`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
    }

    async shareVideo(videoId: string, email: string, role: 'VIEWER' | 'EDITOR'): Promise<{ success: true, message: string }> {
        return this.request(`/sharing/videos/${videoId}/share`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
    }

    async shareFolder(folderId: string, email: string, role: 'VIEWER' | 'EDITOR'): Promise<{ success: true, message: string }> {
        return this.request(`/sharing/folders/${folderId}/share`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
    }

    async getProjectCollaborators(projectId: string): Promise<Collaborator[]> {
        return this.request<Collaborator[]>(`/sharing/projects/${projectId}/collaborators`);
    }

    async getVideoCollaborators(videoId: string): Promise<Collaborator[]> {
        return this.request<Collaborator[]>(`/sharing/videos/${videoId}/collaborators`);
    }

    async getFolderCollaborators(folderId: string): Promise<Collaborator[]> {
        return this.request<Collaborator[]>(`/sharing/folders/${folderId}/collaborators`);
    }

    async removeProjectShare(projectId: string, userId: string): Promise<void> {
        return this.request(`/sharing/projects/${projectId}/share`, {
            method: 'DELETE',
            body: JSON.stringify({ userId })
        });
    }

    async removeVideoShare(videoId: string, userId: string): Promise<void> {
        return this.request(`/sharing/videos/${videoId}/share`, {
            method: 'DELETE',
            body: JSON.stringify({ userId })
        });
    }

    async removeFolderShare(folderId: string, userId: string): Promise<void> {
        return this.request(`/sharing/folders/${folderId}/share`, {
            method: 'DELETE',
            body: JSON.stringify({ userId })
        });
    }

    async getSharedWithMe(): Promise<SharedItemsResponse> {
        return this.request<SharedItemsResponse>('/sharing/shared-with-me');
    }
}

export const sharingApi = new SharingApi();
