import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AudioStemService } from '../services/audio-stem.service';
import { VideoService } from '../services/video.service';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { execAsync } from '../utils/file-helper';
import axios from 'axios';

const projectService = new ProjectService();
const audioStemService = new AudioStemService();
const videoService = new VideoService();

// Helper function to create scene-specific audio stems
async function createSceneAudioStems(videoId: string, sceneId: string, startTime: number, endTime: number) {
  try {
    logger.info(`🎵 Creating audio stems for scene ${sceneId} (${startTime}-${endTime}s)`);

    // Get video file path
    const video = await videoService.getVideoById(videoId);
    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    // Construct video file path from filename
    const videoPath = path.join('/Volumes/DOCKER_EXTERN/videon', 'storage', 'videos', video.filename);
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Create output directory
    const outputDir = path.join('/Volumes/DOCKER_EXTERN/videon', 'storage', 'audio_stems', videoId, sceneId);
    fs.mkdirSync(outputDir, { recursive: true });

    const duration = endTime - startTime;
    const stemTypes = ['vocals', 'music', 'original'];

    // First, extract the audio segment
    const tempAudioPath = path.join(outputDir, `${sceneId}_temp.wav`);
    const extractCommand = [
      'ffmpeg', '-y',
      '-i', videoPath,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-vn', // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit
      '-ar', '44100', // Sample rate
      tempAudioPath
    ].join(' ');

    logger.info(`🎵 Extracting audio segment: ${extractCommand}`);
    await execAsync(extractCommand);

    // Create original stem (copy of extracted audio)
    if ('original' in stemTypes) {
      const originalPath = path.join(outputDir, `${sceneId}_original.wav`);
      const copyCommand = [
        'ffmpeg', '-y',
        '-i', tempAudioPath,
        '-acodec', 'pcm_s16le',
        originalPath
      ].join(' ');

      await execAsync(copyCommand);
      const stats = fs.statSync(originalPath);

      await audioStemService.createAudioStem({
        videoId,
        projectSceneId: sceneId,
        stemType: 'original',
        filePath: originalPath,
        fileSize: stats.size,
        duration: duration,
        startTime: startTime,
        endTime: endTime
      });

      logger.info(`✅ Created original stem: ${originalPath}`);
    }

    // Use a simpler approach: create different audio stems using FFmpeg filters
    if ('vocals' in stemTypes || 'music' in stemTypes) {
      logger.info(`🎵 Creating audio stems using FFmpeg filters...`);

      // For vocals: use high-pass filter to emphasize voice frequencies
      if ('vocals' in stemTypes) {
        const vocalsPath = path.join(outputDir, `${sceneId}_vocals.wav`);
        const vocalsCommand = [
          'ffmpeg', '-y',
          '-i', tempAudioPath,
          '-af', 'highpass=f=300,lowpass=f=3400', // Voice frequency range
          '-acodec', 'pcm_s16le',
          vocalsPath
        ].join(' ');

        logger.info(`🎵 Creating vocals stem: ${vocalsCommand}`);
        await execAsync(vocalsCommand);
        const stats = fs.statSync(vocalsPath);

        await audioStemService.createAudioStem({
          videoId,
          projectSceneId: sceneId,
          stemType: 'vocals',
          filePath: vocalsPath,
          fileSize: stats.size,
          duration: duration,
          startTime: startTime,
          endTime: endTime
        });

        logger.info(`✅ Created vocals stem: ${vocalsPath}`);
      }

      // For music: use low-pass filter to emphasize music frequencies
      if ('music' in stemTypes) {
        const musicPath = path.join(outputDir, `${sceneId}_music.wav`);
        const musicCommand = [
          'ffmpeg', '-y',
          '-i', tempAudioPath,
          '-af', 'lowpass=f=300,highpass=f=50', // Music frequency range
          '-acodec', 'pcm_s16le',
          musicPath
        ].join(' ');

        logger.info(`🎵 Creating music stem: ${musicCommand}`);
        await execAsync(musicCommand);
        const stats = fs.statSync(musicPath);

        await audioStemService.createAudioStem({
          videoId,
          projectSceneId: sceneId,
          stemType: 'music',
          filePath: musicPath,
          fileSize: stats.size,
          duration: duration,
          startTime: startTime,
          endTime: endTime
        });

        logger.info(`✅ Created music stem: ${musicPath}`);
      }
    }

    // Clean up temp file
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }

    logger.info(`🎵 Successfully created ${stemTypes.length} audio stems for scene ${sceneId}`);

  } catch (error) {
    logger.error(`❌ Failed to create audio stems for scene ${sceneId}:`, error);
    throw error;
  }
}

