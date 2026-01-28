import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '../config/storion';

// Singleton Prisma Client
// Prevents too many database connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For STORION, we need to set search_path to 'videon' schema
// This is done via connection string parameter: ?schema=videon
// Or via direct SQL: SET search_path = videon, public
const prismaConfig: any = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl().replace('postgresql+psycopg://', 'postgresql://'), // Prisma doesn't support psycopg protocol
    },
  },
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

