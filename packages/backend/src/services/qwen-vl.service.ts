/**
 * Qwen VL Service
 * Integration für semantische Video-Analyse mit Qwen 3VL
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai.service';

const prisma = new PrismaClient();

function mimeFromPath(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/jpeg';
}

class QwenVLService {
  private qwenVLServiceUrl: string;
  private storagePath: string;
  public readonly provider: string;
  private modelName: string;
  private openaiService: OpenAIService | null;

  constructor() {
    // Qwen VL Service läuft auf Port 8081
    // In Docker: qwen-vl-service:8081
    // Lokal: host.docker.internal:8081 oder localhost:8081
    this.qwenVLServiceUrl =
      process.env.QWEN_VL_SERVICE_URL ||
      process.env.QWEN_VL_URL ||
      'http://host.docker.internal:8081';

    // Provider Configuration
    // 'custom' | 'ollama' | 'openai' (GPT-Vision + Structured Outputs via OpenAI API)
    this.provider = process.env.QWEN_VL_PROVIDER || 'custom';
    this.modelName = process.env.QWEN_VL_MODEL || 'qwen3-vl:8b'; // Qwen/Ollama default; for openai often overridden by OPENAI_VISION_MODEL

    this.openaiService = this.provider === 'openai' ? new OpenAIService() : null;

    // Storage-Pfad für Pfad-Konvertierung
    this.storagePath = process.env.STORAGE_PATH
      ? require('path').resolve(process.cwd(), '..', '..', process.env.STORAGE_PATH.replace('./', ''))
      : require('path').join(process.cwd(), '..', '..', 'storage');
  }

  /**
   * Get the service URL
   */
  getServiceUrl(): string {
    if (this.provider === 'openai') {
      return 'openai://vision';
    }
    return this.qwenVLServiceUrl;
  }

  /** Model string stored in DB (qwenVLModel). */
  private getStoredModelName(): string {
    if (this.provider === 'openai') {
      return process.env.OPENAI_VISION_MODEL || this.modelName || 'gpt-5.4-nano';
    }
    if (this.provider === 'ollama') {
      return this.modelName;
    }
    return process.env.QWEN_VL_MODEL || 'Qwen3-VL-8B-Instruct-4bit';
  }

  /**
   * Konvertiert Container-Pfade zu Host-Pfaden für den lokalen Qwen VL Service
   */
  private convertToHostPath(containerPath: string): string {
    const hostStoragePath = process.env.HOST_STORAGE_PATH;
    if (!hostStoragePath) {
      console.warn('⚠️ HOST_STORAGE_PATH not set, using container path');
      return containerPath;
    }

    // Convert /app/storage/... to host path
    if (containerPath.startsWith('/app/storage/')) {
      return containerPath.replace('/app/storage/', `${hostStoragePath}/`);
    }

    return containerPath;
  }

  /**
   * Prüft ob der Remote-Modus aktiviert ist
   */
  private isRemoteMode(): boolean {
    if (process.env.QWEN_VL_REMOTE_MODE === 'true') return true;

    // Auto-detect based on URL
    const url = this.qwenVLServiceUrl;
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('qwen-vl-service')) {
      return false;
    }
    // If external URL, assume remote mode
    return true;
  }

  /**
   * Analysiert ein einzelnes Bild mit Qwen VL
   */
  async analyzeImage(imagePath: string, prompt?: string): Promise<string> {
    try {
      if (this.provider === 'openai') {
        if (!this.openaiService?.isConfigured()) {
          throw new Error('OPENAI_API_KEY is required for QWEN_VL_PROVIDER=openai');
        }
        const fs = require('fs').promises;
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mime = mimeFromPath(imagePath);
        const visionModel =
          process.env.OPENAI_VISION_MODEL || this.modelName || 'gpt-5.4-nano';
        const { descriptionText } = await this.openaiService.analyzeKeyframeStructured(
          base64Image,
          mime,
          prompt ||
            'Beschreibe diese Szene detailliert. Was passiert in diesem Bild? Nutze das JSON-Schema.',
          visionModel
        );
        return descriptionText;
      }

      // Check for Remote Mode
      if (this.isRemoteMode()) {
        console.log(`🖼️ Calling Remote Qwen VL for image: ${imagePath}`);
        const fs = require('fs').promises;
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');

        if (this.provider === 'ollama') {
          console.log(`🦙 Calling Ollama API (${this.modelName}) for image analysis`);
          const response = await axios.post(
            `${this.qwenVLServiceUrl}/api/chat`,
            {
              model: this.modelName,
              messages: [
                {
                  role: 'user',
                  content: prompt || "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?",
                  images: [base64Image]
                }
              ],
              stream: false
            },
            { timeout: 180000 }
          );

          if (!response.data || !response.data.message || !response.data.message.content) {
            throw new Error('No content returned from Ollama API');
          }
          return response.data.message.content;
        }

        // Custom Provider (Default)
        const response = await axios.post(
          `${this.qwenVLServiceUrl}/analyze/image`,
          {
            image_base64: base64Image,
            prompt: prompt || "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?",
            max_tokens: 500
          },
          { timeout: 180000 }
        );

        if (!response.data || (!response.data.description && !response.data.text)) {
          throw new Error('No description returned from Remote Qwen VL service');
        }
        return response.data.description || response.data.text;
      }

      // Local Mode (Legacy) - ONLY for Custom Provider
      if (this.provider === 'ollama') {
        throw new Error('Ollama provider does not support local file path mode. Enable QWEN_VL_REMOTE_MODE=true');
      }

      // Convert to host path for local Qwen VL service
      const hostPath = this.convertToHostPath(imagePath);
      console.log(`🖼️ Calling Local Qwen VL for image: ${hostPath} (original: ${imagePath})`);
      const response = await axios.post(
        `${this.qwenVLServiceUrl}/analyze/image`,
        {
          image_path: hostPath,
          prompt: prompt || "Beschreibe diese Szene detailliert. Was passiert in diesem Bild?",
          max_tokens: 500
        },
        { timeout: 180000 } // 3 Minuten Timeout (erhöht für größere Bilder)
      );

      if (!response.data || !response.data.description) {
        throw new Error('No description returned from Qwen VL service');
      }

      return response.data.description;
    } catch (error: any) {
      console.error('Qwen VL Image Analysis Error:', error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Qwen VL analysis timeout: ${error.message}`);
      } else if (error.response) {
        throw new Error(`Qwen VL service error (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else {
        throw new Error(`Qwen VL analysis failed: ${error.message}`);
      }
    }
  }

  /**
   * Analysiert Video-Frames mit Qwen VL für Video-Zusammenfassung
   */
  async analyzeVideoFrames(framePaths: string[], prompt?: string): Promise<string> {
    try {
      if (this.provider === 'openai') {
        if (!this.openaiService?.isConfigured()) {
          throw new Error('OPENAI_API_KEY is required for QWEN_VL_PROVIDER=openai');
        }
        const fs = require('fs').promises;
        const path = require('path');
        const frames = await Promise.all(
          framePaths.map(async (p: string) => {
            const buf = await fs.readFile(p);
            return {
              base64: buf.toString('base64'),
              mimeType: mimeFromPath(p || path.extname(p)),
            };
          })
        );
        const visionModel =
          process.env.OPENAI_VISION_MODEL || this.modelName || 'gpt-5.4-nano';
        const { descriptionText } = await this.openaiService.analyzeKeyframesStructured(
          frames,
          prompt ||
            'Analysiere diese Video-Frames einer Szene. Fasse zu einer strukturierten Beschreibung zusammen (JSON-Schema).',
          visionModel
        );
        return descriptionText;
      }

      if (this.isRemoteMode()) {
        console.log(`🎬 Calling Remote Qwen VL (${this.provider}) for ${framePaths.length} frames`);

        const fs = require('fs').promises;

        // For Ollama, we currently process frame by frame or combine them if model supports it
        // qwen3-vl supports multiple images in one message

        if (this.provider === 'ollama') {
          // Read all frames
          const imagesBase64 = await Promise.all(framePaths.map(async (p) => {
            const buf = await fs.readFile(p);
            return buf.toString('base64');
          }));

          console.log(`🦙 Calling Ollama API (${this.modelName}) for video frames`);
          const response = await axios.post(
            `${this.qwenVLServiceUrl}/api/chat`,
            {
              model: this.modelName,
              messages: [
                {
                  role: 'user',
                  content: prompt || "Analysiere diese Video-Frames. Was passiert in diesem Video? Beschreibe die Story, Personen, Aktivitäten und den Kontext.",
                  images: imagesBase64
                }
              ],
              stream: false,
              options: {
                num_ctx: 4096 // Increase context for multiple images
              }
            },
            { timeout: 300000 }
          );

          if (!response.data || !response.data.message || !response.data.message.content) {
            throw new Error('No content returned from Ollama API');
          }
          return response.data.message.content;
        }

        // Custom Provider Logic
        const framesBase64 = await Promise.all(framePaths.map(async (p) => {
          const buf = await fs.readFile(p);
          return buf.toString('base64');
        }));

        const response = await axios.post(
          `${this.qwenVLServiceUrl}/analyze/video-frames`,
          {
            frame_base64_images: framesBase64,
            prompt: prompt || "Analysiere diese Video-Frames. Was passiert in diesem Video? Beschreibe die Story, Personen, Aktivitäten und den Kontext.",
            max_tokens: 800
          },
          { timeout: 300000 } // Higher timeout for upload
        );
        return response.data.video_description;
      }

      if (this.provider === 'ollama') {
        throw new Error('Ollama provider requires remote mode. Enable QWEN_VL_REMOTE_MODE=true');
      }

      const response = await axios.post(
        `${this.qwenVLServiceUrl}/analyze/video-frames`,
        {
          frame_paths: framePaths,
          prompt: prompt || "Analysiere diese Video-Frames. Was passiert in diesem Video? Beschreibe die Story, Personen, Aktivitäten und den Kontext.",
          max_tokens: 800
        },
        { timeout: 180000 } // 3 Minuten Timeout für mehrere Frames
      );

      return response.data.video_description;
    } catch (error: any) {
      console.error('Qwen VL Video Analysis Error:', error.message);
      throw new Error(`Qwen VL video analysis failed: ${error.message}`);
    }
  }

  /**
   * Triggert Qwen VL Analysis für eine Scene
   */
  async analyzeScene(sceneId: string): Promise<void> {
    try {
      // Hole Scene mit Keyframe
      const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
        include: { video: true }
      });

      if (!scene || !scene.keyframePath) {
        throw new Error(`Scene ${sceneId} not found or has no keyframe`);
      }

      console.log(`🔍 Starting Qwen VL analysis for scene ${sceneId}`);

      // Prüfe ob bereits VisionAnalysis existiert
      let visionAnalysis = await prisma.visionAnalysis.findUnique({
        where: { sceneId }
      });

      if (!visionAnalysis) {
        throw new Error(`VisionAnalysis not found for scene ${sceneId}`);
      }

      // Analysiere Keyframe mit Qwen VL
      const description = await this.analyzeImage(
        scene.keyframePath,
        "Beschreibe diese Szene detailliert. Was passiert hier? Nenne Objekte, Personen, Aktivitäten und den Kontext."
      );

      // Aktualisiere VisionAnalysis mit Qwen VL Description
      await prisma.visionAnalysis.update({
        where: { sceneId },
        data: {
          qwenVLDescription: description,
          qwenVLProcessed: true,
          qwenVLModel: this.getStoredModelName(),
          qwenVLProcessingTime: null // Wird vom Service gemessen
        }
      });

      console.log(`✅ Qwen VL analysis completed for scene ${sceneId}`);
    } catch (error: any) {
      console.error(`❌ Qwen VL analysis failed for scene ${sceneId}:`, error);
      throw error;
    }
  }

  /**
   * Triggert Qwen VL Analysis für alle Scenes eines Videos
   */
  async analyzeVideo(videoId: string): Promise<void> {
    try {
      const scenes = await prisma.scene.findMany({
        where: { videoId },
        include: { visionAnalysis: true },
        orderBy: { startTime: 'asc' }
      });

      if (scenes.length === 0) {
        throw new Error(`No scenes found for video ${videoId}`);
      }

      console.log(`🎬 Starting Qwen VL analysis for video ${videoId} (${scenes.length} scenes)`);

      // Analysiere JEDE Szene einzeln
      // Pro Szene sammle Keyframes basierend auf der Szenen-Dauer (z.B. 1 Frame pro Sekunde)
      const framesPerSecond = parseFloat(process.env.QWEN_VL_FRAMES_PER_SECOND || '1'); // Standard: 1 Frame/Sekunde

      console.log(`🎬 Analyzing ${scenes.length} scenes with ${framesPerSecond} frame(s) per second`);

      let successCount = 0;
      let errorCount = 0;

      for (const scene of scenes) {
        try {
          if (!scene.keyframePath) {
            console.warn(`⚠️ Scene ${scene.id} has no keyframe, skipping...`);
            errorCount++;
            continue;
          }

          // Konvertiere Docker-Pfad zu lokalem Pfad
          let keyframePath = scene.keyframePath;
          const path = require('path');
          const fs = require('fs');

          // Pfad-Konvertierung
          // If path starts with /app/storage/, it's already correct for the container
          // No conversion needed as files are mounted at /app/storage/
          if (keyframePath.startsWith('/Volumes/DOCKER_EXTERN/videon/')) {
            const relativePath = keyframePath.replace('/Volumes/DOCKER_EXTERN/videon/', '');
            const projectRoot = path.resolve(process.cwd(), '..', '..');
            keyframePath = path.join(projectRoot, relativePath);
          } else if (keyframePath.startsWith('storage/') || keyframePath.startsWith('./storage/')) {
            // Relative paths need to be joined with /app
            keyframePath = path.join('/app', keyframePath.replace('./', ''));
          }

          // Prüfe ob Keyframe existiert
          if (!fs.existsSync(keyframePath)) {
            // Versuche alternativen Pfad
            const filename = path.basename(keyframePath);
            const alternativePath = path.join(this.storagePath, 'keyframes', filename);
            if (fs.existsSync(alternativePath)) {
              keyframePath = alternativePath;
            } else {
              console.warn(`⚠️ Keyframe not found for scene ${scene.id}: ${keyframePath}`);
              errorCount++;
              continue;
            }
          }

          // Berechne Anzahl Frames für diese Szene basierend auf Dauer
          const sceneDuration = scene.endTime - scene.startTime;
          const framesForScene = Math.max(1, Math.ceil(sceneDuration * framesPerSecond));

          // Für jetzt verwenden wir den Hauptkeyframe, später könnten wir
          // zusätzliche Frames aus dem Video extrahieren
          const framePaths = [keyframePath];

          console.log(`🔍 Analyzing scene ${scene.id} (${sceneDuration.toFixed(1)}s, ${framesForScene} frame(s))...`);

          // Analysiere diese Szene
          let sceneDescription: string;
          try {
            const startTime = Date.now();
            sceneDescription = await this.analyzeImage(
              keyframePath,
              `Beschreibe diese Video-Szene detailliert. Was passiert in diesem Bild? Beschreibe Personen, Aktivitäten, Objekte, die Atmosphäre und den Kontext. Die Szene dauert ${sceneDuration.toFixed(1)} Sekunden von ${scene.startTime.toFixed(1)}s bis ${scene.endTime.toFixed(1)}s.`
            );
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Qwen VL analysis completed for scene ${scene.id} (${sceneDescription.length} chars, ${duration}s)`);
          } catch (qwenError: any) {
            console.error(`❌ Qwen VL analysis failed for scene ${scene.id}: ${qwenError.message}`);
            console.error(`❌ Error stack:`, qwenError.stack);
            errorCount++;
            continue;
          }

          // Speichere Beschreibung für diese Szene
          const existingVisionAnalysis = await prisma.visionAnalysis.findUnique({
            where: { sceneId: scene.id }
          });

          if (existingVisionAnalysis) {
            await prisma.visionAnalysis.update({
              where: { sceneId: scene.id },
              data: {
                qwenVLDescription: sceneDescription,
                qwenVLProcessed: true,
                qwenVLModel: this.getStoredModelName()
              }
            });
            console.log(`✅ Qwen VL description updated for scene ${scene.id}`);
            successCount++;
          } else {
            await prisma.visionAnalysis.create({
              data: {
                sceneId: scene.id,
                qwenVLDescription: sceneDescription,
                qwenVLProcessed: true,
                qwenVLModel: this.getStoredModelName(),
                objectCount: 0,
                faceCount: 0,
                visionVersion: "QwenVL-Only"
              }
            });
            console.log(`✅ Qwen VL description created for scene ${scene.id}`);
            successCount++;
          }
        } catch (sceneError: any) {
          console.error(`❌ Failed to process scene ${scene.id}: ${sceneError.message}`);
          errorCount++;
        }
      }

      console.log(`✅ Qwen VL analysis completed: ${successCount} successful, ${errorCount} errors`);

      if (successCount === 0) {
        throw new Error(`Failed to analyze any scenes`);
      }

      console.log(`✅ Qwen VL video analysis completed for video ${videoId}`);
    } catch (error: any) {
      console.error(`❌ Qwen VL video analysis failed for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Prüft ob Qwen VL Service verfügbar ist
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (this.provider === 'openai') {
        return this.openaiService?.isConfigured() ?? false;
      }

      // Different health check for Ollama
      if (this.provider === 'ollama') {
        const response = await axios.get(`${this.qwenVLServiceUrl}/`, {
          timeout: 5000
        });
        // Ollama usually returns "Ollama is running" string or JSON
        return response.status === 200;
      }

      const response = await axios.get(`${this.qwenVLServiceUrl}/health`, {
        timeout: 5000
      });
      console.log(`🔍 Qwen VL Health Check: ${JSON.stringify(response.data)}`);
      // Akzeptiere sowohl 'healthy' als auch erfolgreiche Antworten
      return response.data.status === 'healthy' || response.status === 200;
    } catch (error: any) {
      console.error(`❌ Qwen VL Health Check failed: ${error.message}`);
      return false;
    }
  }
}

export { QwenVLService };

