import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface AudioStemData {
  id: string;
  videoId: string;
  sceneId?: string | null;
  projectSceneId?: string | null;
  stemType: string;
  filePath: string;
  fileSize: number;
  duration?: number | null;
  startTime?: number | null;
  endTime?: number | null;
  createdAt: Date;
}

export class AudioStemService {
  
  /**
   * Erstellt einen neuen Audio-Stem Eintrag
   */
  async createAudioStem(data: {
    videoId: string;
    sceneId?: string;
    projectSceneId?: string;
    stemType: string;
    filePath: string;
    fileSize: number;
    duration?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<AudioStemData> {
    try {
      logger.info(`Creating audio stem: ${data.stemType} for video ${data.videoId}${data.sceneId ? `, scene ${data.sceneId}` : ''}`);
      
      const audioStem = await prisma.audioStem.create({
        data: {
          videoId: data.videoId,
          sceneId: data.sceneId,
          projectSceneId: data.projectSceneId,
          stemType: data.stemType,
          filePath: data.filePath,
          fileSize: data.fileSize,
          duration: data.duration,
          startTime: data.startTime,
          endTime: data.endTime
        }
      });
      
      logger.info(`Audio stem created successfully: ${audioStem.id}`);
      return audioStem;
      
    } catch (error) {
      logger.error(`Failed to create audio stem: ${error}`);
      throw error;
    }
  }
  
  /**
   * Holt alle Audio-Stems für ein Video
   */
  async getAudioStemsForVideo(videoId: string): Promise<AudioStemData[]> {
    try {
      const audioStems = await prisma.audioStem.findMany({
        where: { videoId },
        orderBy: { createdAt: 'asc' }
      });
      
      logger.info(`Found ${audioStems.length} audio stems for video ${videoId}`);
      return audioStems;
      
    } catch (error) {
      logger.error(`Failed to get audio stems for video ${videoId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Holt Audio-Stems für eine spezifische Scene
   */
  async getAudioStemsForScene(videoId: string, sceneId: string): Promise<AudioStemData[]> {
    try {
      const audioStems = await prisma.audioStem.findMany({
        where: { 
          videoId,
          sceneId 
        },
        orderBy: { createdAt: 'asc' }
      });
      
      logger.info(`Found ${audioStems.length} audio stems for scene ${sceneId}`);
      return audioStems;
      
    } catch (error) {
      logger.error(`Failed to get audio stems for scene ${sceneId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Holt alle Audio-Stems für alle Scenes eines Projects
   */
  async getAudioStemsForProjectScenes(projectId: string): Promise<AudioStemData[]> {
    try {
      // Hole alle Project-Scenes
      const projectScenes = await prisma.projectScene.findMany({
        where: { projectId },
        include: {
          video: true
        },
        orderBy: { order: 'asc' }
      });
      
      if (projectScenes.length === 0) {
        logger.info(`No scenes found for project ${projectId}`);
        return [];
      }
      
      // Hole alle Audio-Stems für diese Videos
      const videoIds = [...new Set(projectScenes.map(ps => ps.videoId))];
      const audioStems = await prisma.audioStem.findMany({
        where: { 
          videoId: { in: videoIds }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      logger.info(`Found ${audioStems.length} audio stems for project ${projectId} (${videoIds.length} videos)`);
      return audioStems;
      
    } catch (error) {
      logger.error(`Failed to get audio stems for project ${projectId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Prüft ob Audio-Stems für eine Scene bereits existieren
   */
  async hasAudioStemsForScene(videoId: string, sceneId: string): Promise<boolean> {
    try {
      const count = await prisma.audioStem.count({
        where: { 
          videoId,
          sceneId 
        }
      });
      
      return count > 0;
      
    } catch (error) {
      logger.error(`Failed to check audio stems for scene ${sceneId}: ${error}`);
      return false;
    }
  }
  
  /**
   * Löscht Audio-Stems für eine Scene
   */
  async deleteAudioStemsForScene(videoId: string, sceneId: string): Promise<void> {
    try {
      const deleted = await prisma.audioStem.deleteMany({
        where: { 
          videoId,
          sceneId 
        }
      });
      
      logger.info(`Deleted ${deleted.count} audio stems for scene ${sceneId}`);
      
    } catch (error) {
      logger.error(`Failed to delete audio stems for scene ${sceneId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Löscht Audio-Stems für ein Video
   */
  async deleteAudioStemsForVideo(videoId: string): Promise<void> {
    try {
      const deleted = await prisma.audioStem.deleteMany({
        where: { videoId }
      });
      
      logger.info(`Deleted ${deleted.count} audio stems for video ${videoId}`);
      
    } catch (error) {
      logger.error(`Failed to delete audio stems for video ${videoId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Holt Audio-Stem nach ID
   */
  async getAudioStemById(id: string): Promise<AudioStemData | null> {
    try {
      const audioStem = await prisma.audioStem.findUnique({
        where: { id }
      });
      
      return audioStem;
      
    } catch (error) {
      logger.error(`Failed to get audio stem ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Löscht einen einzelnen Audio-Stem
   */
  async deleteAudioStem(id: string): Promise<void> {
    try {
      logger.info(`Deleting audio stem: ${id}`);

      const audioStem = await prisma.audioStem.findUnique({
        where: { id }
      });

      if (!audioStem) {
        throw new Error(`Audio stem not found: ${id}`);
      }

      // Delete the file from storage
      if (fs.existsSync(audioStem.filePath)) {
        fs.unlinkSync(audioStem.filePath);
        logger.info(`Deleted audio file: ${audioStem.filePath}`);
      }

      // Delete from database
      await prisma.audioStem.delete({
        where: { id }
      });

      logger.info(`Audio stem deleted successfully: ${id}`);

    } catch (error) {
      logger.error(`Failed to delete audio stem: ${error}`);
      throw error;
    }
  }

  /**
   * Löscht alle Scene-spezifischen Audio-Stems für ein Video (behält nur full-video Stems)
   */
  async deleteAudioStemsByVideoIdAndSceneId(videoId: string): Promise<number> {
    try {
      logger.info(`Deleting scene-specific audio stems for video: ${videoId}`);

      const result = await prisma.audioStem.deleteMany({
        where: {
          videoId: videoId,
          sceneId: {
            not: null
          }
        }
      });

      logger.info(`Deleted ${result.count} scene-specific audio stems for video ${videoId}`);
      return result.count;

    } catch (error) {
      logger.error(`Failed to delete scene-specific audio stems: ${error}`);
      throw error;
    }
  }
  
  /**
   * Aktualisiert Audio-Stem Metadaten
   */
  async updateAudioStem(id: string, data: {
    duration?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<AudioStemData> {
    try {
      const audioStem = await prisma.audioStem.update({
        where: { id },
        data
      });
      
      logger.info(`Audio stem ${id} updated successfully`);
      return audioStem;
      
    } catch (error) {
      logger.error(`Failed to update audio stem ${id}: ${error}`);
      throw error;
    }
  }
}