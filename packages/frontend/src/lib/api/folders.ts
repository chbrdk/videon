import type { Folder, BreadcrumbItem, SearchResults, CreateFolderDto, UpdateFolderDto, DeleteFolderResponse } from '$lib/types';
import { api } from '../config/environment';

export interface FolderWithContents extends Folder {
  folders: Folder[];
  videos: any[];
}

export class FoldersApi {
  private baseUrl = api.baseUrl;

  async getAllFolders(parentId?: string): Promise<Folder[]> {
    const url = new URL(`${this.baseUrl}/folders`);
    if (parentId) {
      url.searchParams.set('parentId', parentId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch folders: ${response.statusText}`);
    }

    return response.json();
  }

  async getFolderById(id: string): Promise<FolderWithContents> {
    const folderId = id === 'root' ? 'root' : id;
    const response = await fetch(`${this.baseUrl}/folders/${folderId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Folder not found');
      }
      throw new Error(`Failed to fetch folder: ${response.statusText}`);
    }

    return response.json();
  }

  async createFolder(data: CreateFolderDto, parentId?: string): Promise<Folder> {
    const url = new URL(`${this.baseUrl}/folders`);
    if (parentId) {
      url.searchParams.set('parentId', parentId);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create folder: ${response.statusText}`);
    }

    return response.json();
  }

  async updateFolder(id: string, data: UpdateFolderDto): Promise<Folder> {
    const response = await fetch(`${this.baseUrl}/folders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update folder: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFolder(id: string): Promise<DeleteFolderResponse> {
    const response = await fetch(`${this.baseUrl}/folders/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete folder: ${response.statusText}`);
    }

    return response.json();
  }

  async moveVideos(videoIds: string[], folderId: string | null): Promise<void> {
    const targetFolderId = folderId || 'root';
    const response = await fetch(`${this.baseUrl}/folders/${targetFolderId}/move-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to move videos: ${response.statusText}`);
    }
  }

  async getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
    const targetFolderId = folderId || 'root';
    const response = await fetch(`${this.baseUrl}/folders/${targetFolderId}/breadcrumbs`);

    if (!response.ok) {
      throw new Error(`Failed to fetch breadcrumbs: ${response.statusText}`);
    }

    return response.json();
  }

  async search(query: string): Promise<SearchResults> {
    const url = new URL(`${this.baseUrl}/search/entities`);
    url.searchParams.set('q', query);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to search: ${response.statusText}`);
    }

    return response.json();
  }
}
