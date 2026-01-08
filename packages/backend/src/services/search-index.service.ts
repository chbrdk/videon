import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class SearchIndexService {
  private openaiService: OpenAIService;
  
  constructor() {
    this.openaiService = new OpenAIService();
  }
  
  async indexVideo(videoId: string): Promise<void> {
    logger.info(`Starting indexing for video ${videoId}`);
    
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcriptions: true,
        scenes: {
          include: { visionAnalysis: true }
        }
      }
    });
    
    if (!video) throw new Error('Video not found');
    
    // Lösche alte Index-Einträge
    await prisma.searchIndex.deleteMany({ where: { videoId } });
    
    // Index Transkription
    if (video.transcriptions[0]) {
      await this.indexTranscription(videoId, video.transcriptions[0]);
    }
    
    // Index Vision-Tags pro Szene
    for (const scene of video.scenes) {
      if (scene.visionAnalysis) {
        await this.indexVisionData(videoId, scene);
      }
    }
    
    logger.info(`Indexing completed for video ${videoId}`);
  }
  
  private async indexTranscription(videoId: string, transcription: any): Promise<void> {
    const segments = JSON.parse(transcription.segments);
    
    // Gruppiere Segmente in ~30 Sekunden Chunks für bessere Suche
    const chunks = this.groupSegments(segments, 30);
    
    for (const chunk of chunks) {
      const content = chunk.segments.map((s: any) => s.text).join(' ');
      
      // Erstelle einfaches Embedding (Array von 0en) für Kompatibilität
      const dummyEmbedding = new Array(1536).fill(0);
      
      await prisma.searchIndex.create({
        data: {
          videoId,
          sceneId: null,
          content,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          embedding: JSON.stringify(dummyEmbedding),
          contentType: 'transcription',
          language: transcription.language
        }
      });
    }
  }
  
  private groupSegments(segments: any[], maxDuration: number) {
    const chunks: any[] = [];
    let currentChunk: any = { segments: [], startTime: 0, endTime: 0 };
    
    for (const segment of segments) {
      if (currentChunk.segments.length === 0) {
        currentChunk.startTime = segment.start;
      }
      
      currentChunk.segments.push(segment as any);
      currentChunk.endTime = segment.end;
      
      if (segment.end - currentChunk.startTime >= maxDuration) {
        chunks.push({ ...currentChunk });
        currentChunk = { segments: [], startTime: 0, endTime: 0 };
      }
    }
    
    if (currentChunk.segments.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  private async indexVisionData(videoId: string, scene: any): Promise<void> {
    const visionAnalysis = scene.visionAnalysis;
    
    // Kombiniere alle Vision-Informationen
    const contentParts = [];
    
    // Qwen VL Beschreibung (höchste Priorität - semantisch am reichhaltigsten)
    if (visionAnalysis.qwenVLDescription) {
      contentParts.push(visionAnalysis.qwenVLDescription);
    }
    
    if (visionAnalysis.aiDescription) {
      contentParts.push(visionAnalysis.aiDescription);
    }
    
    if (visionAnalysis.sceneCategory) {
      contentParts.push(`Scene: ${visionAnalysis.sceneCategory}`);
    }
    
    const objects = JSON.parse(visionAnalysis.objects || '[]');
    if (objects.length > 0) {
      contentParts.push(`Objects: ${objects.map((o: any) => o.label).join(', ')}`);
    }
    
    if (contentParts.length === 0) return;
    
    const content = contentParts.join('. ');
    
    // Erstelle einfaches Embedding (Array von 0en) für Kompatibilität
    const dummyEmbedding = new Array(1536).fill(0);
    
    await prisma.searchIndex.create({
      data: {
        videoId,
        sceneId: scene.id,
        content,
        startTime: scene.startTime,
        endTime: scene.endTime,
        embedding: JSON.stringify(dummyEmbedding),
        contentType: 'vision',
        language: null
      }
    });
  }
}
