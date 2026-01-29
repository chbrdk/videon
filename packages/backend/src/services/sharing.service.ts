import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export type ShareRole = 'VIEWER' | 'EDITOR';

export class SharingService {
    /**
     * Share a project with a user by email
     */
    async shareProject(projectId: string, targetEmail: string, role: ShareRole, requesterId: string) {
        try {
            const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
            if (!targetUser) {
                throw new Error('User not found');
            }

            if (targetUser.id === requesterId) {
                throw new Error('Cannot share with yourself');
            }

            // Check if already shared
            const existing = await prisma.projectShare.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: targetUser.id
                    }
                }
            });

            if (existing) {
                // Update role
                await prisma.projectShare.update({
                    where: { id: existing.id },
                    data: { role }
                });
            } else {
                // Create new share
                await prisma.projectShare.create({
                    data: {
                        projectId,
                        userId: targetUser.id,
                        role
                    }
                });
            }

            return { success: true };
        } catch (error) {
            logger.error('Error sharing project:', error);
            throw error;
        }
    }

    /**
     * Share a video with a user by email
     */
    async shareVideo(videoId: string, targetEmail: string, role: ShareRole, requesterId: string) {
        try {
            const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
            if (!targetUser) {
                throw new Error('User not found');
            }

            if (targetUser.id === requesterId) {
                throw new Error('Cannot share with yourself');
            }

            const existing = await prisma.videoShare.findUnique({
                where: {
                    videoId_userId: {
                        videoId,
                        userId: targetUser.id
                    }
                }
            });

            if (existing) {
                await prisma.videoShare.update({
                    where: { id: existing.id },
                    data: { role }
                });
            } else {
                await prisma.videoShare.create({
                    data: {
                        videoId,
                        userId: targetUser.id,
                        role
                    }
                });
            }

            return { success: true };
        } catch (error) {
            logger.error('Error sharing video:', error);
            throw error;
        }
    }

    /**
     * Get all items shared with a user
     */
    async getSharedWithMe(userId: string) {
        try {
            const [projects, videos] = await Promise.all([
                prisma.projectShare.findMany({
                    where: { userId },
                    include: { project: { include: { user: { select: { name: true, email: true } } } } }
                }),
                prisma.videoShare.findMany({
                    where: { userId },
                    include: { video: { include: { user: { select: { name: true, email: true } } } } }
                })
            ]);

            return {
                projects: projects.map(p => ({
                    ...p.project,
                    sharedRole: p.role,
                    owner: p.project.user
                })),
                videos: videos.map(v => ({
                    ...v.video,
                    sharedRole: v.role,
                    owner: v.video.user
                }))
            };
        } catch (error) {
            logger.error('Error fetching shared items:', error);
            throw error;
        }
    }

    /**
     * Revoke access
     */
    async removeProjectShare(projectId: string, userId: string) {
        try {
            await prisma.projectShare.delete({
                where: {
                    projectId_userId: {
                        projectId,
                        userId
                    }
                }
            });
        } catch (error) {
            logger.error('Error removing project share:', error);
            throw error;
        }
    }

    async removeVideoShare(videoId: string, userId: string) {
        try {
            await prisma.videoShare.delete({
                where: {
                    videoId_userId: {
                        videoId,
                        userId
                    }
                }
            });
        } catch (error) {
            logger.error('Error removing video share:', error);
            throw error;
        }
    }
}
