import { Request, Response } from 'express';
import { AudioStemService } from '../services/audio-stem.service';
import { VideoService } from '../services/video.service';
import { AnalyzerClient } from '../services/analyzer.client';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { execAsync } from '../utils/file-helper';
import axios from 'axios';

const audioStemService = new AudioStemService();
const videoService = new VideoService();
const analyzerClient = new AnalyzerClient();

// Helper function to create scene-specific audio stems
async function createSceneAudioStems(videoId: string, sceneId: string, startTime: number, endTime: number) {
  try {
    logger.info(`🎵 Creating audio stems for scene ${sceneId} (${startTime}-${endTime}s)`);
    
    // Get video file path
    const video = await videoService.getVideoById(videoId);
    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }
    
    // Construct video file path from filename
    const videoPath = path.join('/Volumes/DOCKER_EXTERN/prismvid', 'storage', 'videos', video.filename);
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    // Create output directory
    const outputDir = path.join('/Volumes/DOCKER_EXTERN/prismvid', 'storage', 'audio_stems', videoId, sceneId);
    fs.mkdirSync(outputDir, { recursive: true });
    
    const duration = endTime - startTime;
    const stemTypes = ['vocals', 'music', 'original'];
    
    // First, extract the audio segment
    const tempAudioPath = path.join(outputDir, `${sceneId}_temp.wav`);
    const extractCommand = [
      'ffmpeg', '-y',
      '-i', videoPath,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-vn', // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit
      '-ar', '44100', // Sample rate
      tempAudioPath
    ].join(' ');
    
    logger.info(`🎵 Extracting audio segment: ${extractCommand}`);
    await execAsync(extractCommand);
    
    // Create original stem (copy of extracted audio)
    if ('original' in stemTypes) {
      const originalPath = path.join(outputDir, `${sceneId}_original.wav`);
      const copyCommand = [
        'ffmpeg', '-y',
        '-i', tempAudioPath,
        '-acodec', 'pcm_s16le',
        originalPath
      ].join(' ');
      
      await execAsync(copyCommand);
      const stats = fs.statSync(originalPath);
      
      await audioStemService.createAudioStem({
        videoId,
        projectSceneId: sceneId,
        stemType: 'original',
        filePath: originalPath,
        fileSize: stats.size,
        duration: duration,
        startTime: startTime,
        endTime: endTime
      });
      
      logger.info(`✅ Created original stem: ${originalPath}`);
    }
    
    // Use a simpler approach: create different audio stems using FFmpeg filters
    if ('vocals' in stemTypes || 'music' in stemTypes) {
      logger.info(`🎵 Creating audio stems using FFmpeg filters...`);
      
      // For vocals: use high-pass filter to emphasize voice frequencies
      if ('vocals' in stemTypes) {
        const vocalsPath = path.join(outputDir, `${sceneId}_vocals.wav`);
        const vocalsCommand = [
          'ffmpeg', '-y',
          '-i', tempAudioPath,
          '-af', 'highpass=f=300,lowpass=f=3400', // Voice frequency range
          '-acodec', 'pcm_s16le',
          vocalsPath
        ].join(' ');
        
        logger.info(`🎵 Creating vocals stem: ${vocalsCommand}`);
        await execAsync(vocalsCommand);
        const stats = fs.statSync(vocalsPath);
        
        await audioStemService.createAudioStem({
          videoId,
          projectSceneId: sceneId,
          stemType: 'vocals',
          filePath: vocalsPath,
          fileSize: stats.size,
          duration: duration,
          startTime: startTime,
          endTime: endTime
        });
        
        logger.info(`✅ Created vocals stem: ${vocalsPath}`);
      }
      
      // For music: use low-pass filter to emphasize music frequencies
      if ('music' in stemTypes) {
        const musicPath = path.join(outputDir, `${sceneId}_music.wav`);
        const musicCommand = [
          'ffmpeg', '-y',
          '-i', tempAudioPath,
          '-af', 'lowpass=f=300,highpass=f=50', // Music frequency range
          '-acodec', 'pcm_s16le',
          musicPath
        ].join(' ');
        
        logger.info(`🎵 Creating music stem: ${musicCommand}`);
        await execAsync(musicCommand);
        const stats = fs.statSync(musicPath);
        
        await audioStemService.createAudioStem({
          videoId,
          projectSceneId: sceneId,
          stemType: 'music',
          filePath: musicPath,
          fileSize: stats.size,
          duration: duration,
          startTime: startTime,
          endTime: endTime
        });
        
        logger.info(`✅ Created music stem: ${musicPath}`);
      }
    }
    
    // Clean up temp file
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
    
    logger.info(`🎵 Successfully created ${stemTypes.length} audio stems for scene ${sceneId}`);
    
  } catch (error) {
    logger.error(`❌ Failed to create audio stems for scene ${sceneId}:`, error);
    throw error;
  }
}

