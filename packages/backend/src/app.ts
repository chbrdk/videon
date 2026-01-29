import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import videosRoutes from './routes/videos.routes';
import foldersRoutes from './routes/folders.routes';
import searchRoutes from './routes/search.routes';
import healthRoutes from './routes/health.routes';
import testRoutes from './routes/test.routes';
import testUploadRoutes from './routes/test-upload.routes';
import audioStemsRoutes from './routes/audio-stems.routes';
import projectRoutes from './routes/project.routes';
import saliencyRoutes from './routes/saliency.routes';
import servicesRoutes from './routes/services.routes';
import voiceSegmentRoutes from './routes/voice-segment.routes';
import aiCreatorRoutes from './routes/ai-creator.routes';
import { globalErrorHandler, notFoundHandler } from './utils/error-handler';
import { localeMiddleware } from './middleware/locale.middleware';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import config from './config';
import logger from './utils/logger';
import { initializeUnionSettings } from './utils/union-init';

// Initialize UNION Settings before anything else (non-blocking)
initializeUnionSettings().catch((error) => {
  logger.warn('Failed to initialize UNION settings, using environment variables', {
    error: error.message,
  });
});

// Zentrale Backend URL für Frontend-Kommunikation
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4001';

const app: express.Application = express();
const PORT = config.port;

// Initialize UNION Settings (load API keys from UNION)
// This runs once at startup and sets environment variables for services
initializeUnionSettings().catch((error) => {
  logger.warn('Failed to initialize UNION settings, using environment variables', {
    error: error.message,
  });
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", BACKEND_URL],
      mediaSrc: ["'self'", "blob:", BACKEND_URL],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for video streaming
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// Rate limiting - TEMPORARILY DISABLED FOR DEBUGGING
// const limiter = rateLimit({
//   windowMs: config.security.rateLimit.windowMs,
//   max: config.security.rateLimit.max,
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//     retryAfter: `${Math.ceil(config.security.rateLimit.windowMs / 60000)} minutes`
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiting to all requests except health checks - TEMPORARILY DISABLED
// app.use((req, res, next) => {
//   if (req.path === '/api/health') {
//     return next();
//   }
//   return limiter(req, res, next);
// });

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Locale detection middleware
app.use(localeMiddleware);

// Auth & Session Imports
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import passport from './config/auth';
import authRoutes from './routes/auth.routes';

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Trust Proxy (required for secure cookies behind Nginx)
app.set('trust proxy', 1);

// Redis Client for Session
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(err => logger.error('Redis Session Client Error', err));

// Session Middleware
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'changeme_in_production_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.use('/api/auth', authRoutes);



app.use('/api/videos', videosRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/test', testRoutes);
app.use('/api/test-upload', testUploadRoutes);
app.use('/api/audio-stems', audioStemsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/ai-creator', aiCreatorRoutes);
app.use('/api', saliencyRoutes);
app.use('/api', voiceSegmentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VIDEON API',
    version: '1.0.0',
    description: 'Video Analysis Dashboard API',
    endpoints: {
      videos: '/api/videos',
      folders: '/api/folders',
      search: '/api/search',
      health: '/api/health',
      audioStems: '/api/audio-stems',
      projects: '/api/projects',
      aiCreator: '/api/ai-creator',
      saliency: '/api/saliency-analyses',
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server only if not in test environment
if (config.nodeEnv !== 'test') {
  app.listen(PORT, () => {
    logger.info('VIDEON Backend API started', {
      port: PORT,
      environment: config.nodeEnv,
      corsOrigins: config.security.corsOrigins,
      unionSettingsEnabled: config.services.union?.enabled || false,
    });

    // Seed Admin User
    (async () => {
      try {
        const { PrismaClient } = require('@prisma/client');
        const bcrypt = require('bcryptjs');
        const prisma = new PrismaClient();

        const email = 'admin@udg.de';
        const existingAdmin = await prisma.user.findUnique({ where: { email } });

        if (!existingAdmin) {
          logger.info('👤 Creating default admin user...');
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('admin', salt);

          await prisma.user.create({
            data: {
              email,
              passwordHash,
              name: 'Admin',
              role: 'ADMIN',
              provider: 'LOCAL'
            }
          });
          logger.info('✅ Admin user created successfully');
        }
      } catch (err) {
        logger.error('Failed to seed admin:', err);
      }
    })();
  });
}

export default app;
