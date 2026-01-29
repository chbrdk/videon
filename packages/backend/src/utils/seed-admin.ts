import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from './logger';

const prisma = new PrismaClient();

export const seedAdminUser = async () => {
    try {
        const email = 'admin@udg.de';
        const password = 'admin';
        const name = 'Admin';

        // Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            logger.info('✅ Admin user already exists');
            return;
        }

        logger.info('👤 Creating default admin user...');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: 'ADMIN',
                provider: 'LOCAL'
            }
        });

        logger.info('✅ Admin user created successfully');
    } catch (error) {
        logger.error('❌ Failed to seed admin user:', error);
    }
};
