import { writable } from 'svelte/store';
import type { VoiceSegment } from '$lib/api/voice-segment';

export interface ContextMenuData {
  x: number;
  y: number;
  segment: VoiceSegment;
}

export const contextMenuStore = writable<ContextMenuData | null>(null);

