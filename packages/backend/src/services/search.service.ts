import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai.service';
import logger from '../utils/logger';
import path from 'path';

const prisma = new PrismaClient();

export interface SearchResult {
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number;
  endTime: number;
  content: string;
  thumbnail?: string;
  score: number;
  videoFilePath?: string;
  videoUrl?: string;
}

export class SearchService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    logger.info(`Searching for: ${query}`);

    // Text-basierte Suche (Case-insensitive mit PostgreSQL)
    const matches = await prisma.searchIndex.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive' // PostgreSQL case-insensitive search
        }
      },
      include: {
        video: true,
        scene: true
      },
      orderBy: {
        createdAt: 'desc' // Neueste zuerst
      },
      take: limit
    });

    logger.info(`Found ${matches.length} matches for "${query}"`);

    return matches.map((index: any) => {
      // Use environment variable or default to Docker path
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, index.video.filename);
      const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:4001';

      return {
        videoId: index.videoId,
        videoTitle: index.video.originalName,
        sceneId: index.sceneId || undefined,
        startTime: index.startTime || 0,
        endTime: index.endTime || 0,
        content: index.content,
        thumbnail: index.scene?.keyframePath,
        score: 1.0, // Alle Text-Matches bekommen Score 1.0
        videoFilePath: videoPath,
        videoUrl: `${API_BASE_URL}/api/videos/${index.videoId}/file`
      };
    });
  }
  async searchEntities(query: string, limit: number = 20) {
    logger.info(`Searching entities for: ${query}`);

    const [projects, folders, videos] = await Promise.all([
      prisma.project.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { scenes: true }
      }),
      prisma.folder.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        take: limit,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.video.findMany({
        where: { originalName: { contains: query, mode: 'insensitive' } },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      projects,
      folders,
      videos
    };
  }
}
