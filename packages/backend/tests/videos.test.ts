import request from 'supertest';
import app from '../src/app';
import os from 'os';
import path from 'path';

describe('Videos API', () => {
  beforeAll(() => {
    // Ensure tests never try to write to container-only paths like /app/storage
    const base = path.join(os.tmpdir(), 'videon-backend-tests');
    process.env.STORAGE_PATH = base;
    process.env.VIDEOS_STORAGE_PATH = path.join(base, 'videos');
    process.env.KEYFRAMES_STORAGE_PATH = path.join(base, 'keyframes');
    process.env.WAVEFORMS_STORAGE_PATH = path.join(base, 'waveforms');

    // Avoid Prisma init errors in tests that hit handlers accessing DB.
    // Real integration tests should set a real DATABASE_URL.
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';
  });

  describe('GET /api/videos', () => {
    it('should return list of videos', async () => {
      const response = await request(app)
        .get('/api/videos')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/videos', () => {
    it('should upload a video successfully', async () => {
      const response = await request(app)
        .post('/api/videos')
        .attach('video', Buffer.from('fake video content'), 'test-video.mp4')
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('video');
      expect(response.body.video).toHaveProperty('id');
      expect(response.body.video).toHaveProperty('originalName', 'test-video.mp4');
      expect(response.body.video).toHaveProperty('status', 'UPLOADED');
    });

    it('should reject non-video files', async () => {
      const response = await request(app)
        .post('/api/videos')
        .attach('video', Buffer.from('fake text content'), 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/videos/:id', () => {
    it('should return video details', async () => {
      // First create a video
      const uploadResponse = await request(app)
        .post('/api/videos')
        .attach('video', Buffer.from('fake video content'), 'test-video.mp4')
        .expect(201);

      const videoId = uploadResponse.body.video.id;

      const response = await request(app)
        .get(`/api/videos/${videoId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', videoId);
      expect(response.body).toHaveProperty('scenes');
      expect(response.body).toHaveProperty('analysisLogs');
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app)
        .get('/api/videos/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not found');
    });
  });

  describe('GET /api/videos/:id/scenes', () => {
    it('should return video scenes', async () => {
      // First create a video
      const uploadResponse = await request(app)
        .post('/api/videos')
        .attach('video', Buffer.from('fake video content'), 'test-video.mp4')
        .expect(201);

      const videoId = uploadResponse.body.video.id;

      const response = await request(app)
        .get(`/api/videos/${videoId}/scenes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });
});

describe('Root endpoint', () => {
  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'VIDEON API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });
  });
});
