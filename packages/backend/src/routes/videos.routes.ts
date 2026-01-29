import { Router } from 'express';
import { VideosController } from '../controllers/videos.controller';
import { VisionService } from '../services/vision.service';
import { AnalyzerClient } from '../services/analyzer.client';
import { uploadMiddleware, uploadMultipleMiddleware, handleUploadError } from '../middleware/upload.middleware';
import { validateVideoUpload, validateVideoId, validateSceneId, validateSceneTiming, validateSplitTime, validateAudioLevel } from '../middleware/validation.middleware';
import { getStorageService } from '../services/storage';
import config from '../config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { PremiereExportService } from '../services/premiere-export.service';
import logger from '../utils/logger';
import { t } from '../utils/i18n';

const router: any = Router();
const videosController = new VideosController();
const visionService = new VisionService();
const premiereExportService = new PremiereExportService();

console.log('✅ Loading Videos Routes...');

// Trigger Qwen VL semantic analysis for video - MOVED TO TOP
router.post('/:id/qwenVL/analyze', async (req: any, res: any) => {
  console.log('🎯 Qwen VL Route HIT!', req.path, req.params);
  try {
    const { id } = req.params;
    const QwenVLService = require('../services/qwen-vl.service').QwenVLService;
    const qwenVLService = new QwenVLService();

    // Check availability
    const isAvailable = await qwenVLService.isAvailable();
    if (!isAvailable) {
      return res.status(503).json({
        error: 'Qwen VL Service not available',
        message: 'Qwen VL Service is not running or not reachable',
        debug: {
          url: qwenVLService.getServiceUrl(),
          provider: qwenVLService.provider
        }
      });
    }

    console.log(`🎯 Triggering Qwen VL analysis for video: ${id}`);

    // Start background analysis
    qwenVLService.analyzeVideo(id).catch((error: any) => {
      console.error(`❌ Qwen VL analysis failed for video ${id}:`, error);
    });

    res.json({
      message: 'Qwen VL analysis started',
      videoId: id,
      status: 'ANALYZING'
    });

  } catch (error: any) {
    console.error('❌ Qwen VL analysis trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger Qwen VL analysis' });
  }
});

// Simple multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use environment variable or default to /app/storage/videos (Docker path)
    const uploadPath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
});

// Folders API endpoints (must be before :id routes)
router.get('/folders', async (req: any, res: any) => {
  const locale = req.locale || 'en';
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: t('errors.notFound', locale) });
  }
});

// Simple upload video (single file)
router.post('/', upload.single('video'), validateVideoUpload, (req: any, res: any) =>
  videosController.simpleUpload(req, res)
);

// Multiple video upload (up to 10 files)
router.post('/upload-multiple', uploadMultipleMiddleware, async (req: any, res: any) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { prisma } = require('../lib/prisma');
    const uploadedVideos = [];

    for (const file of files) {
      try {
        // Validate file type
        if (!file.mimetype.startsWith('video/')) {
          console.warn(`Skipping non-video file: ${file.originalname}`);
          continue;
        }

        // Get video metadata using ffprobe
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync(
          `ffprobe -v quiet -print_format json -show_format -show_streams "${file.path}"`
        );
        const metadata = JSON.parse(stdout);
        const duration = parseFloat(metadata.format.duration || 0);

        // Create video record
        const video = await prisma.video.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            duration,
            status: 'UPLOADED',
          },
        });

        uploadedVideos.push(video);
        console.log(`✅ Video uploaded: ${video.id} - ${file.originalname}`);
      } catch (fileError) {
        console.error(`❌ Failed to process file ${file.originalname}:`, fileError);
      }
    }

    if (uploadedVideos.length === 0) {
      return res.status(400).json({ error: 'No valid video files uploaded' });
    }

    res.status(201).json({
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      videos: uploadedVideos,
    });
  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get all videos
router.get('/', (req: any, res: any) => videosController.getAllVideos(req, res));



