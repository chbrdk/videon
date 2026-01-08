import { writable, derived } from 'svelte/store';
import { projectsApi } from '$lib/api/projects';

export interface SceneActionData {
  sceneId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  order?: number;
  audioLevel?: number;
}

export interface ReorderActionData {
  scenes: Array<{ sceneId: string; order: number }>;
}

export interface SplitActionData {
  sceneId: string;
  splitTime: number;
  newScene1: SceneActionData;
  newScene2: SceneActionData;
}

export interface ResizeActionData {
  sceneId: string;
  startTime: number;
  endTime: number;
}

export type EditActionData = SceneActionData | ReorderActionData | SplitActionData | ResizeActionData;

export interface EditAction {
  type: 'add_scene' | 'delete_scene' | 'split_scene' | 'reorder' | 'audio_level' | 'resize';
  data: EditActionData;
  timestamp: number;
}

// Stores für Undo/Redo Stack
export const undoStack = writable<EditAction[]>([]);
export const redoStack = writable<EditAction[]>([]);

// Current project ID for context
export const currentProjectId = writable<string | null>(null);

// Derived stores for UI state
export const canUndo = derived(undoStack, ($undoStack) => $undoStack.length > 0);
export const canRedo = derived(redoStack, ($redoStack) => $redoStack.length > 0);

// History actions
export function addToHistory(action: EditAction) {
  undoStack.update(stack => {
    // Add to undo stack
    const newStack = [...stack, action];
    
    // Limit stack size to prevent memory issues
    if (newStack.length > 50) {
      return newStack.slice(-50);
    }
    
    return newStack;
  });
  
  // Clear redo stack when new action is performed
  redoStack.set([]);
  
  console.log('📝 Added to history:', action);
}

export async function undo() {
  const currentProject = $currentProjectId();
  if (!currentProject) {
    console.warn('No current project for undo');
    return;
  }

  try {
    const response = await projectsApi.undoLastAction(currentProject);
    console.log('↩️ Undo successful:', response);
    
    // Remove from undo stack (backend handles the actual undo)
    undoStack.update(stack => {
      if (stack.length > 0) {
        return stack.slice(0, -1);
      }
      return stack;
    });
    
    return response;
  } catch (error) {
    console.error('❌ Undo failed:', error);
    throw error;
  }
}

export async function redo() {
  const currentProject = $currentProjectId();
  if (!currentProject) {
    console.warn('No current project for redo');
    return;
  }

  try {
    const response = await projectsApi.redoLastAction(currentProject);
    console.log('↪️ Redo successful:', response);
    
    // Note: Redo implementation is not yet complete in backend
    return response;
  } catch (error) {
    console.error('❌ Redo failed:', error);
    throw error;
  }
}

export function clearHistory() {
  undoStack.set([]);
  redoStack.set([]);
  console.log('🗑️ History cleared');
}

export function setCurrentProject(projectId: string | null) {
  currentProjectId.set(projectId);
  
  // Clear history when switching projects
  if (projectId) {
    clearHistory();
  }
}

// Helper function to get current values
function $currentProjectId() {
  let value: string | null = null;
  currentProjectId.subscribe(v => value = v)();
  return value;
}

// Export the getter function
export { $currentProjectId };
