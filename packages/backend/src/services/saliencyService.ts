/**
 * Saliency Service für Backend Integration
 * API Endpoints für Saliency Detection Daten
 */
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export class SaliencyService {
  /**
   * Erstellt Saliency-Analyse-Eintrag
   */
  static async createSaliencyAnalysis(req: Request, res: Response) {
    try {
      const {
        videoId,
        sceneId,
        dataPath,
        heatmapPath,
        roiData,
        frameCount,
        sampleRate,
        modelVersion,
        processingTime
      } = req.body;

      // Validierung
      if (!videoId || !dataPath || !roiData || !frameCount || !modelVersion || !processingTime) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['videoId', 'dataPath', 'roiData', 'frameCount', 'modelVersion', 'processingTime']
        });
      }

      // Prüfe ob Video existiert
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      });

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Prüfe ob Scene existiert (falls sceneId angegeben)
      if (sceneId) {
        const scene = await prisma.scene.findUnique({
          where: { id: sceneId }
        });

        if (!scene) {
          return res.status(404).json({ error: 'Scene not found' });
        }
      }

      // Saliency-Analyse erstellen
      const saliencyAnalysis = await prisma.saliencyAnalysis.create({
        data: {
          videoId,
          sceneId: sceneId || null,
          dataPath,
          heatmapPath: heatmapPath || null,
          roiData,
          frameCount,
          sampleRate: sampleRate || 1,
          modelVersion,
          processingTime
        }
      });

      res.status(201).json({
        id: saliencyAnalysis.id,
        message: 'Saliency analysis created successfully',
        saliencyAnalysis
      });

    } catch (error) {
      console.error('Error creating saliency analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Holt Saliency-Analyse für ein Video
   */
  static async getVideoSaliency(req: Request, res: Response) {
    try {
      const { videoId } = req.params;

      const saliencyAnalysis = await prisma.saliencyAnalysis.findFirst({
        where: { 
          videoId,
          sceneId: null // Nur Video-weite Analysen
        },
        include: {
          video: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              duration: true,
              status: true
            }
          }
        }
      });

      if (!saliencyAnalysis) {
        return res.status(404).json({ error: 'Saliency analysis not found' });
      }

      // Lade Saliency-Daten aus Datei
      let saliencyData = null;
      try {
        if (await fs.access(saliencyAnalysis.dataPath).then(() => true).catch(() => false)) {
          const dataContent = await fs.readFile(saliencyAnalysis.dataPath, 'utf-8');
          saliencyData = JSON.parse(dataContent);
        }
      } catch (error) {
        console.warn('Could not load saliency data file:', error);
      }

      res.json({
        id: saliencyAnalysis.id,
        videoId: saliencyAnalysis.videoId,
        video: saliencyAnalysis.video,
        dataPath: saliencyAnalysis.dataPath,
        heatmapPath: saliencyAnalysis.heatmapPath,
        roiData: JSON.parse(saliencyAnalysis.roiData),
        frameCount: saliencyAnalysis.frameCount,
        sampleRate: saliencyAnalysis.sampleRate,
        modelVersion: saliencyAnalysis.modelVersion,
        processingTime: saliencyAnalysis.processingTime,
        createdAt: saliencyAnalysis.createdAt,
        saliencyData
      });

    } catch (error) {
      console.error('Error fetching video saliency:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Holt Saliency-Analyse für eine Scene
   */
  static async getSceneSaliency(req: Request, res: Response) {
    try {
      const { sceneId } = req.params;

      const saliencyAnalysis = await prisma.saliencyAnalysis.findUnique({
        where: { sceneId },
        include: {
          scene: {
            select: {
              id: true,
              videoId: true,
              startTime: true,
              endTime: true,
              keyframePath: true
            }
          },
          video: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              duration: true,
              status: true
            }
          }
        }
      });

      if (!saliencyAnalysis) {
        return res.status(404).json({ error: 'Scene saliency analysis not found' });
      }

      // Lade Saliency-Daten aus Datei
      let saliencyData = null;
      try {
        if (await fs.access(saliencyAnalysis.dataPath).then(() => true).catch(() => false)) {
          const dataContent = await fs.readFile(saliencyAnalysis.dataPath, 'utf-8');
          saliencyData = JSON.parse(dataContent);
        }
      } catch (error) {
        console.warn('Could not load scene saliency data file:', error);
      }

      res.json({
        id: saliencyAnalysis.id,
        videoId: saliencyAnalysis.videoId,
        sceneId: saliencyAnalysis.sceneId,
        scene: saliencyAnalysis.scene,
        video: saliencyAnalysis.video,
        dataPath: saliencyAnalysis.dataPath,
        heatmapPath: saliencyAnalysis.heatmapPath,
        roiData: JSON.parse(saliencyAnalysis.roiData),
        frameCount: saliencyAnalysis.frameCount,
        sampleRate: saliencyAnalysis.sampleRate,
        modelVersion: saliencyAnalysis.modelVersion,
        processingTime: saliencyAnalysis.processingTime,
        createdAt: saliencyAnalysis.createdAt,
        saliencyData
      });

    } catch (error) {
      console.error('Error fetching scene saliency:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Holt alle Saliency-Analysen für ein Video
   */
  static async getAllVideoSaliency(req: Request, res: Response) {
    try {
      const { videoId } = req.params;

      const saliencyAnalyses = await prisma.saliencyAnalysis.findMany({
        where: { videoId },
        include: {
          scene: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              keyframePath: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        videoId,
        analyses: saliencyAnalyses.map(analysis => ({
          id: analysis.id,
          sceneId: analysis.sceneId,
          scene: analysis.scene,
          dataPath: analysis.dataPath,
          heatmapPath: analysis.heatmapPath,
          roiData: JSON.parse(analysis.roiData),
          frameCount: analysis.frameCount,
          sampleRate: analysis.sampleRate,
          modelVersion: analysis.modelVersion,
          processingTime: analysis.processingTime,
          createdAt: analysis.createdAt
        }))
      });

    } catch (error) {
      console.error('Error fetching all video saliency:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Löscht Saliency-Analyse
   */
  static async deleteSaliencyAnalysis(req: Request, res: Response) {
    try {
      const { analysisId } = req.params;

      const saliencyAnalysis = await prisma.saliencyAnalysis.findUnique({
        where: { id: analysisId }
      });

      if (!saliencyAnalysis) {
        return res.status(404).json({ error: 'Saliency analysis not found' });
      }

      // Lösche zugehörige Dateien
      try {
        if (saliencyAnalysis.dataPath && await fs.access(saliencyAnalysis.dataPath).then(() => true).catch(() => false)) {
          await fs.unlink(saliencyAnalysis.dataPath);
        }
        if (saliencyAnalysis.heatmapPath && await fs.access(saliencyAnalysis.heatmapPath).then(() => true).catch(() => false)) {
          await fs.unlink(saliencyAnalysis.heatmapPath);
        }
      } catch (error) {
        console.warn('Could not delete saliency files:', error);
      }

      // Lösche Datenbank-Eintrag
      await prisma.saliencyAnalysis.delete({
        where: { id: analysisId }
      });

      res.json({
        message: 'Saliency analysis deleted successfully',
        analysisId
      });

    } catch (error) {
      console.error('Error deleting saliency analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Aktualisiert Heatmap-Pfad nach Generierung
   */
  static async updateHeatmapPath(req: Request, res: Response) {
    try {
      const { analysisId } = req.params;
      const { heatmapPath } = req.body;

      if (!heatmapPath) {
        return res.status(400).json({ error: 'heatmapPath is required' });
      }

      const saliencyAnalysis = await prisma.saliencyAnalysis.update({
        where: { id: analysisId },
        data: { heatmapPath }
      });

      res.json({
        message: 'Heatmap path updated successfully',
        saliencyAnalysis
      });

    } catch (error) {
      console.error('Error updating heatmap path:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Holt Saliency-Statistiken für Dashboard
   */
  static async getSaliencyStats(req: Request, res: Response) {
    try {
      const totalAnalyses = await prisma.saliencyAnalysis.count();
      const videoAnalyses = await prisma.saliencyAnalysis.count({
        where: { sceneId: null }
      });
      const sceneAnalyses = await prisma.saliencyAnalysis.count({
        where: { sceneId: { not: null } }
      });

      // Modell-Versionen
      const modelVersions = await prisma.saliencyAnalysis.groupBy({
        by: ['modelVersion'],
        _count: { modelVersion: true }
      });

      // Durchschnittliche Verarbeitungszeit
      const avgProcessingTime = await prisma.saliencyAnalysis.aggregate({
        _avg: { processingTime: true }
      });

      res.json({
        totalAnalyses,
        videoAnalyses,
        sceneAnalyses,
        modelVersions: modelVersions.map(mv => ({
          version: mv.modelVersion,
          count: mv._count.modelVersion
        })),
        averageProcessingTime: avgProcessingTime._avg.processingTime || 0
      });

    } catch (error) {
      console.error('Error fetching saliency stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Holt ROI-Vorschläge für Reframing
   */
  static async getROISuggestions(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const { sceneId } = req.query;

      let whereClause: any = { videoId };
      if (sceneId) {
        whereClause.sceneId = sceneId as string;
      } else {
        whereClause.sceneId = null; // Nur Video-weite Analysen
      }

      const saliencyAnalysis = await prisma.saliencyAnalysis.findFirst({
        where: whereClause
      });

      if (!saliencyAnalysis) {
        return res.status(404).json({ error: 'Saliency analysis not found' });
      }

      const roiData = JSON.parse(saliencyAnalysis.roiData);

      res.json({
        videoId,
        sceneId: saliencyAnalysis.sceneId,
        roiSuggestions: roiData,
        frameCount: saliencyAnalysis.frameCount,
        modelVersion: saliencyAnalysis.modelVersion
      });

    } catch (error) {
      console.error('Error fetching ROI suggestions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
