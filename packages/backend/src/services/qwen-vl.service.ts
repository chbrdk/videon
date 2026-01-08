/**
 * Qwen VL Service
 * Integration für semantische Video-Analyse mit Qwen 3VL
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class QwenVLService {
  private qwenVLServiceUrl: string;
  private storagePath: string;

  constructor() {
    // Qwen VL Service läuft auf Port 8081
    // In Docker: qwen-vl-service:8081
    // Lokal: host.docker.internal:8081 oder localhost:8081
    this.qwenVLServiceUrl = 
      process.env.QWEN_VL_SERVICE_URL || 
      process.env.QWEN_VL_URL ||
      'http://localhost:8081';
    
    // Storage-Pfad für Pfad-Konvertierung
    this.storagePath = process.env.STORAGE_PATH 
      ? require('path').resolve(process.cwd(), '..', '..', process.env.STORAGE_PATH.replace('./', ''))
      : require('path').join(process.cwd(), '..', '..', 'storage');
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
   * Analysiert ein einzelnes Bild mit Qwen VL
   */
  async analyzeImage(imagePath: string, prompt?: string): Promise<string> {
    try {
      // Convert to host path for local Qwen VL service
      const hostPath = this.convertToHostPath(imagePath);
      console.log(`🖼️ Calling Qwen VL for image: ${hostPath} (original: ${imagePath})`);
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
          qwenVLModel: "Qwen3-VL-8B-Instruct-3bit",
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
          if (keyframePath.startsWith('/Volumes/DOCKER_EXTERN/prismvid/')) {
            const relativePath = keyframePath.replace('/Volumes/DOCKER_EXTERN/prismvid/', '');
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
                qwenVLModel: "Qwen3-VL-8B-Instruct-3bit"
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
                qwenVLModel: "Qwen3-VL-8B-Instruct-3bit",
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