// Audio separation status tracker
const audioSeparationStatus = new Map<string, string>();

export class AudioStemController {
  async getAudioStems(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const stems = await audioStemService.getAudioStemsForVideo(videoId);
      
      logger.info(`Retrieved ${stems.length} audio stems for video ${videoId}`);
      res.json(stems);
    } catch (error) {
      logger.error('Error in getAudioStems:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch audio stems',
        message: (error as Error).message
      });
    }
  }
  
  async getAudioStemsForScene(req: Request, res: Response) {
    try {
      const { videoId, sceneId } = req.params;
      const stems = await audioStemService.getAudioStemsForScene(videoId, sceneId);
      
      logger.info(`Retrieved ${stems.length} audio stems for scene ${sceneId}`);
      res.json(stems);
    } catch (error) {
      logger.error('Error in getAudioStemsForScene:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch audio stems for scene',
        message: (error as Error).message
      });
    }
  }
  
  async getAudioStemsForProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const stems = await audioStemService.getAudioStemsForProjectScenes(projectId);
      
      logger.info(`Retrieved ${stems.length} audio stems for project ${projectId}`);
      res.json(stems);
    } catch (error) {
      logger.error('Error in getAudioStemsForProject:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch audio stems for project',
        message: (error as Error).message
      });
    }
  }
  
  async separateAudioForScene(req: Request, res: Response) {
    try {
      const { projectId, sceneId } = req.params;
      const { startTime, endTime, stemTypes } = req.body;
      
      logger.info(`Manually triggering audio separation for scene ${sceneId}`);
      
      // Hole Scene-Informationen
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const projectScene = await prisma.projectScene.findFirst({
        where: { 
          id: sceneId,
          projectId 
        },
        include: {
          video: true
        }
      });
      
      if (!projectScene) {
        return res.status(404).json({
          error: 'Project scene not found'
        });
      }
      
      // Create audio stems directly with FFmpeg (without Analyzer Service)
      await createSceneAudioStems(
        projectScene.videoId,
        sceneId,
        startTime || projectScene.startTime,
        endTime || projectScene.endTime
      );
      
      res.json({ 
        message: 'Audio separation completed for scene',
        sceneId: sceneId,
        projectId: projectId
      });
    } catch (error) {
      logger.error('Error in separateAudioForScene:', error as Error);
      res.status(500).json({
        error: 'Failed to start audio separation for scene',
        message: (error as Error).message
      });
    }
  }

  async separateAudio(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      
      // Get video information
      const video = await videoService.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({
          error: 'Video not found'
        });
      }
      
      // Use environment variable or default to Docker path
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, video.filename);
      
      logger.info(`Starting audio separation for video ${videoId}`);
      
      // Set audio separation status to processing
      audioSeparationStatus.set(videoId, 'processing');
      logger.info(`Audio separation status set to processing for ${videoId}`);
      
      // Start actual audio separation in background
      this.performAudioSeparation(videoId, videoPath).catch(error => {
        logger.error(`Audio separation failed for video ${videoId}:`, error);
        audioSeparationStatus.set(videoId, 'failed');
      });
      
      res.json({ 
        message: 'Audio separation started',
        videoId: videoId
      });
    } catch (error) {
      logger.error('Error in separateAudio:', error as Error);
      res.status(500).json({
        error: 'Failed to start audio separation',
        message: (error as Error).message
      });
    }
  }

  private async performAudioSeparation(videoId: string, videoPath: string) {
    try {
      logger.info(`🎵 Starting audio separation for video ${videoId}`);
      
      // Call analyzer service
      await analyzerClient.separateAudioForVideo(videoId, videoPath);
      
      // Wait a bit for the analyzer to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if audio stems were created
      const stems = await audioStemService.getAudioStemsForVideo(videoId);
      
      if (stems.length > 0) {
        logger.info(`✅ Audio separation completed for video ${videoId}, found ${stems.length} stems`);
        audioSeparationStatus.set(videoId, 'completed');
      } else {
        logger.warn(`⚠️ Audio separation completed but no stems found for video ${videoId}`);
        audioSeparationStatus.set(videoId, 'failed');
      }
      
    } catch (error) {
      logger.error(`❌ Audio separation failed for video ${videoId}:`, error);
      audioSeparationStatus.set(videoId, 'failed');
    }
  }

    async separateAudioWithSpleeter(req: Request, res: Response) {
        try {
            const { videoId } = req.params;
            
            const video = await videoService.getVideoById(videoId);
            if (!video) {
                return res.status(404).json({ error: 'Video not found' });
            }
            
            // Use environment variable or default to Docker path
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, video.filename);
            
            logger.info(`🎵 Starting Spleeter audio separation for video ${videoId}`);
            
            // Trigger audio separation via analyzer service
            await analyzerClient.separateAudioForVideo(videoId, videoPath);
            
            res.json({ 
                message: 'Spleeter audio separation started',
                videoId: videoId
            });
        } catch (error) {
            logger.error('Error in separateAudioWithSpleeter:', error as Error);
            res.status(500).json({
                error: 'Failed to start Spleeter audio separation',
                message: (error as Error).message
            });
        }
    }

  async getAudioSeparationStatus(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      
      // Check if audio separation is in progress
      const status = audioSeparationStatus.get(videoId);
      if (status === 'processing') {
        return res.json({
          status: 'processing',
          videoId: videoId,
          message: 'Audio separation in progress'
        });
      } else if (status === 'failed') {
        return res.json({
          status: 'failed',
          videoId: videoId,
          message: 'Audio separation failed'
        });
      }
      
      // Prüfe ob Audio Stems für dieses Video existieren
      const stems = await audioStemService.getAudioStemsForVideo(videoId);
      
      if (stems.length > 0) {
        // Audio Stems existieren - Separation ist abgeschlossen
        audioSeparationStatus.set(videoId, 'completed');
        res.json({
          status: 'completed',
          videoId: videoId,
          stemsCount: stems.length,
          stems: stems.map(stem => ({
            id: stem.id,
            stemType: stem.stemType,
            filePath: stem.filePath,
            fileSize: stem.fileSize,
            duration: stem.duration,
            createdAt: stem.createdAt
          }))
        });
      } else {
        res.json({
          status: 'not_started',
          videoId: videoId,
          message: 'Audio separation not started'
        });
      }
      
    } catch (error) {
      logger.error('Error in getAudioSeparationStatus:', error as Error);
      res.status(500).json({
        error: 'Failed to get audio separation status',
        message: (error as Error).message
      });
    }
  }
  
  async getAudioStemById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stem = await audioStemService.getAudioStemById(id);
      
      if (!stem) {
        return res.status(404).json({
          error: 'Audio stem not found'
        });
      }
      
      logger.info(`Retrieved audio stem ${id}: ${stem.stemType}`);
      res.json(stem);
    } catch (error) {
      logger.error('Error in getAudioStemById:', error as Error);
      res.status(500).json({
        error: 'Failed to fetch audio stem',
        message: (error as Error).message
      });
    }
  }
  
  async streamAudioStem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stem = await audioStemService.getAudioStemById(id);
      
      if (!stem) {
        return res.status(404).json({
          error: 'Audio stem not found'
        });
      }
      
      logger.info(`Streaming audio stem ${id}: ${stem.stemType}`);
      
      // Set CORS headers (use set() instead of header() to ensure they're properly set)
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Range');
      res.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
      
      // Handle OPTIONS request for CORS preflight
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Max-Age', '86400'); // 24 hours
        return res.status(200).end();
      }
      
      // Set content type based on file extension
      const ext = path.extname(stem.filePath);
      const contentType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';
      res.contentType(contentType);
      
      // Stream the file with range support for partial content
      const fileStat = fs.statSync(stem.filePath);
      const fileSize = fileStat.size;
      const range = req.headers.range;
      
      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(stem.filePath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(stem.filePath).pipe(res);
      }
    } catch (error) {
      logger.error('Error in streamAudioStem:', error as Error);
      res.status(500).json({
        error: 'Failed to stream audio stem',
        message: (error as Error).message
      });
    }
  }
  
  async createAudioStem(req: Request, res: Response) {
    try {
      const { 
        videoId, 
        sceneId, 
        stemType, 
        filePath, 
        fileSize, 
        duration,
        startTime,
        endTime
      } = req.body;
      
      const audioStem = await audioStemService.createAudioStem({
        videoId,
        sceneId,
        stemType,
        filePath,
        fileSize,
        duration,
        startTime,
        endTime
      });
      
      logger.info(`Created audio stem ${audioStem.id} for video ${videoId}${sceneId ? `, scene ${sceneId}` : ''}`);
      res.status(201).json(audioStem);
    } catch (error) {
      logger.error('Error in createAudioStem:', error as Error);
      res.status(500).json({
        error: 'Failed to create audio stem',
        message: (error as Error).message
      });
    }
  }
  
  async deleteAudioStem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await audioStemService.deleteAudioStem(id);
      
      logger.info(`Deleted audio stem ${id}`);
      res.json({ 
        message: 'Audio stem deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteAudioStem:', error as Error);
      res.status(500).json({
        error: 'Failed to delete audio stem',
        message: (error as Error).message
      });
    }
  }

  // Delete old scene-specific stems (keep only full-video stems)
  async deleteOldSceneStems(req: Request, res: Response) {
    try {
      const { videoId } = req.params;

      logger.info(`🗑️ Deleting old scene-specific stems for video ${videoId}`);

      // Get all scene-specific stems first to delete their files
      const sceneStems = await audioStemService.getAudioStemsForVideo(videoId);
      const stemsToDelete = sceneStems.filter(stem => stem.sceneId !== null);

      logger.info(`Found ${stemsToDelete.length} scene-specific stems to delete`);

      // Delete files from storage
      let deletedFiles = 0;
      for (const stem of stemsToDelete) {
        try {
          if (fs.existsSync(stem.filePath)) {
            fs.unlinkSync(stem.filePath);
            deletedFiles++;
            logger.info(`Deleted audio file: ${stem.filePath}`);
          }
        } catch (fileError) {
          logger.warn(`Failed to delete file ${stem.filePath}: ${(fileError as Error).message}`);
        }
      }

      // Delete from database
      const deletedStems = await audioStemService.deleteAudioStemsByVideoIdAndSceneId(videoId);

      logger.info(`✅ Deleted ${deletedStems} old scene-specific stems for video ${videoId} (${deletedFiles} files)`);

      res.json({
        message: `Deleted ${deletedStems} old scene-specific stems`,
        deletedCount: deletedStems,
        deletedFiles: deletedFiles,
        videoId: videoId
      });

    } catch (error) {
      logger.error('Error deleting old scene-specific stems:', error as Error);
      res.status(500).json({
        error: 'Failed to delete old scene-specific stems',
        message: (error as Error).message
      });
    }
  }
}
