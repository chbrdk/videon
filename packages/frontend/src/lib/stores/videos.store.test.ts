import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { videos, loading, error } from './videos.store';

describe('Videos Store', () => {
  describe('store initialization', () => {
    it('initializes with empty state', () => {
      expect(get(videos)).toEqual([]);
      expect(get(loading)).toBe(false);
      expect(get(error)).toBe(null);
    });
  });

  describe('store state management', () => {
    it('updates videos array correctly', () => {
      const newVideos = [
        { 
          id: 'video-1', 
          filename: 'video1.mp4', 
          originalName: 'Video 1',
          fileSize: 1024,
          mimeType: 'video/mp4',
          status: 'ANALYZED' as const,
          uploadedAt: '2024-01-01T10:00:00Z'
        }
      ];

      videos.set(newVideos);
      expect(get(videos)).toEqual(newVideos);
    });

    it('updates loading state correctly', () => {
      loading.set(true);
      expect(get(loading)).toBe(true);

      loading.set(false);
      expect(get(loading)).toBe(false);
    });

    it('updates error state correctly', () => {
      error.set('Test error');
      expect(get(error)).toBe('Test error');

      error.set(null);
      expect(get(error)).toBe(null);
    });
  });
});
