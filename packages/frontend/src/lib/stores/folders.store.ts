import { writable, get } from 'svelte/store';
import { FoldersApi } from '$lib/api/folders';
import type { VideoResponse, Folder, BreadcrumbItem, SearchResults, ContextMenuItem } from '$lib/types';

export interface FolderWithContents extends Folder {
  folders: Folder[];
  videos: VideoResponse[];
}

// State stores
export const folders = writable<Folder[]>([]);
export const currentFolder = writable<Folder | null>(null);
export const breadcrumbs = writable<BreadcrumbItem[]>([]);
export const videosInFolder = writable<VideoResponse[]>([]);
export const viewMode = writable<'grid' | 'list'>('grid');
export const selectedItems = writable<Set<string>>(new Set());
export const searchQuery = writable<string>('');
export const searchResults = writable<SearchResults>({ folders: [], videos: [], projects: [] });
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);

// API instance
const foldersApi = new FoldersApi();

// Actions
export async function loadFolders(parentId?: string) {
  try {
    isLoading.set(true);
    error.set(null);

    const targetId = parentId ?? null;
    const folderId = targetId ? targetId : 'root';

    const [folderData, breadcrumbData] = await Promise.all([
      foldersApi.getFolderById(folderId),
      foldersApi.getBreadcrumbs(targetId)
    ]);

    if (folderData) {
      const isRoot = !folderData.id;
      currentFolder.set(isRoot ? null : folderData);
      folders.set(folderData?.folders ?? []);
      videosInFolder.set(folderData?.videos ?? []);
      searchResults.set({ folders: [], videos: [], projects: [] });
      breadcrumbs.set(breadcrumbData ?? []);
    }
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to load folders');
    console.error('Error loading folders:', err);
    breadcrumbs.set([]);
  } finally {
    isLoading.set(false);
  }
}

export async function createFolder(name: string, parentId?: string) {
  try {
    isLoading.set(true);
    error.set(null);

    const newFolder = await foldersApi.createFolder({
      name: name.trim()
    }, parentId);

    // Refresh current folder contents
    await loadFolders(parentId);

    return newFolder;
  } catch (err) {
    error.set(err.message || 'Failed to create folder');
    console.error('Error creating folder:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function updateFolder(id: string, name: string) {
  try {
    isLoading.set(true);
    error.set(null);

    const updatedFolder = await foldersApi.updateFolder(id, {
      name: name.trim()
    });

    // Refresh current folder contents
    await loadFolders(get(currentFolder)?.id ?? null);

    return updatedFolder;
  } catch (err) {
    error.set(err.message || 'Failed to update folder');
    console.error('Error updating folder:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function deleteFolder(id: string) {
  try {
    isLoading.set(true);
    error.set(null);

    const result = await foldersApi.deleteFolder(id);

    // Refresh current folder contents
    await loadFolders(get(currentFolder)?.id ?? null);

    return result;
  } catch (err) {
    error.set(err.message || 'Failed to delete folder');
    console.error('Error deleting folder:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function moveVideos(videoIds: string[], folderId: string | null) {
  try {
    isLoading.set(true);
    error.set(null);

    await foldersApi.moveVideos(videoIds, folderId);

    // Clear selection
    selectedItems.set(new Set());

    // Refresh current folder contents
    await loadFolders(get(currentFolder)?.id ?? null);
  } catch (err) {
    error.set(err.message || 'Failed to move videos');
    console.error('Error moving videos:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function loadBreadcrumbs(folderId: string | null) {
  try {
    const breadcrumbData = await foldersApi.getBreadcrumbs(folderId);
    breadcrumbs.set(breadcrumbData);
  } catch (err) {
    console.error('Error loading breadcrumbs:', err);
    breadcrumbs.set([]);
  }
}

export async function searchAll(query: string) {
  try {
    if (!query.trim()) {
      searchResults.set({ folders: [], videos: [], projects: [] });
      return;
    }

    isLoading.set(true);
    error.set(null);

    const results = await foldersApi.search(query.trim());
    searchResults.set(results);
  } catch (err) {
    error.set(err.message || 'Failed to search');
    console.error('Error searching:', err);
    searchResults.set({ folders: [], videos: [], projects: [] });
  } finally {
    isLoading.set(false);
  }
}

// Selection helpers
export function toggleSelection(id: string) {
  selectedItems.update(items => {
    const newItems = new Set(items);
    if (newItems.has(id)) {
      newItems.delete(id);
    } else {
      newItems.add(id);
    }
    return newItems;
  });
}

export function selectAll(items: string[]) {
  selectedItems.set(new Set(items));
}

export function deselectAll() {
  selectedItems.set(new Set());
}

export function isSelected(id: string): boolean {
  return get(selectedItems).has(id);
}

// View mode helpers
export function setViewMode(mode: 'grid' | 'list') {
  viewMode.set(mode);
}

// Navigation helpers
export function navigateToFolder(folderId: string | null) {
  loadFolders(folderId);
}

export function navigateToParent() {
  const current = get(currentFolder);
  if (current?.parentId) {
    loadFolders(current.parentId);
  } else {
    loadFolders(); // Go to root
  }
}

// Context menu helpers
export function getFolderContextMenuItems(folder: Folder): ContextMenuItem[] {
  return [
    {
      label: 'Umbenennen',
      icon: 'edit',
      action: () => {
        // This would trigger a rename dialog
        console.log('Rename folder:', folder.name);
      }
    },
    {
      label: 'Löschen',
      icon: 'delete',
      action: () => {
        // This would trigger a delete confirmation
        console.log('Delete folder:', folder.name);
      }
    }
  ];
}

export function getVideoContextMenuItems(video: VideoResponse): ContextMenuItem[] {
  return [
    {
      label: 'In Ordner verschieben',
      icon: 'folder',
      action: () => {
        // This would trigger a folder selection dialog
        console.log('Move video to folder:', video.originalName);
      }
    },
    {
      label: 'Löschen',
      icon: 'delete',
      action: () => {
        // This would trigger a delete confirmation
        console.log('Delete video:', video.originalName);
      }
    }
  ];
}

export async function moveVideoToFolder(videoId: string, folderId: string | null) {
  try {
    isLoading.set(true);
    error.set(null);

    await videosApi.moveVideo(videoId, folderId);

    // Refresh current folder contents
    await loadFolders(get(currentFolder)?.id ?? null);

    console.log(`Video ${videoId} moved to folder ${folderId || 'root'}`);
  } catch (err) {
    error.set(err.message || 'Failed to move video');
    console.error('Error moving video:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

// Initialize
export function initializeFolders() {
  loadFolders(); // Load root folder
}
