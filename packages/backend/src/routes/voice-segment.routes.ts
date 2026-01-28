import { Router, Request, Response } from 'express';
import { VoiceSegmentService } from '../services/voice-segment.service';
import { ElevenLabsClient } from '../services/elevenlabs.client';
import { getElevenLabsClient, getElevenLabsClientSync } from '../utils/elevenlabs-factory';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const router = Router();

// Initialize services
// Start with sync client (from env), will be updated with UNION key if available
let elevenLabsClient: ElevenLabsClient | null = getElevenLabsClientSync();

// Try to get client with UNION key (async)
getElevenLabsClient().then((client) => {
  if (client) {
    elevenLabsClient = client;
    logger.info('ElevenLabs client updated with UNION key');
  }
}).catch((error) => {
  logger.warn('Failed to load ElevenLabs client from UNION, using environment variable', {
    error: error.message,
  });
});

const voiceSegmentService = new VoiceSegmentService(elevenLabsClient || undefined);

// Erstelle Segmente aus Transkription
router.post('/audio-stems/:audioStemId/create-segments', async (req: Request, res: Response) => {
  try {
    const { audioStemId } = req.params;
    const { videoId } = req.body;

    logger.info(`Creating segments for audio stem ${audioStemId}, video ${videoId}`);

    const segments = await voiceSegmentService.createSegmentsFromTranscription(
      audioStemId,
      videoId
    );

    res.json({ segments });
  } catch (error) {
    logger.error(`Error creating segments: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Hole alle Segmente für Audio-Stem
router.get('/audio-stems/:audioStemId/segments', async (req: Request, res: Response) => {
  try {
    const { audioStemId } = req.params;

    const segments = await prisma.voiceSegment.findMany({
      where: { audioStemId },
      orderBy: { startTime: 'asc' }
    });

    res.json(segments);
  } catch (error) {
    logger.error(`Error fetching segments: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update Segment-Text
router.patch('/voice-segments/:segmentId/text', async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params;
    const { text } = req.body;

    const segment = await prisma.voiceSegment.update({
      where: { id: segmentId },
      data: {
        editedText: text,
        status: 'EDITED_TEXT'
      }
    });

    res.json(segment);
  } catch (error) {
    logger.error(`Error updating segment text: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Re-Voice Segment
router.post('/voice-segments/:segmentId/revoice', async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params;
    const { voiceId, text, voiceSettings } = req.body;

    logger.info(`Re-voicing segment ${segmentId} with voice ${voiceId}`);

    // Try to get client (might have UNION key now)
    const client = await getElevenLabsClient();
    if (!client) {
      return res.status(503).json({ 
        error: 'ElevenLabs API not configured. Please set ELEVENLABS_API_KEY in UNION or environment variable.' 
      });
    }

    // Update service with latest client
    const updatedService = new VoiceSegmentService(client);
    const segment = await updatedService.reVoiceSegment(
      segmentId,
      voiceId,
      text,
      voiceSettings
    );

    res.json(segment);
  } catch (error) {
    logger.error(`Error re-voicing segment: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stream Preview (Live-Preview während Eingabe)
router.post('/voice-segments/preview', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, voiceSettings } = req.body;

    const client = await getElevenLabsClient();
    if (!client) {
      return res.status(503).json({ error: 'ElevenLabs API key not configured' });
    }

    const stream = await client.streamTextToSpeech({
      text,
      voiceId,
      settings: voiceSettings
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    stream.pipe(res);
  } catch (error) {
    logger.error(`Error creating preview: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stream re-voiced audio file
router.get('/voice-segments/:segmentId/revoiced-audio', async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params;

    const segment = await prisma.voiceSegment.findUnique({
      where: { id: segmentId }
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    if (!segment.reVoicedFilePath) {
      return res.status(404).json({ error: 'Re-voiced audio not available' });
    }

    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(segment.reVoicedFilePath)) {
      return res.status(404).json({ error: 'Re-voiced audio file not found' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(segment.reVoicedFilePath)}"`);
    
    const fileStream = fs.createReadStream(segment.reVoicedFilePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error(`Error streaming re-voiced audio: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Liste ElevenLabs Voices
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const client = await getElevenLabsClient();
    if (!client) {
      return res.json([]);
    }

    const voices = await client.getVoices();
    res.json(voices);
  } catch (error) {
    logger.error(`Error fetching voices: ${error}`);
    res.json([]); // Return empty array on error
  }
});

// Clone Voice
router.post('/voices/clone', async (req: Request, res: Response) => {
  try {
    const { name, audioFilePath, description } = req.body;

    const voiceClone = await voiceSegmentService.cloneVoice(
      name,
      audioFilePath,
      description
    );

    res.json(voiceClone);
  } catch (error) {
    logger.error(`Error cloning voice: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Liste geclonte Voices
router.get('/voices/clones', async (req: Request, res: Response) => {
  try {
    const clones = await prisma.voiceClone.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(clones);
  } catch (error) {
    logger.error(`Error fetching voice clones: ${error}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
