import { PrismaClient } from '@prisma/client';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/prismvid_test';
process.env.ANALYZER_URL = 'http://localhost:5000';
process.env.STORAGE_PATH = '/tmp/test-storage';
process.env.MAX_FILE_SIZE = '2147483648';

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockVideo = {
    id: 'test-video-id',
    filename: 'test-video.mp4',
    originalName: 'test-video.mp4',
    fileSize: 1024 * 1024,
    mimeType: 'video/mp4',
    status: 'UPLOADED',
    uploadedAt: new Date(),
    analyzedAt: null,
  };

  const mockPrisma = {
    video: {
      findMany: jest.fn().mockResolvedValue([mockVideo]),
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.id === 'non-existent-id') {
          return null;
        }
        return Promise.resolve({
          ...mockVideo,
          scenes: [],
          analysisLogs: [],
        });
      }),
      create: jest.fn().mockResolvedValue(mockVideo),
      update: jest.fn().mockResolvedValue(mockVideo),
    },
    scene: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'test-scene-id',
        videoId: 'test-video-id',
        startTime: 0,
        endTime: 10,
        keyframePath: null,
        visionData: null,
        createdAt: new Date(),
      }),
    },
    analysisLog: {
      create: jest.fn().mockResolvedValue({
        id: 'test-log-id',
        videoId: 'test-video-id',
        level: 'INFO',
        message: 'Test log',
        metadata: null,
        createdAt: new Date(),
      }),
    },
    $disconnect: jest.fn(),
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock multer
jest.mock('multer', () => {
  const mockDiskStorage = jest.fn();
  const mockMulter = jest.fn(() => ({
    single: jest.fn(() => (req: any, res: any, next: any) => {
      // Simulate file validation based on filename
      const filename = req.body?.video || 'test-video.mp4';
      const isVideo = filename.includes('.mp4') || filename.includes('.avi') || filename.includes('.mov');
      
      if (isVideo) {
        req.file = {
          filename: 'test-video.mp4',
          originalname: filename,
          mimetype: 'video/mp4',
          size: 1024 * 1024, // 1MB
          path: '/tmp/test-video.mp4',
        };
      } else {
        // Simulate validation error for non-video files
        const error = new Error('Only video files are allowed');
        return next(error);
      }
      next();
    }),
  }));
  
  mockMulter.diskStorage = mockDiskStorage;
  
  return {
    __esModule: true,
    default: mockMulter,
  };
});

// Mock axios for analyzer client
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    status: 200,
    data: { message: 'Analysis triggered' },
  }),
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: { status: 'healthy' },
  }),
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(() => true),
}));
