import { Request, Response } from 'express';
import path from 'path';
import { WaveformService } from '../services/waveform.service';
import { AudioStemService } from '../services/audio-stem.service';
import { VideoService } from '../services/video.service';
import logger from '../utils/logger';

const waveformService = new WaveformService();
const audioStemService = new AudioStemService();
const videoService = new VideoService();

export class WaveformController {
  
  /**
   * Holt Waveform-Daten für einen Audio-Stem
   */
  async getAudioStemWaveform(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { width = 1000, startTime, endTime } = req.query;
      
      // Hole Audio-Stem Informationen
      const audioStem = await audioStemService.getAudioStemById(id);
      
      if (!audioStem) {
        return res.status(404).json({
          error: 'Audio stem not found'
        });
      }
      
      logger.info(`Generating waveform for audio stem ${id}: ${audioStem.stemType}`);
      
      // Generiere Waveform-Daten
      const waveformData = await waveformService.generateWaveformData(
        audioStem.filePath,
        startTime ? parseFloat(startTime as string) : undefined,
        endTime ? parseFloat(endTime as string) : undefined,
        parseInt(width as string)
      );
      
      res.json({
        audioStemId: id,
        stemType: audioStem.stemType,
        waveform: waveformData
      });
      
    } catch (error) {
      logger.error('Error in getAudioStemWaveform:', error as Error);
      res.status(500).json({
        error: 'Failed to generate waveform for audio stem',
        message: (error as Error).message
      });
    }
  }
  
  /**
   * Holt Waveform-Daten für das Original-Audio eines Videos
   */
  async getVideoWaveform(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const { width = 1000, startTime, endTime } = req.query;
      
      // Hole Video-Informationen
      const video = await videoService.getVideoById(videoId);
      
      if (!video) {
        return res.status(404).json({
          error: 'Video not found'
        });
      }
      
      // Use environment variable or default to Docker path
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, video.filename);
      
      logger.info(`Generating waveform for video ${videoId}: ${video.originalName}`);
      
      // Generiere Waveform-Daten
      const waveformData = await waveformService.generateWaveformData(
        videoPath,
        startTime ? parseFloat(startTime as string) : undefined,
        endTime ? parseFloat(endTime as string) : undefined,
        parseInt(width as string)
      );
      
      res.json({
        videoId: videoId,
        videoName: video.originalName,
        waveform: waveformData
      });
      
    } catch (error) {
      logger.error('Error in getVideoWaveform:', error as Error);
      res.status(500).json({
        error: 'Failed to generate waveform for video',
        message: (error as Error).message
      });
    }
  }
  
  /**
   * Holt Waveform-Daten für eine Scene (Original-Audio Segment)
   */
  async getSceneWaveform(req: Request, res: Response) {
    try {
      const { videoId, sceneId } = req.params;
      const { width = 1000 } = req.query;
      
      // Hole Video-Informationen
      const video = await videoService.getVideoById(videoId);
      
      if (!video) {
        return res.status(404).json({
          error: 'Video not found'
        });
      }
      
      // Hole Scene-Informationen
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const scene = await prisma.scene.findFirst({
        where: { 
          id: sceneId,
          videoId 
        }
      });
      
      if (!scene) {
        return res.status(404).json({
          error: 'Scene not found'
        });
      }
      
      // Use environment variable or default to Docker path
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, video.filename);
      
      logger.info(`Generating waveform for scene ${sceneId}: ${scene.startTime}s - ${scene.endTime}s`);
      
      // Generiere Waveform-Daten für Scene-Timerange
      const waveformData = await waveformService.generateWaveformData(
        videoPath,
        scene.startTime,
        scene.endTime,
        parseInt(width as string)
      );
      
      res.json({
        videoId: videoId,
        sceneId: sceneId,
        startTime: scene.startTime,
        endTime: scene.endTime,
        waveform: waveformData
      });
      
    } catch (error) {
      logger.error('Error in getSceneWaveform:', error as Error);
      res.status(500).json({
        error: 'Failed to generate waveform for scene',
        message: (error as Error).message
      });
    }
  }
  
  /**
   * Löscht Waveform-Cache für eine Datei
   */
  async clearWaveformCache(req: Request, res: Response) {
    try {
      const { audioPath } = req.body;
      
      if (!audioPath) {
        return res.status(400).json({
          error: 'Audio path is required'
        });
      }
      
      waveformService.clearCacheForFile(audioPath);
      
      logger.info(`Cleared waveform cache for ${audioPath}`);
      res.json({
        message: 'Waveform cache cleared successfully'
      });
      
    } catch (error) {
      logger.error('Error in clearWaveformCache:', error as Error);
      res.status(500).json({
        error: 'Failed to clear waveform cache',
        message: (error as Error).message
      });
    }
  }
  
  /**
   * Holt Cache-Statistiken
   */
  async getCacheStats(req: Request, res: Response) {
    try {
      const stats = waveformService.getCacheStats();
      
      res.json({
        cache: stats
      });
      
    } catch (error) {
      logger.error('Error in getCacheStats:', error as Error);
      res.status(500).json({
        error: 'Failed to get cache statistics',
        message: (error as Error).message
      });
    }
  }
}
