import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

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

// Test upload route
router.post('/', upload.single('video'), async (req, res) => {
  try {
    console.log('Test upload - File received:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'ANALYZING',
      },
    });

    console.log('Video created:', video);

    // Trigger analyses (async) - same as in videos.controller.ts
    try {
      const { AnalyzerClient } = require('../services/analyzer.client');
      const { SaliencyClient } = require('../services/saliency.client');
      const analyzerClient = new AnalyzerClient();
      const saliencyClient = new SaliencyClient();
      
      const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
      const videoPath = path.join(videosStoragePath, req.file.filename);
      
      console.log(`Queueing analyses for video ${video.id}`, { videoPath, filename: req.file.filename });
      
      // 1. Standard video analysis
      analyzerClient.analyzeVideo(video.id, videoPath).catch((error: Error) => {
        console.error(`Standard analysis failed for video ${video.id}:`, error);
      });
      
      // 2. Audio separation
      analyzerClient.separateAudioForVideo(video.id, videoPath).catch((error: Error) => {
        console.error(`Audio separation failed for video ${video.id}:`, error);
      });
      
      // 3. Saliency analysis
      saliencyClient.analyzeSaliency(video.id, videoPath).catch((error: Error) => {
        console.error(`Saliency analysis failed for video ${video.id}:`, error);
      });
      
      console.log(`Video uploaded and all analyses queued: ${video.id}`);
    } catch (analysisError) {
      console.error(`Failed to queue analyses for video ${video.id}:`, analysisError);
    }

    res.status(201).json({
      message: 'Video uploaded successfully',
      video,
    });
  } catch (error) {
    console.error('Test upload error:', error as Error);
    res.status(500).json({
      error: 'Upload failed',
      message: (error as Error).message,
    });
  }
});

// Get video file for direct playback
router.get('/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id }
    });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Construct file path - use environment variable or default to /app/storage/videos (Docker path)
    const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
    const videoPath = path.join(videosStoragePath, video.filename);
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Set headers for video streaming
    res.setHeader('Content-Type', video.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Send file
    res.sendFile(path.resolve(videoPath));
  } catch (error) {
    console.error('Get video file error:', error);
    res.status(500).json({ error: 'Failed to get video file' });
  }
});

export default router;