// Get Qwen VL analysis status for video
router.get('/:id/qwenVL/status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { prisma } = require('../lib/prisma');

    // Get total scenes count
    const totalScenes = await prisma.scene.count({
      where: { videoId: id }
    });

    // Get scenes with Qwen VL analysis
    const analyzedScenes = await prisma.visionAnalysis.count({
      where: {
        scene: { videoId: id },
        qwenVLProcessed: true
      }
    });

    // Check if analysis is complete
    const isComplete = totalScenes > 0 && analyzedScenes === totalScenes;

    // Calculate progress percentage
    const progress = totalScenes > 0 ? (analyzedScenes / totalScenes) * 100 : 0;

    res.json({
      videoId: id,
      status: isComplete ? 'COMPLETED' : 'ANALYZING',
      totalScenes,
      analyzedScenes,
      progress: Math.round(progress),
      isComplete
    });
  } catch (error: any) {
    logger.error('Failed to get Qwen VL status', { videoId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get video file (MUST BE BEFORE /:id route to avoid conflicts)
router.get('/:id/file', async (req: any, res: any) => {
  console.log('🎬 VIDEO FILE ROUTE HIT!', req.method, req.path, req.params);
  const { id } = req.params;
  try {
    const { prisma } = require('../lib/prisma');

    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if using STORION storage
    if (config.storage.type === 'storion') {
      // video.filename might be STORION file ID or local filename
      const storageService = getStorageService();
      const storionFileId = video.filename;

      // Check if file exists in STORION
      const exists = await storageService.fileExists(storionFileId).catch(() => false);
      if (exists) {
        // Redirect to STORION download URL
        const storionUrl = storageService.getFileUrl(storionFileId);
        logger.info('Redirecting to STORION', { videoId: id, storionUrl });
        return res.redirect(302, storionUrl);
      }

      // File not in STORION - fallback to local storage
      logger.info('File not found in STORION, falling back to local storage', {
        videoId: id,
        filename: video.filename
      });
    }

    // Local storage fallback
    let videosStoragePath: string;
    if (process.env.VIDEOS_STORAGE_PATH) {
      videosStoragePath = path.isAbsolute(process.env.VIDEOS_STORAGE_PATH)
        ? process.env.VIDEOS_STORAGE_PATH
        : path.resolve(process.cwd(), process.env.VIDEOS_STORAGE_PATH);
    } else if (process.env.STORAGE_PATH) {
      const storagePath = process.env.STORAGE_PATH;
      const projectRoot = path.resolve(process.cwd(), '..', '..');
      const resolvedStoragePath = path.isAbsolute(storagePath)
        ? storagePath
        : path.resolve(projectRoot, storagePath.startsWith('./') ? storagePath.slice(2) : storagePath);

      videosStoragePath = resolvedStoragePath.endsWith('videos')
        ? resolvedStoragePath
        : path.join(resolvedStoragePath, 'videos');
    } else {
      const projectRoot = path.resolve(process.cwd(), '..', '..');
      videosStoragePath = path.join(projectRoot, 'storage', 'videos');
    }

    let videoPath = path.join(videosStoragePath, video.filename);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      if (fs.existsSync(videosStoragePath)) {
        const files = fs.readdirSync(videosStoragePath);
        const matchingFile = files.find((file: string) => file.includes(video.id) || file === video.filename);
        if (matchingFile) {
          videoPath = path.join(videosStoragePath, matchingFile);
        }
      }
    }

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        error: 'Video file not found',
        filename: video.filename,
        message: 'The video file was not found in storage. It may have been deleted or moved.'
      });
    }

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Support range requests for video seeking
    const range = req.headers.range;
    if (range) {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      res.sendFile(path.resolve(videoPath));
    }
  } catch (error) {
    logger.error('Failed to get video file', { videoId: id, error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get video file' });
  }
});

// Get transcription (must be before /:id route)
router.get('/:id/transcription', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { prisma } = require('../lib/prisma');

    console.log(`🔍 Loading transcription for video: ${id}`);

    const transcription = await prisma.transcription.findFirst({
      where: { videoId: id },
      orderBy: { createdAt: 'desc' } // Hol die neueste Transcription
    });

    if (!transcription) {
      console.log('❌ Transcription not found for video:', id);
      return res.status(404).json({ error: 'Transcription not found' });
    }

    console.log('✅ Transcription loaded:', {
      id: transcription.id,
      language: transcription.language,
      segmentCount: JSON.parse(transcription.segments).length
    });

    res.status(200).json(transcription);
  } catch (error) {
    console.error('❌ Get transcription error:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// Get video by ID
router.get('/:id', validateVideoId, (req: any, res: any) => videosController.getVideoById(req, res));

// Delete video
router.delete('/:id', validateVideoId, (req: any, res: any) => videosController.deleteVideo(req, res));

// Update video
router.patch('/:id', validateVideoId, (req: any, res: any) => videosController.updateVideo(req, res));

// Move video to folder
router.put('/:id/move', (req: any, res: any) => videosController.moveVideo(req, res));


// Get video scenes
router.get('/:id/scenes', (req: any, res: any) => videosController.getVideoScenes(req, res));

// Get vision analysis for video
router.get('/:id/vision', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const { prisma } = require('../lib/prisma');

    logger.info('Fetching vision data', { videoId: id });

    // Get all scenes for this video WITH vision analysis
    const scenes = await prisma.scene.findMany({
      where: { videoId: id },
      include: {
        visionAnalysis: true
      },
      orderBy: { startTime: 'asc' }
    });

    logger.info('Scenes found for vision data', { videoId: id, sceneCount: scenes.length });

    if (scenes.length === 0) {
      logger.warn('No scenes found for vision data', { videoId: id });
      return res.status(200).json([]);
    }

    // Transform data for frontend with vision analysis
    const sceneDataArray = scenes.map((scene: any, index: number) => {
      const vision = scene.visionAnalysis;

      // Parse JSON fields from VisionAnalysis
      const objects = vision?.objects ? JSON.parse(vision.objects) : [];
      const faces = vision?.faces ? JSON.parse(vision.faces) : [];
      const sceneClassification = vision?.sceneClassification ? JSON.parse(vision.sceneClassification) : [];
      const customObjects = vision?.customObjects ? JSON.parse(vision.customObjects) : [];
      const aiTags = vision?.aiTags ? JSON.parse(vision.aiTags) : [];

      // Use Qwen VL description if available, otherwise Apple Intelligence, otherwise fallback
      const aiDescription = vision?.qwenVLDescription
        ? vision.qwenVLDescription
        : vision?.aiDescription
          ? vision.aiDescription
          : `Scene ${index + 1}: ${scene.startTime.toFixed(1)}s - ${scene.endTime.toFixed(1)}s (${(scene.endTime - scene.startTime).toFixed(1)}s duration)`;

      return {
        sceneId: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        keyframePath: scene.keyframePath,
        duration: scene.endTime - scene.startTime,
        // Vision analysis data
        objects: objects,
        faces: faces,
        sceneClassification: sceneClassification,
        customObjects: customObjects,
        aiDescription: aiDescription,
        aiTags: aiTags,
        // Qwen VL metadata
        qwenVLDescription: vision?.qwenVLDescription || null,
        qwenVLProcessed: vision?.qwenVLProcessed || false,
        qwenVLModel: vision?.qwenVLModel || null
      };
    });

    logger.info('Scene data prepared for vision', { videoId: id, sceneCount: sceneDataArray.length });

    res.status(200).json(sceneDataArray);
  } catch (error) {
    const locale = req.locale || 'en';
    logger.error('Failed to fetch vision data', { videoId: id, error: (error as Error).message });
    res.status(500).json({ error: t('errors.notFound', locale) });
  }
});

// Generate thumbnail for specific time
router.get('/:id/thumbnail', (req: any, res: any) =>
  videosController.generateThumbnail(req, res)
);

// Generate scene video (extracted clip)
router.get('/:id/scene-video', (req: any, res: any) =>
  videosController.generateSceneVideo(req, res)
);

// Delete scene video
router.delete('/:id/scene-video', (req: any, res: any) =>
  videosController.deleteSceneVideo(req, res)
);

// Get video file route moved to top (line 97) - duplicate removed

// Create scene manually
router.post('/:id/scenes', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    const { prisma } = require('../lib/prisma');

    console.log('➕ Creating manual scene for video:', id, 'from', startTime, 'to', endTime);

    // Validate input
    if (!startTime || !endTime || startTime >= endTime) {
      return res.status(400).json({ error: 'Invalid startTime or endTime' });
    }

    // Get current max order for this video
    const maxOrderScene = await prisma.scene.findFirst({
      where: { videoId: id },
      orderBy: { order: 'desc' }
    });

    const nextOrder = maxOrderScene ? maxOrderScene.order + 1 : 0;

    // Create new scene
    const scene = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        order: nextOrder,
        keyframePath: null
      }
    });

    console.log('✅ Manual scene created successfully:', scene.id);
    res.status(201).json(scene);

  } catch (error) {
    console.error('❌ Manual scene creation error:', error);
    res.status(500).json({ error: 'Failed to create scene' });
  }
});


