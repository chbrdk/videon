import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import type { ElevenLabsClient } from './elevenlabs.client';

const prisma = new PrismaClient();

export class VoiceSegmentService {
  private storageDir: string;
  private elevenLabsClient: ElevenLabsClient | null;

  constructor(elevenLabsClient?: ElevenLabsClient) {
    // Use environment variable or default to Docker path
    this.storageDir = process.env.VOICE_SEGMENTS_STORAGE_PATH || '/app/storage/voice_segments';
    this.elevenLabsClient = elevenLabsClient || null;
  }

  /**
   * Segmentiere Voice-Stem basierend auf Transkriptions-Segmenten
   */
  async createSegmentsFromTranscription(
    audioStemId: string,
    videoId: string
  ): Promise<any[]> {
    try {
      // 1. Hole Audio-Stem und Transkription
      const audioStem = await prisma.audioStem.findUnique({
        where: { id: audioStemId },
        include: { 
          video: { 
            include: { transcriptions: true } 
          } 
        }
      });

      if (!audioStem) {
        throw new Error('Audio stem not found');
      }

      if (audioStem.stemType !== 'vocals') {
        throw new Error('Audio stem is not a vocal stem');
      }

      const transcription = audioStem.video.transcriptions[0];
      if (!transcription) {
        throw new Error('No transcription found for video');
      }

      const segments = JSON.parse(transcription.segments);

      logger.info(`Creating ${segments.length} voice segments for audio stem ${audioStemId}`);

      // 2. Erstelle Voice-Segmente
      const voiceSegments = [];

      for (const segment of segments) {
        const { start, end, text } = segment;
        const duration = end - start;

        // Erstelle Voice-Segment in DB
        const voiceSegment = await prisma.voiceSegment.create({
          data: {
            audioStemId,
            startTime: start,
            endTime: end,
            duration,
            originalText: text,
            originalFilePath: '', // Will be set by audio processor
            status: 'ORIGINAL'
          }
        });

        voiceSegments.push(voiceSegment);
      }

      logger.info(`Created ${voiceSegments.length} voice segments`);
      return voiceSegments;
    } catch (error) {
      logger.error(`Error creating voice segments: ${error}`);
      throw error;
    }
  }

  /**
   * Re-Voice ein einzelnes Segment mit ElevenLabs
   */
  async reVoiceSegment(
    segmentId: string,
    voiceId: string,
    text?: string,
    voiceSettings?: any
  ): Promise<any> {
    const segment = await prisma.voiceSegment.findUnique({
      where: { id: segmentId }
    });

    if (!segment) throw new Error('Segment not found');

    // Update Status
    await prisma.voiceSegment.update({
      where: { id: segmentId },
      data: { status: 'GENERATING' }
    });

    try {
      const textToSpeak = text || segment.editedText || segment.originalText;

      logger.info(`Re-voicing segment ${segmentId} with voice ${voiceId}`);

      // Erstelle Storage-Verzeichnis falls nötig
      const segmentDir = path.join(this.storageDir, segment.audioStemId);
      if (!fs.existsSync(segmentDir)) {
        fs.mkdirSync(segmentDir, { recursive: true });
      }

      // Rufe ElevenLabs API auf
      if (!this.elevenLabsClient) {
        throw new Error('ElevenLabs client not configured. Please set ELEVENLABS_API_KEY environment variable.');
      }

      // Generiere Audio mit ElevenLabs
      logger.info(`🎙️ Calling ElevenLabs API for text: "${textToSpeak.substring(0, 50)}..."`);
      const audioBuffer = await this.elevenLabsClient.textToSpeech({
        text: textToSpeak,
        voiceId: voiceId,
        settings: voiceSettings || {
          stability: segment.stability,
          similarityBoost: segment.similarityBoost,
          style: segment.style,
          useSpeakerBoost: segment.useSpeakerBoost
        }
      });

      // Speichere Audio-Datei
      const reVoicedFileName = `revoiced_${segment.id}.mp3`;
      const reVoicedPath = path.join(segmentDir, reVoicedFileName);
      fs.writeFileSync(reVoicedPath, audioBuffer);

      logger.info(`✅ Re-voiced audio saved to: ${reVoicedPath}`);

      // Update Segment
      const updated = await prisma.voiceSegment.update({
        where: { id: segmentId },
        data: {
          reVoicedFilePath: reVoicedPath,
          reVoicedAt: new Date(),
          status: 'COMPLETED',
          voiceId: voiceId,
          editedText: text || segment.editedText,
          ...(voiceSettings && {
            stability: voiceSettings.stability,
            similarityBoost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            useSpeakerBoost: voiceSettings.useSpeakerBoost
          })
        }
      });

      return updated;
    } catch (error) {
      logger.error(`Error re-voicing segment: ${error}`);
      await prisma.voiceSegment.update({
        where: { id: segmentId },
        data: {
          status: 'ERROR',
          errorMessage: (error as Error).message
        }
      });
      throw error;
    }
  }

  /**
   * Clone Voice aus Audio-Sample
   */
  async cloneVoice(
    name: string,
    audioFilePath: string,
    description?: string
  ): Promise<any> {
    logger.info(`Cloning voice: ${name} from ${audioFilePath}`);

    // TODO: Implement ElevenLabs voice cloning API
    const voiceId = 'placeholder_' + Date.now();

    return await prisma.voiceClone.create({
      data: {
        name,
        description,
        elevenLabsVoiceId: voiceId,
        sourceAudioPath: audioFilePath
      }
    });
  }
}
