import { Router } from 'express';
import { SaliencyClient } from '../services/saliency.client';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

const router = Router();
const saliencyClient = new SaliencyClient();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/saliency/videos/{id}/reframed:
 *   get:
 *     summary: Get all reframed versions of a video
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Video ID
 *     responses:
 *       200:
 *         description: List of reframed videos
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */
router.get('/videos/:id/reframed', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    
    logger.info(`Getting reframed videos for video ${id}`);
    
    const reframedVideos = await prisma.reframedVideo.findMany({
      where: { videoId: id },
      include: {
        saliencyAnalysis: {
          include: {
            video: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Check if processing videos are actually completed
    for (const video of reframedVideos) {
      if (video.status === 'PROCESSING' && video.outputPath && fs.existsSync(video.outputPath)) {
        logger.info(`Updating reframed video ${video.id} to COMPLETED (file exists)`);
        await prisma.reframedVideo.update({
          where: { id: video.id },
          data: {
            status: 'COMPLETED',
            progress: 100.0,
            completedAt: new Date()
          }
        });
        video.status = 'COMPLETED';
        video.progress = 100.0;
      } else if (video.status === 'PROCESSING' && video.outputPath && !fs.existsSync(video.outputPath)) {
        // File doesn't exist, mark as error
        logger.warn(`Reframed video ${video.id} file missing, marking as ERROR`);
        await prisma.reframedVideo.update({
          where: { id: video.id },
          data: {
            status: 'ERROR'
          }
        });
        video.status = 'ERROR';
      }
    }
    
    logger.info(`Found ${reframedVideos.length} reframed videos for video ${id}`);
    
    res.json(reframedVideos);
    
  } catch (error) {
    logger.error(`Error getting reframed videos for video ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Download reframed video
 */
router.get('/videos/:videoId/reframed/:reframedId/download', async (req, res, next) => {
  try {
    const { reframedId } = req.params;
    
    logger.info(`Downloading reframed video ${reframedId}`);
    logger.info(`Range header:`, req.headers.range);
    
    const reframedVideo = await prisma.reframedVideo.findUnique({
      where: { id: reframedId }
    });
    
    if (!reframedVideo) {
      return res.status(404).json({ error: 'Reframed video not found' });
    }
    
    if (reframedVideo.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reframed video is not ready yet' });
    }
    
    // Send file with CORS and range support
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(reframedVideo.outputPath)) {
      logger.error(`Video file not found: ${reframedVideo.outputPath}`);
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Range');
      res.set('Access-Control-Max-Age', '86400'); // 24 hours
      return res.status(200).end();
    }
    
    // Get file stats
    const fileStat = fs.statSync(reframedVideo.outputPath);
    const fileSize = fileStat.size;
    const range = req.headers.range;
    
    // Set CORS and Content-Type headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Range');
    res.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.set('Content-Type', 'video/mp4');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      // Set headers for partial content
      res.status(206);
      res.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Length', chunksize.toString());
      
      logger.info(`Sending range ${start}-${end}/${fileSize}`);
      
      // Stream the file chunk
      const file = fs.createReadStream(reframedVideo.outputPath, { start, end });
      file.pipe(res);
    } else {
      // Send entire file
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Length', fileSize.toString());
      
      logger.info(`Sending full file (${fileSize} bytes)`);
      
      const file = fs.createReadStream(reframedVideo.outputPath);
      file.pipe(res);
    }
    
  } catch (error) {
    logger.error(`Error downloading reframed video ${req.params.reframedId}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * tags:
 *   name: Saliency
 *   description: API for saliency analysis and video reframing
 */

/**
 * @swagger
 * /api/saliency/videos/{id}/saliency/analyze:
 *   post:
 *     summary: Trigger saliency analysis for a video
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Video ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleRate:
 *                 type: integer
 *                 default: 25
 *                 description: Sample every Nth frame
 *               modelVersion:
 *                 type: string
 *                 default: "robust-saliency"
 *                 description: Saliency model version
 *     responses:
 *       200:
 *         description: Saliency analysis started
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */
router.post('/videos/:id/saliency/analyze', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sampleRate = 25, modelVersion = 'robust-saliency' } = req.body;
    
    logger.info(`Starting saliency analysis for video ${id}`);
    
    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id }
    });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Construct video path - use environment variable or default to Docker path
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const videoPath = path.join(videosStoragePath, video.filename);
    
    // Update video status
    await prisma.video.update({
      where: { id },
      data: { status: 'ANALYZING' }
    });
    
    // Trigger saliency analysis
    await saliencyClient.analyzeSaliency(id, videoPath, sampleRate, modelVersion);
    
    logger.info(`Saliency analysis started for video ${id}`);
    
    res.json({
      message: 'Saliency analysis started',
      videoId: id,
      status: 'ANALYZING'
    });
    
  } catch (error) {
    logger.error(`Error starting saliency analysis for video ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * /api/saliency/videos/{id}/reframe:
 *   post:
 *     summary: Reframe a video based on saliency data
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - aspectRatio
 *             properties:
 *               aspectRatio:
 *                 type: string
 *                 description: Target aspect ratio (e.g., "9:16", "16:9", "1:1", "custom")
 *               customWidth:
 *                 type: integer
 *                 description: Custom width (required if aspectRatio is "custom")
 *               customHeight:
 *                 type: integer
 *                 description: Custom height (required if aspectRatio is "custom")
 *               smoothingFactor:
 *                 type: number
 *                 default: 0.3
 *                 description: Smoothing factor for transitions (0.0-1.0)
 *     responses:
 *       200:
 *         description: Reframing started
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Video or saliency data not found
 *       500:
 *         description: Server error
 */
router.post('/videos/:id/reframe', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { aspectRatio, customWidth, customHeight, smoothingFactor = 0.3 } = req.body;
    
    logger.info(`Starting reframing for video ${id} with aspect ratio ${aspectRatio}`);
    
    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        saliencyAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    if (!video.saliencyAnalyses.length) {
      return res.status(400).json({ error: 'No saliency analysis found for this video' });
    }
    
    const saliencyAnalysis = video.saliencyAnalyses[0];
    
    // Parse aspect ratio
    let aspectRatioObj;
    if (aspectRatio === 'custom') {
      if (!customWidth || !customHeight) {
        return res.status(400).json({ error: 'Custom width and height required for custom aspect ratio' });
      }
      aspectRatioObj = { width: customWidth, height: customHeight };
    } else {
      const [width, height] = aspectRatio.split(':').map(Number);
      aspectRatioObj = { width, height };
    }
    
    // Construct paths - use environment variable or default to Docker path
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const videoPath = path.join(videosStoragePath, video.filename);
    const saliencyDataPath = saliencyAnalysis.dataPath;
    
    // Create reframed video record first
    const reframedVideo = await prisma.reframedVideo.create({
      data: {
        videoId: id,
        saliencyId: saliencyAnalysis.id,
        aspectRatio,
        customWidth: aspectRatio === 'custom' ? customWidth : null,
        customHeight: aspectRatio === 'custom' ? customHeight : null,
        smoothingFactor,
        outputPath: '', // Will be updated when job completes
        fileSize: 0,
        duration: video.duration || 0,
        status: 'PROCESSING',
        progress: 0.0
      }
    });
    
    // Start reframing with reframed video ID
    const response = await saliencyClient.reframeVideo({
      videoId: id,
      videoPath,
      saliencyDataPath,
      aspectRatio: aspectRatioObj,
      smoothingFactor,
      outputFormat: 'mp4',
      reframedVideoId: reframedVideo.id
    });
    
    logger.info(`Reframing started for video ${id}, job ${response.jobId}`);
    
    res.json({
      message: 'Reframing started',
      videoId: id,
      jobId: response.jobId,
      reframedVideoId: reframedVideo.id,
      status: 'PROCESSING'
    });
    
  } catch (error) {
    logger.error(`Error starting reframing for video ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * /api/saliency/reframe/{jobId}/status:
 *   get:
 *     summary: Get reframing job status
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: Reframing job ID
 *     responses:
 *       200:
 *         description: Reframing job status
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get('/reframe/:jobId/status', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    // Get reframing status from service
    const status = await saliencyClient.getReframingStatus(jobId);
    
    res.json(status);
    
  } catch (error) {
    logger.error(`Error getting reframing status for job ${req.params.jobId}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * /api/saliency/reframe/{jobId}/download:
 *   get:
 *     summary: Download reframed video
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: Reframing job ID
 *     responses:
 *       200:
 *         description: Reframed video file
 *       404:
 *         description: Job or file not found
 *       400:
 *         description: Job not completed
 *       500:
 *         description: Server error
 */
router.get('/reframe/:jobId/download', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    // Get job status
    const status = await saliencyClient.getReframingStatus(jobId);
    
    if (status.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Job not completed' });
    }
    
    // Construct download URL
    const downloadUrl = `http://localhost:8002/reframe-download/${jobId}`;
    
    // Redirect to saliency service for file download
    res.redirect(downloadUrl);
    
  } catch (error) {
    logger.error(`Error downloading reframed video for job ${req.params.jobId}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * /api/videos/{id}/saliency/status:
 *   get:
 *     summary: Get saliency analysis status for a video
 *     tags: [Saliency]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Saliency analysis status
 *       404:
 *         description: Video not found
 */
router.get('/videos/:id/saliency/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.info(`Getting saliency status for video ${id}`);
    
    // Check for existing saliency analyses
    const saliencyAnalyses = await prisma.saliencyAnalysis.findMany({
      where: { videoId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    const hasAnalysis = saliencyAnalyses.length > 0;
    const latestAnalysis = hasAnalysis ? saliencyAnalyses[0] : null;
    
    res.json({
      hasAnalysis,
      analysisCount: saliencyAnalyses.length,
      latestAnalysis: latestAnalysis ? {
        id: latestAnalysis.id,
        createdAt: latestAnalysis.createdAt,
        frameCount: latestAnalysis.frameCount,
        sampleRate: latestAnalysis.sampleRate,
        modelVersion: latestAnalysis.modelVersion
      } : null
    });
    
  } catch (error) {
    logger.error(`Error getting saliency status for video ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * @swagger
 * /api/saliency-analyses:
 *   post:
 *     summary: Create saliency analysis record
 *     tags: [Saliency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - dataPath
 *               - roiData
 *               - frameCount
 *               - sampleRate
 *               - modelVersion
 *               - processingTime
 *             properties:
 *               videoId:
 *                 type: string
 *               sceneId:
 *                 type: string
 *               dataPath:
 *                 type: string
 *               heatmapPath:
 *                 type: string
 *               roiData:
 *                 type: string
 *               frameCount:
 *                 type: integer
 *               sampleRate:
 *                 type: integer
 *               modelVersion:
 *                 type: string
 *               processingTime:
 *                 type: number
 *     responses:
 *       201:
 *         description: Saliency analysis created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/saliency-analyses', async (req, res, next) => {
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
    
    logger.info(`Creating saliency analysis for video ${videoId}`);
    
    // Create saliency analysis in database
    const saliencyAnalysis = await prisma.saliencyAnalysis.create({
      data: {
        id: `sal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        videoId,
        sceneId,
        dataPath,
        heatmapPath,
        roiData,
        frameCount,
        sampleRate,
        modelVersion,
        processingTime
      }
    });
    
    logger.info(`Saliency analysis created: ${saliencyAnalysis.id}`);
    
    res.status(201).json({
      id: saliencyAnalysis.id,
      message: 'Saliency analysis created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating saliency analysis:', error);
    next(error);
  }
});

// Update reframed video status and details
router.patch('/reframed-videos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { outputPath, fileSize, status, progress } = req.body;
    
    logger.info(`Updating reframed video ${id}`, { outputPath, fileSize, status, progress });
    
    const updatedVideo = await prisma.reframedVideo.update({
      where: { id },
      data: {
        ...(outputPath && { outputPath }),
        ...(fileSize && { fileSize }),
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    });
    
    logger.info(`✅ Reframed video ${id} updated successfully`);
    
    res.json(updatedVideo);
  } catch (error) {
    logger.error(`Error updating reframed video ${req.params.id}:`, error);
    next(error);
  }
});

// Delete reframed video
router.delete('/reframed-videos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting reframed video ${id}`);
    
    // Get the video to delete the file
    const reframedVideo = await prisma.reframedVideo.findUnique({
      where: { id }
    });
    
    if (!reframedVideo) {
      return res.status(404).json({ error: 'Reframed video not found' });
    }
    
    // Delete the file if it exists
    if (reframedVideo.outputPath && fs.existsSync(reframedVideo.outputPath)) {
      try {
        fs.unlinkSync(reframedVideo.outputPath);
        logger.info(`✅ Deleted file: ${reframedVideo.outputPath}`);
      } catch (error) {
        logger.error(`⚠️  Could not delete file: ${reframedVideo.outputPath}`, error);
      }
    }
    
    // Delete the database entry
    await prisma.reframedVideo.delete({
      where: { id }
    });
    
    logger.info(`✅ Reframed video ${id} deleted successfully`);
    
    res.json({ message: 'Reframed video deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting reframed video ${req.params.id}:`, error);
    next(error);
  }
});

export default router;