// Trigger vision analysis for video
router.post('/:id/vision/analyze', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { prisma } = require('../lib/prisma');

    logger.info('Starting vision analysis', { videoId: id });

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      logger.warn('Video not found for vision analysis', { videoId: id });
      return res.status(404).json({ error: 'Video not found' });
    }

    logger.info('Video found for vision analysis', { videoId: id, filename: video.filename });

    // Update status to analyzing
    await prisma.video.update({
      where: { id },
      data: { status: 'ANALYZING' }
    });

    logger.info('Video status updated to ANALYZING', { videoId: id });

    // Direct scene detection (no external service)
    const SceneDetector = require('../services/scene-detector');
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const videoPath = path.join(videosStoragePath, video.filename);

    console.log('🔍 Starting direct scene detection for:', videoPath);

    try {
      const sceneDetector = new SceneDetector();
      const scenes = await sceneDetector.detectScenes(videoPath);

      console.log(`✅ Detected ${scenes.length} scenes`);

      // Save scenes to database
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        await prisma.scene.create({
          data: {
            videoId: id,
            startTime: scene.startTime,
            endTime: scene.endTime,
            keyframePath: null
          }
        });
        console.log(`✅ Scene ${i + 1} saved: ${scene.startTime.toFixed(2)}s - ${scene.endTime.toFixed(2)}s`);
      }

      // Update video status
      await prisma.video.update({
        where: { id },
        data: {
          status: 'ANALYZED',
          analyzedAt: new Date()
        }
      });

      console.log('✅ Video analysis completed successfully');

      // Trigger transcription automatically in background
      try {
        console.log('🎤 Triggering automatic transcription...');
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4001';
        axios.post(
          `${backendUrl}/api/videos/${id}/transcribe`,
          {},
          { timeout: 300000 }
        ).then(response => {
          console.log('✅ Background transcription completed:', response.data);

          // Automatische Suchindexierung nach automatischer Transkription
          try {
            console.log('🔍 Starting automatic search indexing...');
            const { SearchIndexService } = require('../services/search-index.service');
            const searchIndexService = new SearchIndexService();
            searchIndexService.indexVideo(id).then(() => {
              console.log('✅ Search indexing completed');
            }).catch((indexError: any) => {
              console.error('❌ Search indexing failed:', (indexError as Error).message);
            });
          } catch (indexError) {
            console.error('❌ Search indexing failed:', (indexError as Error).message);
          }
        }).catch(err => {
          console.error('❌ Background transcription failed:', err.message);
        });
      } catch (error) {
        // Non-blocking: transcription runs in background
        console.log('ℹ️ Transcription triggered in background (non-blocking)');
      }

      res.status(200).json({
        message: 'Scene detection completed',
        videoId: id,
        scenesDetected: scenes.length
      });

    } catch (error) {
      console.error('❌ Scene detection failed:', error);

      // Update video status to error
      await prisma.video.update({
        where: { id },
        data: { status: 'ERROR' }
      });

      res.status(500).json({
        error: 'Scene detection failed',
        message: (error as Error).message
      });
    }
  } catch (error) {
    console.error('❌ Vision analysis error:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Get thumbnail for scene
router.get('/:id/scenes/:sceneId/thumbnail', async (req: any, res: any) => {
  try {
    // Set CORS headers for image requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Override CSP for images to allow cross-origin loading
    res.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob: *;");

    // Override CORP to allow cross-origin loading
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');

    const { id, sceneId } = req.params;
    const { prisma } = require('../lib/prisma');
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');

    const execAsync = promisify(exec);

    console.log('🔍 Generating thumbnail for scene:', sceneId);

    // Get scene with video info
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: { video: true }
    });

    if (!scene || scene.videoId !== id) {
      console.log('❌ Scene not found:', sceneId);
      return res.status(404).json({ error: 'Scene not found' });
    }

    // If thumbnail exists, serve it
    if (scene.keyframePath && fs.existsSync(scene.keyframePath)) {
      console.log('✅ Serving existing thumbnail:', scene.keyframePath);
      return res.sendFile(path.resolve(scene.keyframePath));
    }

    // Otherwise generate thumbnail using ffmpeg
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const keyframesStoragePath = process.env.KEYFRAMES_STORAGE_PATH || '/app/storage/keyframes';
    const videoPath = path.join(videosStoragePath, scene.video.filename);
    const thumbnailDir = keyframesStoragePath;
    const thumbnailPath = path.join(thumbnailDir, `${sceneId}_thumb.jpg`);

    console.log('🎬 Generating thumbnail for scene:', scene.startTime, 's');
    console.log('📹 Video path:', videoPath);
    console.log('🖼️ Thumbnail path:', thumbnailPath);

    // Ensure thumbnail directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // Generate thumbnail at scene start time
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss ${scene.startTime} -vframes 1 -q:v 2 "${thumbnailPath}"`;
    console.log('🔧 FFmpeg command:', ffmpegCommand);

    try {
      await execAsync(ffmpegCommand);

      // Update scene with thumbnail path
      await prisma.scene.update({
        where: { id: sceneId },
        data: { keyframePath: thumbnailPath }
      });

      console.log('✅ Thumbnail generated successfully:', thumbnailPath);
      res.sendFile(path.resolve(thumbnailPath));

    } catch (ffmpegError) {
      console.error('❌ FFmpeg error:', ffmpegError);

      // Return a placeholder or error response
      res.status(500).json({
        error: 'Failed to generate thumbnail',
        message: (ffmpegError as Error).message
      });
    }

  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    res.status(500).json({
      error: 'Failed to generate thumbnail',
      message: (error as Error).message
    });
  }
});

// Update scene order
router.put('/:id/scenes/reorder', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { scenes } = req.body; // Array of { sceneId, order }

    const { prisma } = require('../lib/prisma');

    console.log('🔄 Updating scene order for video:', id);

    // Update each scene's order
    for (const sceneUpdate of scenes) {
      await prisma.scene.update({
        where: { id: sceneUpdate.sceneId },
        data: { order: sceneUpdate.order }
      });
    }

    console.log('✅ Scene order updated successfully');
    res.status(200).json({ message: 'Scene order updated' });

  } catch (error) {
    console.error('❌ Scene reorder error:', error);
    res.status(500).json({ error: 'Failed to update scene order' });
  }
});

// Split scene
router.post('/:id/scenes/:sceneId/split', async (req: any, res: any) => {
  try {
    const { id, sceneId } = req.params;
    const { splitTime } = req.body;

    const { prisma } = require('../lib/prisma');

    console.log('✂️ Splitting scene:', sceneId, 'at time:', splitTime);

    // Get original scene
    const originalScene = await prisma.scene.findUnique({
      where: { id: sceneId }
    });

    if (!originalScene || originalScene.videoId !== id) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    if (splitTime <= originalScene.startTime || splitTime >= originalScene.endTime) {
      return res.status(400).json({ error: 'Invalid split time' });
    }

    // Create two new scenes
    const scene1 = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: originalScene.startTime,
        endTime: splitTime,
        keyframePath: null
      }
    });

    const scene2 = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: splitTime,
        endTime: originalScene.endTime,
        keyframePath: null
      }
    });

    // Delete original scene
    await prisma.scene.delete({
      where: { id: sceneId }
    });

    console.log('✅ Scene split successfully');
    res.status(200).json({
      message: 'Scene split successfully',
      scenes: [scene1, scene2]
    });

  } catch (error) {
    console.error('❌ Scene split error:', error);
    res.status(500).json({ error: 'Failed to split scene' });
  }
});

// Delete scene
router.delete('/:id/scenes/:sceneId', async (req: any, res: any) => {
  try {
    const { id, sceneId } = req.params;

    const { prisma } = require('../lib/prisma');

    console.log('🗑️ Deleting scene:', sceneId);

    // Verify scene belongs to video
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId }
    });

    if (!scene || scene.videoId !== id) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Delete scene
    await prisma.scene.delete({
      where: { id: sceneId }
    });

    console.log('✅ Scene deleted successfully');
    res.status(200).json({ message: 'Scene deleted successfully' });

  } catch (error) {
    console.error('❌ Scene deletion error:', error);
    res.status(500).json({ error: 'Failed to delete scene' });
  }
});

// Merge scenes
router.post('/:id/scenes/merge', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { sceneId1, sceneId2 } = req.body;

    const { prisma } = require('../lib/prisma');

    console.log('🔗 Merging scenes:', sceneId1, 'and', sceneId2);

    // Get both scenes
    const scene1 = await prisma.scene.findUnique({
      where: { id: sceneId1 }
    });

    const scene2 = await prisma.scene.findUnique({
      where: { id: sceneId2 }
    });

    if (!scene1 || !scene2 || scene1.videoId !== id || scene2.videoId !== id) {
      return res.status(404).json({ error: 'One or both scenes not found' });
    }

    // Check if scenes are adjacent
    const timeDiff = Math.abs(scene1.endTime - scene2.startTime);
    if (timeDiff > 0.1 && Math.abs(scene2.endTime - scene1.startTime) > 0.1) {
      return res.status(400).json({ error: 'Scenes must be adjacent to merge' });
    }

    // Create merged scene
    const mergedScene = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: Math.min(scene1.startTime, scene2.startTime),
        endTime: Math.max(scene1.endTime, scene2.endTime),
        keyframePath: scene1.keyframePath || scene2.keyframePath
      }
    });

    // Delete original scenes
    await prisma.scene.deleteMany({
      where: {
        id: { in: [sceneId1, sceneId2] }
      }
    });

    console.log('✅ Scenes merged successfully');
    res.status(200).json({
      message: 'Scenes merged successfully',
      scene: mergedScene
    });

  } catch (error) {
    console.error('❌ Scene merge error:', error);
    res.status(500).json({ error: 'Failed to merge scenes' });
  }
});

// Trigger transcription
router.post('/:id/transcribe', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { language } = req.body; // Optional: 'de', 'en', null for auto

    console.log(`🎤 Starting transcription for video: ${id}`);
    console.log(`🌍 Language override: ${language || 'auto-detect'}`);

    // Call Python Analyzer Service - use Docker service name instead of localhost
    const analyzerUrl = process.env.ANALYZER_SERVICE_URL || 'http://analyzer:8001';
    const analyzerResponse = await axios.post(
      `${analyzerUrl}/api/transcribe/${id}`,
      { language },
      { timeout: 300000 } // 5 minute timeout
    );

    console.log('✅ Transcription completed:', analyzerResponse.data);

    // Automatische Suchindexierung nach Transkription
    try {
      console.log('🔍 Starting automatic search indexing...');
      const { SearchIndexService } = require('../services/search-index.service');
      const searchIndexService = new SearchIndexService();
      await searchIndexService.indexVideo(id);
      console.log('✅ Search indexing completed');
    } catch (indexError) {
      console.error('❌ Search indexing failed:', (indexError as Error).message);
      // Non-blocking: Indexierung läuft im Hintergrund
    }

    res.status(200).json(analyzerResponse.data);
  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});


// Timeline Management Endpoints

// Get timeline data (scenes with their order)
router.get('/:id/timeline', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { prisma } = require('../lib/prisma');

    console.log(`🎬 Loading timeline for video: ${id}`);

    const scenes = await prisma.scene.findMany({
      where: { videoId: id },
      orderBy: { order: 'asc' }
    });

    console.log(`✅ Timeline loaded: ${scenes.length} scenes`);
    res.status(200).json(scenes);
  } catch (error) {
    console.error('❌ Get timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Reorder scenes in timeline
router.put('/:id/timeline/reorder', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { newOrder } = req.body; // Array of { sceneId: string, order: number }
    const { prisma } = require('../lib/prisma');

    console.log('🔄 Reordering timeline for video:', id, 'New order:', newOrder);

    // Perform updates in a transaction
    await prisma.$transaction(
      newOrder.map((item: { sceneId: string; order: number; }) =>
        prisma.scene.update({
          where: { id: item.sceneId, videoId: id },
          data: { order: item.order }
        })
      )
    );

    console.log('✅ Timeline reordered successfully');
    res.status(200).json({ message: 'Timeline reordered successfully' });

  } catch (error) {
    console.error('❌ Timeline reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder timeline' });
  }
});

// Split scene
router.post('/:id/timeline/scenes/:sceneId/split', async (req: any, res: any) => {
  try {
    const { id, sceneId } = req.params;
    const { splitTime } = req.body;
    const { prisma } = require('../lib/prisma');

    console.log('✂️ Splitting scene:', sceneId, 'at time:', splitTime);

    const originalScene = await prisma.scene.findUnique({
      where: { id: sceneId, videoId: id }
    });

    if (!originalScene) {
      console.log('❌ Original scene not found:', sceneId);
      return res.status(404).json({ error: 'Original scene not found' });
    }

    if (splitTime <= originalScene.startTime || splitTime >= originalScene.endTime) {
      console.log('❌ Split time out of bounds:', splitTime);
      return res.status(400).json({ error: 'Split time must be within the scene duration' });
    }

    // Create two new scenes
    const newScene1 = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: originalScene.startTime,
        endTime: splitTime,
        order: originalScene.order,
        keyframePath: originalScene.keyframePath // Keep original keyframe for first part
      }
    });

    const newScene2 = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: splitTime,
        endTime: originalScene.endTime,
        order: originalScene.order + 1,
        keyframePath: null // New keyframe might be needed for second part, or generate on demand
      }
    });

    // Delete original scene
    await prisma.scene.delete({
      where: { id: sceneId }
    });

    console.log('✅ Scene split successfully. New scenes:', newScene1.id, newScene2.id);
    res.status(200).json({
      message: 'Scene split successfully',
      scenes: [newScene1, newScene2]
    });

  } catch (error) {
    console.error('❌ Scene split error:', error);
    res.status(500).json({ error: 'Failed to split scene' });
  }
});

// Delete scene
router.delete('/:id/timeline/scenes/:sceneId', async (req: any, res: any) => {
  try {
    const { id, sceneId } = req.params;
    const { prisma } = require('../lib/prisma');

    console.log('🗑️ Deleting scene:', sceneId);

    await prisma.scene.delete({
      where: { id: sceneId, videoId: id }
    });

    console.log('✅ Scene deleted successfully');
    res.status(200).json({ message: 'Scene deleted successfully' });

  } catch (error) {
    console.error('❌ Scene delete error:', error);
    res.status(500).json({ error: 'Failed to delete scene' });
  }
});

// Merge scenes
router.post('/:id/timeline/scenes/merge', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { sceneId1, sceneId2 } = req.body;
    const { prisma } = require('../lib/prisma');

    console.log('🤝 Merging scenes:', sceneId1, 'and', sceneId2);

    const scene1 = await prisma.scene.findUnique({ where: { id: sceneId1, videoId: id } });
    const scene2 = await prisma.scene.findUnique({ where: { id: sceneId2, videoId: id } });

    if (!scene1 || !scene2) {
      return res.status(404).json({ error: 'One or both scenes not found' });
    }

    // Basic check for adjacency (can be more sophisticated)
    if (scene1.endTime !== scene2.startTime && scene2.endTime !== scene1.startTime) {
      return res.status(400).json({ error: 'Scenes must be adjacent to merge' });
    }

    // Create merged scene
    const mergedScene = await prisma.scene.create({
      data: {
        videoId: id,
        startTime: Math.min(scene1.startTime, scene2.startTime),
        endTime: Math.max(scene1.endTime, scene2.endTime),
        order: Math.min(scene1.order, scene2.order),
        keyframePath: scene1.keyframePath || scene2.keyframePath
      }
    });

    // Delete original scenes
    await prisma.scene.deleteMany({
      where: {
        id: { in: [sceneId1, sceneId2] }
      }
    });

    console.log('✅ Scenes merged successfully');
    res.status(200).json({
      message: 'Scenes merged successfully',
      scene: mergedScene
    });

  } catch (error) {
    console.error('❌ Scene merge error:', error);
    res.status(500).json({ error: 'Failed to merge scenes' });
  }
});

// Export timeline
router.get('/:id/timeline/export/:format', async (req: any, res: any) => {
  try {
    const { id, format } = req.params;
    const { prisma } = require('../lib/prisma');

    console.log(`📤 Exporting timeline for video ${id} as ${format}`);

    const scenes = await prisma.scene.findMany({
      where: { videoId: id },
      orderBy: { order: 'asc' }
    });

    if (!scenes || scenes.length === 0) {
      return res.status(404).json({ error: 'No scenes found for export' });
    }

    let exportData: any;

    switch (format.toLowerCase()) {
      case 'json':
        exportData = {
          videoId: id,
          exportDate: new Date().toISOString(),
          format: 'JSON',
          scenes: scenes.map((scene: any) => ({
            id: scene.id,
            order: scene.order,
            startTime: scene.startTime,
            endTime: scene.endTime,
            duration: scene.endTime - scene.startTime,
            keyframePath: scene.keyframePath
          }))
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="timeline-${id}.json"`);
        break;

      case 'edl':
        // EDL (Edit Decision List) format
        let edlContent = 'TITLE: VIDEON Timeline Export\n';
        edlContent += `FCM: NON-DROP FRAME\n\n`;

        scenes.forEach((scene: any, index: number) => {
          const startFrame = Math.round(scene.startTime * 30); // Assuming 30fps
          const endFrame = Math.round(scene.endTime * 30);
          const duration = endFrame - startFrame;

          edlContent += `${index + 1}  AX V     C        ${startFrame} ${endFrame} ${startFrame} ${endFrame}\n`;
          edlContent += `* FROM CLIP NAME: Scene-${scene.id}\n`;
          edlContent += `* DURATION: ${duration} FRAMES\n\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="timeline-${id}.edl"`);
        return res.send(edlContent);

      case 'csv':
        const csvContent = [
          'Scene ID,Order,Start Time,End Time,Duration,Keyframe Path',
          ...scenes.map((scene: any) =>
            `${scene.id},${scene.order},${scene.startTime},${scene.endTime},${scene.endTime - scene.startTime},"${scene.keyframePath || ''}"`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="timeline-${id}.csv"`);
        return res.send(csvContent);

      default:
        return res.status(400).json({ error: 'Unsupported export format. Use: json, edl, csv' });
    }

    console.log('✅ Timeline exported successfully');
    res.status(200).json(exportData);

  } catch (error) {
    console.error('❌ Timeline export error:', error);
    res.status(500).json({ error: 'Failed to export timeline' });
  }
});

// Premiere Pro Export Endpoints

// Export for Premiere Pro (ZIP with video)
router.get('/:id/export/premiere', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🎬 Exporting video ${id} for Premiere Pro (ZIP with video)`);

    const zipBuffer = await premiereExportService.createExportPackage(id, 'premiere');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="premiere_export_${id}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);

    console.log('✅ Premiere Pro export completed');
    res.send(zipBuffer);
  } catch (error) {
    console.error('❌ Premiere Pro export error:', error);
    res.status(500).json({ error: 'Failed to export for Premiere Pro' });
  }
});

// Export XML only (fast)
router.get('/:id/export/premiere/xml', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`📄 Exporting XML only for video ${id}`);

    const videoData = await premiereExportService.getVideoExportData(id);
    if (!videoData) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const xmlContent = premiereExportService.generatePremiereXML(videoData);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="premiere_export_${id}.xml"`);

    console.log('✅ XML export completed');
    res.send(xmlContent);
  } catch (error) {
    console.error('❌ XML export error:', error);
    res.status(500).json({ error: 'Failed to export XML' });
  }
});

// Export for Final Cut Pro
router.get('/:id/export/fcpxml', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🎬 Exporting video ${id} for Final Cut Pro`);

    const zipBuffer = await premiereExportService.createExportPackage(id, 'fcpxml');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="fcpxml_export_${id}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);

    console.log('✅ Final Cut Pro export completed');
    res.send(zipBuffer);
  } catch (error) {
    console.error('❌ Final Cut Pro export error:', error);
    res.status(500).json({ error: 'Failed to export for Final Cut Pro' });
  }
});

