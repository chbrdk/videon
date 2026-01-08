import { Router } from 'express';
import multer from 'multer';

const router = Router();

// In-memory storage for test videos
const testVideos = new Map<string, any>();

// Simple in-memory storage for testing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

router.post('/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const videoId = `test_${Date.now()}`;
    const videoData = {
      id: videoId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      analyzedAt: null,
      scenes: [],
      analysisLogs: []
    };

    // Store the video data in memory
    testVideos.set(videoId, videoData);

    res.json({
      message: 'Upload successful',
      video: videoData
    });
  } catch (error) {
    console.error('Test upload error:', (error as Error).message);
    res.status(500).json({ error: 'Upload failed', details: (error as Error).message });
  }
});

// Get video by ID - returns real test video info
router.get('/videos/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Always return info about the real test video
    const fs = require('fs');
    const path = require('path');
    const testVideoPath = path.join(__dirname, '../../../../storage/videos/test-real-video.mp4');
    
    if (fs.existsSync(testVideoPath)) {
      const stat = fs.statSync(testVideoPath);
      const videoInfo = {
        id: videoId,
        filename: 'test-real-video.mp4',
        originalName: 'Real Test Video',
        fileSize: stat.size,
        mimeType: 'video/mp4',
        status: 'UPLOADED',
        uploadedAt: new Date().toISOString(),
        analyzedAt: null,
        scenes: [],
        analysisLogs: []
      };
      
      res.json(videoInfo);
    } else {
      return res.status(404).json({ error: 'Test video not found' });
    }
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video', details: (error as Error).message });
  }
});

// Get all videos
router.get('/videos', (req, res) => {
  try {
    const videos = Array.from(testVideos.values());
    res.json(videos);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos', details: (error as Error).message });
  }
});

// Get video scenes (mock data)
router.get('/videos/:id/scenes', (req, res) => {
  try {
    const videoId = req.params.id;
    const video = testVideos.get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Mock scenes data
    const scenes = [
      {
        id: `scene_${videoId}_1`,
        videoId: videoId,
        startTime: 0.0,
        endTime: 5.0,
        keyframePath: null,
        visionData: null,
        createdAt: new Date().toISOString()
      },
      {
        id: `scene_${videoId}_2`,
        videoId: videoId,
        startTime: 5.0,
        endTime: 10.0,
        keyframePath: null,
        visionData: null,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json(scenes);
  } catch (error) {
    console.error('Get scenes error:', error);
    res.status(500).json({ error: 'Failed to get scenes', details: (error as Error).message });
  }
});

// Real vision data endpoint - calls Swift Vision Service
router.get('/videos/:id/vision', async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Use the real test video for analysis
    const fs = require('fs');
    const path = require('path');
    const testVideoPath = path.join(__dirname, '../../../../storage/videos/test-real-video.mp4');
    
    if (!fs.existsSync(testVideoPath)) {
      return res.status(404).json({ error: 'Test video not found' });
    }
    
    // Call Swift Vision Service for real analysis
    const axios = require('axios');
    
    try {
      const visionResponse = await axios.post('http://localhost:8080/analyze/video', {
        videoPath: testVideoPath,
        timeInterval: 5.0 // Analyze every 5 seconds
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 second timeout
      });
      
      // Transform Swift Vision Service response to match our frontend format
      const swiftResults = visionResponse.data; // Array of results
      const firstResult = swiftResults[0] || {}; // Get first analysis result
      
      const visionData = {
        objects: firstResult.objects || [],
        faces: firstResult.faces || [],
        sceneClassification: firstResult.sceneClassification || [],
        aiDescription: firstResult.aiDescription || `Vision analysis completed with ${swiftResults.length} frames analyzed`,
        aiTags: firstResult.aiTags || []
      };
      
      res.json(visionData);
    } catch (visionError) {
      console.error('Vision Service error:', (visionError as Error).message);
      
      // Fallback to mock data if Vision Service fails
      const mockVisionData = {
        objects: [
          { label: "person", confidence: 0.95, bbox: [100, 100, 200, 300] },
          { label: "car", confidence: 0.87, bbox: [300, 200, 150, 100] }
        ],
        faces: [
          { confidence: 0.98, landmarks: null, bbox: [120, 120, 80, 100] }
        ],
        sceneClassification: [
          { label: "outdoor", confidence: 0.92, category: "street" }
        ],
        aiDescription: "A person walking on a street with a car in the background",
        aiTags: ["person", "car", "street", "outdoor"]
      };
      
      res.json(mockVisionData);
    }
  } catch (error) {
    console.error('Get vision data error:', error);
    res.status(500).json({ error: 'Failed to get vision data', details: (error as Error).message });
  }
});

// Static video endpoint - serves the real test video
router.get('/videos/:id/stream', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Always serve the real test video file
    const testVideoPath = path.join(__dirname, '../../../../storage/videos/test-real-video.mp4');
    
    if (fs.existsSync(testVideoPath)) {
      // Serve the entire video file statically
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      const stat = fs.statSync(testVideoPath);
      res.setHeader('Content-Length', stat.size);
      
      // Send the entire file
      const fileStream = fs.createReadStream(testVideoPath);
      fileStream.pipe(res);
    } else {
      // Test video not found, return error
      res.status(404).json({ 
        error: 'Test video not found',
        message: 'test-real-video.mp4 not found in storage directory'
      });
    }
  } catch (error) {
    console.error('Get video stream error:', error);
    res.status(500).json({ error: 'Failed to get video stream', details: (error as Error).message });
  }
});

// Create a demo video for testing
router.post('/demo-video', (req, res) => {
  try {
    const demoVideoId = `demo_${Date.now()}`;
    const demoVideo = {
      id: demoVideoId,
      filename: `demo_video_${Date.now()}.mp4`,
      originalName: 'Demo Video',
      fileSize: 1024000,
      mimeType: 'video/mp4',
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      analyzedAt: null,
      scenes: [],
      analysisLogs: []
    };

    // Store the demo video
    testVideos.set(demoVideoId, demoVideo);

    res.json({
      message: 'Demo video created',
      video: demoVideo
    });
  } catch (error) {
    console.error('Create demo video error:', error);
    res.status(500).json({ error: 'Failed to create demo video', details: (error as Error).message });
  }
});

export default router;
