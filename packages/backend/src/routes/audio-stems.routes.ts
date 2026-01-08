import { Router } from 'express';
import cors from 'cors';
import { AudioStemController } from '../controllers/audio-stem.controller';
import { WaveformController } from '../controllers/waveform.controller';

const router = Router();
const audioStemController = new AudioStemController();
const waveformController = new WaveformController();

// Enhanced CORS middleware for audio streaming
const streamCors = cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
});

// Get audio stems for a video
router.get('/videos/:videoId/audio-stems', (req, res) => {
  audioStemController.getAudioStems(req, res);
});

// Get audio stems for a specific scene
router.get('/videos/:videoId/scenes/:sceneId/audio-stems', (req, res) => {
  audioStemController.getAudioStemsForScene(req, res);
});

// Get audio stems for all scenes in a project
router.get('/projects/:projectId/audio-stems', (req, res) => {
  audioStemController.getAudioStemsForProject(req, res);
});

// Get audio stem by ID
router.get('/:id', (req, res) => {
  audioStemController.getAudioStemById(req, res);
});

// Stream audio stem file (with enhanced CORS)
router.get('/:id/stream', streamCors, (req, res) => {
  audioStemController.streamAudioStem(req, res);
});

// Get waveform data for audio stem
router.get('/:id/waveform', (req, res) => {
  waveformController.getAudioStemWaveform(req, res);
});

// Get waveform data for video original audio
router.get('/videos/:videoId/waveform', (req, res) => {
  waveformController.getVideoWaveform(req, res);
});

// Start audio separation for a video
router.post('/videos/:videoId/separate-audio', (req, res) => {
  audioStemController.separateAudio(req, res);
});

// Start Spleeter audio separation for a video (macOS-optimized)
router.post('/videos/:videoId/spleeter-separate', (req, res) => {
  audioStemController.separateAudioWithSpleeter(req, res);
});

// Get audio separation status for a video
router.get('/videos/:videoId/status', (req, res) => {
  audioStemController.getAudioSeparationStatus(req, res);
});

// Manually trigger audio separation for a scene
router.post('/projects/:projectId/scenes/:sceneId/separate-audio', (req, res) => {
  audioStemController.separateAudioForScene(req, res);
});

// Create audio stem (used by analyzer service)
router.post('/', (req, res) => {
  audioStemController.createAudioStem(req, res);
});

// Delete audio stem
router.delete('/audio-stems/:id', (req, res) => {
  audioStemController.deleteAudioStem(req, res);
});

// Delete old scene-specific stems (keep only full-video stems)
router.delete('/videos/:videoId/old-scene-stems', (req, res) => {
  audioStemController.deleteOldSceneStems(req, res);
});

export default router;