export class ProjectController {
  async createProject(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      const user = (req as any).user;
      const project = await projectService.createProject({
        name,
        description,
        userId: user?.id
      });
      res.status(201).json(project);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Create project error', { error: errorMessage });
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const project = await projectService.updateProject(id, { name, description });
      res.json(project);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Update project error', { error: errorMessage });
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async getProjects(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const isAdmin = user?.role === 'ADMIN';
      const projects = await projectService.getProjects(user?.id, isAdmin);
      res.json(projects);
    } catch (error: unknown) {
      logger.error('Get projects error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const isAdmin = user?.role === 'ADMIN';
      const project = await projectService.getProjectById(id, user?.id, isAdmin);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error: unknown) {
      logger.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  async addScene(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { videoId, startTime, endTime } = req.body;

      const scene = await projectService.addSceneToProject(id, {
        videoId, startTime, endTime
      });

      // Trigger Audio-Separierung im Hintergrund (non-blocking)
      try {
        logger.info(`🎵 Triggering audio separation for scene ${scene.id} in background`);

        // Prüfe ob Audio-Stems bereits existieren
        const hasStems = await audioStemService.hasAudioStemsForScene(videoId, scene.id);

        if (!hasStems) {
          // Erstelle Audio-Stems direkt mit FFmpeg (ohne Analyzer Service)
          await createSceneAudioStems(videoId, scene.id, startTime, endTime);
          logger.info(`✅ Background audio separation completed for scene ${scene.id}`);
        } else {
          logger.info(`ℹ️ Audio stems already exist for scene ${scene.id}, skipping separation`);
        }
      } catch (error) {
        // Non-blocking: Audio-Separierung läuft im Hintergrund
        logger.warn(`⚠️ Failed to trigger audio separation for scene ${scene.id}:`, error);
      }

      res.status(201).json(scene);
    } catch (error: unknown) {
      logger.error('Add scene error:', error);
      res.status(500).json({ error: 'Failed to add scene' });
    }
  }

  async reorderScenes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { scenes } = req.body;

      await projectService.reorderScenes(id, scenes);
      res.json({ message: 'Scenes reordered successfully' });
    } catch (error: unknown) {
      logger.error('Reorder scenes error:', error);
      res.status(500).json({ error: 'Failed to reorder scenes' });
    }
  }

  async removeScene(req: Request, res: Response) {
    try {
      const { sceneId } = req.params;
      await projectService.removeScene(sceneId);
      res.json({ message: 'Scene removed successfully' });
    } catch (error: unknown) {
      logger.error('Remove scene error:', error);
      res.status(500).json({ error: 'Failed to remove scene' });
    }
  }

