import { describe, it, expect } from 'vitest';
import { videosApi } from './videos';

describe('Videos API', () => {
  describe('API instance', () => {
    it('should create videosApi instance', () => {
      expect(videosApi).toBeDefined();
      expect(typeof videosApi.getAllVideos).toBe('function');
      expect(typeof videosApi.getVideoById).toBe('function');
      expect(typeof videosApi.getVideoScenes).toBe('function');
      expect(typeof videosApi.uploadVideo).toBe('function');
    });
  });

  describe('API methods exist', () => {
    it('should have getAllVideos method', () => {
      expect(videosApi.getAllVideos).toBeDefined();
      expect(typeof videosApi.getAllVideos).toBe('function');
    });

    it('should have getVideoById method', () => {
      expect(videosApi.getVideoById).toBeDefined();
      expect(typeof videosApi.getVideoById).toBe('function');
    });

    it('should have getVideoScenes method', () => {
      expect(videosApi.getVideoScenes).toBeDefined();
      expect(typeof videosApi.getVideoScenes).toBe('function');
    });

    it('should have uploadVideo method', () => {
      expect(videosApi.uploadVideo).toBeDefined();
      expect(typeof videosApi.uploadVideo).toBe('function');
    });
  });
});