// Export SRT only
router.get('/:id/export/srt', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`📝 Exporting SRT for video ${id}`);

    const videoData = await premiereExportService.getVideoExportData(id);
    if (!videoData) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!videoData.transcription) {
      return res.status(404).json({ error: 'No transcription found for this video' });
    }

    const srtContent = premiereExportService.generateSRT(videoData.transcription);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="subtitles_${id}.srt"`);

    console.log('✅ SRT export completed');
    res.send(srtContent);
  } catch (error) {
    console.error('❌ SRT export error:', error);
    res.status(500).json({ error: 'Failed to export SRT' });
  }
});

// Update video status (for saliency service)
router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info(`Updating video ${id} status to ${status}`);

    // Update video status in database
    const updatedVideo = await videosController.updateVideoStatus(id, status);

    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      message: 'Video status updated successfully',
      video: updatedVideo
    });

  } catch (error) {
    logger.error(`Error updating video status:`, error);
    res.status(500).json({ error: 'Failed to update video status' });
  }
});

// Create analysis log (for saliency service)
router.post('/:id/logs', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { level, message, metadata } = req.body;

    logger.info(`Creating analysis log for video ${id}: ${message}`);

    // For now, just log to console - could be stored in database later
    console.log(`[${level.toUpperCase()}] Video ${id}: ${message}`, metadata ? JSON.parse(metadata) : '');

    res.status(201).json({
      message: 'Analysis log created successfully'
    });

  } catch (error) {
    logger.error(`Error creating analysis log:`, error);
    res.status(500).json({ error: 'Failed to create analysis log' });
  }
});

export default router;
