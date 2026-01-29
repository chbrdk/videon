import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class ProjectService {
  async createProject(data: { name: string; description?: string }) {
    return await prisma.project.create({ data });
  }

  async updateProject(id: string, data: { name?: string; description?: string }) {
    return await prisma.project.update({
      where: { id },
      data
    });
  }

  async getProjects() {
    return await prisma.project.findMany({
      include: {
        scenes: {
          include: { video: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getProjectById(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          include: { video: true },
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async addSceneToProject(projectId: string, sceneData: {
    videoId: string;
    startTime: number;
    endTime: number;
  }) {
    // Hole aktuelle maximale Order
    const maxOrder = await prisma.projectScene.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' }
    });

    const scene = await prisma.projectScene.create({
      data: {
        projectId,
        videoId: sceneData.videoId,
        startTime: sceneData.startTime,
        endTime: sceneData.endTime,
        order: (maxOrder?.order ?? -1) + 1
      }
    });

    // Update Project duration
    await this.updateProjectDuration(projectId);

    return scene;
  }

  async reorderScenes(projectId: string, newOrder: { sceneId: string; order: number }[]) {
    // Get current order BEFORE reordering for undo
    const currentScenes = await prisma.projectScene.findMany({
      where: { projectId },
      orderBy: { order: 'asc' }
    });

    const originalOrder = currentScenes.map((scene, index) => ({
      sceneId: scene.id,
      order: index
    }));

    // Apply new order
    await prisma.$transaction(
      newOrder.map(item =>
        prisma.projectScene.update({
          where: { id: item.sceneId },
          data: { order: item.order }
        })
      )
    );

    // Add to history for undo/redo (store original order)
    await this.addToHistory(projectId, 'reorder', {
      originalOrder,
      newOrder
    });
  }

  async removeScene(sceneId: string) {
    const scene = await prisma.projectScene.findUnique({
      where: { id: sceneId },
      include: { project: true }
    });

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Create history entry for undo
    await this.addToHistory(scene.projectId, 'delete_scene', {
      sceneId,
      videoId: scene.videoId,
      startTime: scene.startTime,
      endTime: scene.endTime,
      order: scene.order,
      audioLevel: scene.audioLevel
    });

    await prisma.projectScene.delete({
      where: { id: sceneId }
    });

    await this.updateProjectDuration(scene.projectId);
  }

  async updateSceneTiming(sceneId: string, updates: {
    startTime?: number;
    endTime?: number;
    trimStart?: number;
    trimEnd?: number;
  }) {
    const originalScene = await prisma.projectScene.findUnique({
      where: { id: sceneId },
      include: { project: true }
    });

    if (!originalScene) {
      throw new Error('Scene not found');
    }

    // Create history entry for undo (only if timing actually changes)
    if (updates.startTime !== undefined || updates.endTime !== undefined) {
      await this.addToHistory(originalScene.projectId, 'resize', {
        sceneId,
        oldStartTime: originalScene.startTime,
        oldEndTime: originalScene.endTime,
        newStartTime: updates.startTime ?? originalScene.startTime,
        newEndTime: updates.endTime ?? originalScene.endTime
      });
    }

    const scene = await prisma.projectScene.update({
      where: { id: sceneId },
      data: updates
    });

    await this.updateProjectDuration(scene.projectId);
    return scene;
  }

  async updateProjectDuration(projectId: string) {
    const scenes = await prisma.projectScene.findMany({
      where: { projectId }
    });

    const duration = scenes.reduce((sum, scene) =>
      sum + (scene.endTime - scene.startTime), 0
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { duration }
    });
  }

  async deleteProject(id: string) {
    return await prisma.project.delete({ where: { id } });
  }

  async getProjectTranscriptionSegments(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        scenes: {
          include: {
            video: {
              include: {
                transcriptions: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      return [];
    }

    const allSegments: any[] = [];
    let projectTimeOffset = 0; // Track cumulative time in project timeline

    for (const scene of project.scenes) {
      if (scene.video.transcriptions && scene.video.transcriptions.length > 0) {
        const transcription = scene.video.transcriptions[0]; // Take first transcription
        try {
          const segments = JSON.parse(transcription.segments);

          // Filter segments that overlap with the scene
          const sceneSegments = segments.filter((segment: any) =>
            segment.start < scene.endTime && segment.end > scene.startTime
          );

          // Adjust segment timing to project timeline
          const adjustedSegments = sceneSegments.map((segment: any) => ({
            ...segment,
            start: projectTimeOffset + (Math.max(segment.start, scene.startTime) - scene.startTime), // Project timeline position
            end: projectTimeOffset + (Math.min(segment.end, scene.endTime) - scene.startTime), // Project timeline position
            videoId: scene.videoId,
            sceneId: scene.id
          }));

          allSegments.push(...adjustedSegments);
        } catch (error) {
          logger.error('Failed to parse transcription segments:', error);
        }
      }

      // Update project time offset for next scene
      projectTimeOffset += (scene.endTime - scene.startTime);
    }

    return allSegments;
  }

  // Split Scene functionality
  async splitScene(sceneId: string, splitTime: number) {
    const originalScene = await prisma.projectScene.findUnique({
      where: { id: sceneId },
      include: { project: true }
    });

    if (!originalScene) {
      throw new Error('Scene not found');
    }

    // Validate split time
    const sceneDuration = originalScene.endTime - originalScene.startTime;
    if (splitTime <= 0 || splitTime >= sceneDuration) {
      throw new Error('Invalid split time');
    }

    const splitPoint = originalScene.startTime + splitTime;

    // Create history entry for undo
    await this.addToHistory(originalScene.projectId, 'split_scene', {
      originalSceneId: sceneId,
      originalStartTime: originalScene.startTime,
      originalEndTime: originalScene.endTime,
      splitTime: splitPoint
    });

    // Create two new scenes
    const scene1 = await prisma.projectScene.create({
      data: {
        projectId: originalScene.projectId,
        videoId: originalScene.videoId,
        startTime: originalScene.startTime,
        endTime: splitPoint,
        order: originalScene.order,
        audioLevel: originalScene.audioLevel
      }
    });

    const scene2 = await prisma.projectScene.create({
      data: {
        projectId: originalScene.projectId,
        videoId: originalScene.videoId,
        startTime: splitPoint,
        endTime: originalScene.endTime,
        order: originalScene.order + 1,
        audioLevel: originalScene.audioLevel
      }
    });

    // Update order of subsequent scenes
    await prisma.projectScene.updateMany({
      where: {
        projectId: originalScene.projectId,
        order: { gt: originalScene.order }
      },
      data: {
        order: { increment: 1 }
      }
    });

    // Delete original scene
    await prisma.projectScene.delete({
      where: { id: sceneId }
    });

    // Update project duration
    await this.updateProjectDuration(originalScene.projectId);

    logger.info(`Split scene ${sceneId} at ${splitPoint}s into two scenes`);

    return {
      scene1,
      scene2
    };
  }

  // Audio Level functionality
  async updateSceneAudioLevel(sceneId: string, audioLevel: number) {
    // Validate audio level (0.0 - 2.0)
    if (audioLevel < 0 || audioLevel > 2) {
      throw new Error('Audio level must be between 0.0 and 2.0');
    }

    const scene = await prisma.projectScene.findUnique({
      where: { id: sceneId }
    });

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Create history entry for undo
    await this.addToHistory(scene.projectId, 'audio_level', {
      sceneId,
      oldAudioLevel: scene.audioLevel,
      newAudioLevel: audioLevel
    });

    const updatedScene = await prisma.projectScene.update({
      where: { id: sceneId },
      data: { audioLevel }
    });

    logger.info(`Updated audio level for scene ${sceneId} to ${audioLevel}`);

    return updatedScene;
  }

  // History management
  async revertSceneReorder(projectId: string, data: any) {
    // Get the original order from the history data
    const originalOrder = data.originalOrder;

    // Apply the original order (reverse the reorder)
    await prisma.$transaction(
      originalOrder.map((item: any) =>
        prisma.projectScene.update({
          where: { id: item.sceneId },
          data: { order: item.order }
        })
      )
    );
  }

  async addToHistory(projectId: string, action: string, data: any) {
    return await prisma.projectHistory.create({
      data: {
        projectId,
        action,
        data: JSON.stringify(data)
      }
    });
  }

  async getProjectHistory(projectId: string) {
    return await prisma.projectHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 actions
    });
  }

  async undoLastAction(projectId: string) {
    const lastAction = await prisma.projectHistory.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastAction) {
      throw new Error('No actions to undo');
    }

    const data = JSON.parse(lastAction.data);

    // Revert action based on type
    switch (lastAction.action) {
      case 'split_scene':
        await this.mergeScenes(projectId, data);
        break;
      case 'delete_scene':
        await this.restoreScene(projectId, data);
        break;
      case 'audio_level':
        await this.revertAudioLevel(data.sceneId, data.oldAudioLevel);
        break;
      case 'resize':
        await this.revertSceneResize(data.sceneId, data.oldStartTime, data.oldEndTime);
        break;
      case 'reorder':
        await this.revertSceneReorder(projectId, data);
        break;
      default:
        logger.warn(`Unknown action type for undo: ${lastAction.action}`);
    }

    // Delete history entry
    await prisma.projectHistory.delete({
      where: { id: lastAction.id }
    });

    logger.info(`Undid action: ${lastAction.action}`);

    return { message: 'Action undone successfully' };
  }

  async redoLastAction(projectId: string) {
    // For now, redo is not implemented as it requires storing undone actions
    // This would require a separate "redo stack" table
    throw new Error('Redo functionality not yet implemented');
  }

  // Helper methods for undo operations
  private async mergeScenes(projectId: string, data: any) {
    const { originalSceneId, originalStartTime, originalEndTime } = data;

    // Find the two scenes that were created from the split
    const splitScenes = await prisma.projectScene.findMany({
      where: {
        projectId,
        videoId: (await prisma.projectScene.findFirst({
          where: { projectId },
          orderBy: { order: 'asc' }
        }))?.videoId
      },
      orderBy: { order: 'asc' }
    });

    if (splitScenes.length >= 2) {
      // Delete the two split scenes
      await prisma.projectScene.deleteMany({
        where: {
          id: { in: [splitScenes[0].id, splitScenes[1].id] }
        }
      });

      // Recreate original scene
      await prisma.projectScene.create({
        data: {
          id: originalSceneId,
          projectId,
          videoId: splitScenes[0].videoId,
          startTime: originalStartTime,
          endTime: originalEndTime,
          order: splitScenes[0].order,
          audioLevel: splitScenes[0].audioLevel
        }
      });
    }
  }

  private async restoreScene(projectId: string, data: any) {
    // Implementation depends on what data was stored during deletion
    // For now, this is a placeholder
    logger.warn('Restore scene not yet implemented');
  }

  private async revertAudioLevel(sceneId: string, oldAudioLevel: number) {
    await prisma.projectScene.update({
      where: { id: sceneId },
      data: { audioLevel: oldAudioLevel }
    });
  }

  private async revertSceneResize(sceneId: string, oldStartTime: number, oldEndTime: number) {
    await prisma.projectScene.update({
      where: { id: sceneId },
      data: {
        startTime: oldStartTime,
        endTime: oldEndTime
      }
    });
  }
}