  async updateSceneTiming(req: Request, res: Response) {
    try {
      const { sceneId } = req.params;
      const { startTime, endTime, trimStart, trimEnd } = req.body;

      const scene = await projectService.updateSceneTiming(sceneId, {
        startTime, endTime, trimStart, trimEnd
      });

      res.json(scene);
    } catch (error: unknown) {
      logger.error('Update scene timing error:', error);
      res.status(500).json({ error: 'Failed to update scene timing' });
    }
  }

  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await projectService.deleteProject(id);
      res.json({ message: 'Project deleted successfully' });
    } catch (error: unknown) {
      logger.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  async getProjectTranscriptionSegments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const segments = await projectService.getProjectTranscriptionSegments(id);
      res.json(segments);
    } catch (error: unknown) {
      logger.error('Get project transcription segments error:', error);
      res.status(500).json({ error: 'Failed to fetch transcription segments' });
    }
  }

  // Split Scene API
  async splitScene(req: Request, res: Response) {
    try {
      const { sceneId } = req.params;
      const { splitTime } = req.body;

      const result = await projectService.splitScene(sceneId, splitTime);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Split scene error:', error);
      res.status(500).json({ error: 'Failed to split scene' });
    }
  }

  // Audio Level API
  async updateSceneAudioLevel(req: Request, res: Response) {
    try {
      const { sceneId } = req.params;
      const { audioLevel } = req.body;

      const scene = await projectService.updateSceneAudioLevel(sceneId, audioLevel);
      res.json(scene);
    } catch (error: unknown) {
      logger.error('Update scene audio level error:', error);
      res.status(500).json({ error: 'Failed to update audio level' });
    }
  }

  // History APIs
  async getProjectHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const history = await projectService.getProjectHistory(id);
      res.json(history);
    } catch (error: unknown) {
      logger.error('Get project history error:', error);
      res.status(500).json({ error: 'Failed to fetch project history' });
    }
  }

  async undoLastAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await projectService.undoLastAction(id);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Undo last action error:', error);
      res.status(500).json({ error: 'Failed to undo last action' });
    }
  }

  async redoLastAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await projectService.redoLastAction(id);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Redo last action error:', error);
      res.status(500).json({ error: 'Failed to redo last action' });
    }
  }

  async generateProjectPreview(req: Request, res: Response) {
    try {
      // Set CORS headers for video streaming
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      res.header('Access-Control-Allow-Credentials', 'true');

      // Override CSP for video streaming
      res.header('Content-Security-Policy', "default-src 'self'; media-src 'self' data: blob: *;");

      // Override CORP to allow cross-origin loading
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');

      const { id } = req.params;

      // Get project with scenes
      const project = await projectService.getProjectById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.scenes || project.scenes.length === 0) {
        return res.status(400).json({ error: 'Project has no scenes' });
      }

      // Sort scenes by order
      const sortedScenes = project.scenes.sort((a, b) => a.order - b.order);

      // Create preview file path
      // Use environment variable or default to Docker path
      const projectsStoragePath = process.env.PROJECTS_STORAGE_PATH || '/app/storage/projects';
      const previewDir = projectsStoragePath;
      if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
      }

      // Generate hash based on scenes configuration for cache invalidation
      const sceneHash = sortedScenes.map(scene =>
        `${scene.videoId}_${scene.startTime}_${scene.endTime}_${scene.trimStart || 0}_${scene.trimEnd || 0}`
      ).join('_');
      const hash = Buffer.from(sceneHash).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

      const previewPath = `${previewDir}/${id}_preview_${hash}.mp4`;

      // Check if preview already exists
      if (fs.existsSync(previewPath)) {
        logger.info(`📁 Serving existing project preview: ${previewPath}`);
        return res.sendFile(previewPath);
      }

      logger.info(`🎬 Generating project preview for project: ${id}`);
      logger.info(`🎬 Scenes count: ${sortedScenes.length}`);

      // Generate individual scene videos first
      const sceneVideoPaths: string[] = [];
      const tempDir = `${previewDir}/temp_${id}`;
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      for (let i = 0; i < sortedScenes.length; i++) {
        const scene = sortedScenes[i];
        const sceneVideoPath = `${tempDir}/scene_${i}.mp4`;

        // Calculate actual timing with trim
        const trimStart = scene.trimStart || 0;
        const trimEnd = scene.trimEnd || 0;
        const actualStart = scene.startTime + trimStart;
        const actualEnd = scene.endTime - trimEnd;
        const duration = actualEnd - actualStart;

        logger.info(`🎬 Processing scene ${i}: ${scene.videoId} (${actualStart}s-${actualEnd}s)`);

        // Find the original video file
        // Use environment variable or default to Docker path
        const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
        const videoDir = videosStoragePath;
        const files = fs.readdirSync(videoDir);
        const videoFile = files.find(file => file.includes('UDG_Elevator_Pitch_Bosch') && file.endsWith('.mp4'));

        if (!videoFile) {
          throw new Error(`Video file not found for scene ${i}`);
        }

        const originalVideoPath = `${videoDir}${videoFile}`;

        // Generate scene video
        const command = `ffmpeg -y -i "${originalVideoPath}" -ss ${actualStart} -t ${duration} -c copy "${sceneVideoPath}"`;
        logger.info(`🎬 FFmpeg command for scene ${i}: ${command}`);

        await execAsync(command);
        sceneVideoPaths.push(sceneVideoPath);
      }

      // Create concat file for FFmpeg
      const concatFile = `${tempDir}/concat.txt`;
      const concatContent = sceneVideoPaths.map(path => `file '${path}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);

      // Concatenate all scene videos
      const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${previewPath}"`;
      logger.info(`🎬 FFmpeg concat command: ${concatCommand}`);

      await execAsync(concatCommand);

      // Clean up temporary files
      fs.rmSync(tempDir, { recursive: true, force: true });

      logger.info(`✅ Project preview generated: ${previewPath}`);

      // Verify the file was created
      if (fs.existsSync(previewPath)) {
        const stats = fs.statSync(previewPath);
        logger.info(`📊 Preview file size: ${stats.size} bytes`);
        res.sendFile(previewPath);
      } else {
        throw new Error('Preview file was not created');
      }

    } catch (error: unknown) {
      logger.error('Project preview generation error:', error);
      res.status(500).json({ error: 'Failed to generate project preview' });
    }
  }
}
