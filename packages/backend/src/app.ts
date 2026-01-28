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

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Qwen VL Route - MUST BE BEFORE ALL OTHER ROUTES!
app.post('/api/videos/:id/qwenVL/analyze', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const QwenVLService = require('./services/qwen-vl.service').QwenVLService;
    const qwenVLService = new QwenVLService();

    logger.info(`Starting Qwen VL analysis for video ${id}`);

    // Check if Qwen VL service is available
    let isAvailable = false;
    try {
      isAvailable = await qwenVLService.isAvailable();
    } catch (healthError: any) {
      logger.error(`Health check error for Qwen VL service:`, healthError);
      // Continue with service unavailable handling
    }

    if (!isAvailable) {
      const serviceUrl = qwenVLService.getServiceUrl();
      logger.error(`Qwen VL service is not available at ${serviceUrl}`);
      return res.status(503).json({ 
        error: 'Qwen VL service unavailable',
        message: 'The Qwen VL analysis service is not running or not reachable. Please check if the service is started. This service runs locally (outside Docker) on port 8081.',
        serviceUrl: serviceUrl,
        statusCode: 503,
        timestamp: new Date().toISOString(),
        path: req.path,
        instructions: 'To start the service, run: cd packages/qwen-vl-service && ./start.sh'
      });
    }

    logger.info(`Triggering Qwen VL analysis for video: ${id}`);
    
    // Trigger analysis asynchronously (don't await to avoid blocking)
    qwenVLService.analyzeVideo(id)
      .then(() => {
        logger.info(`✅ Qwen VL analysis completed for video ${id}`);
      })
      .catch((error: any) => {
        logger.error(`❌ Qwen VL analysis failed for video ${id}:`, error);
      });

    res.json({ 
      message: 'Qwen VL analysis started',
      videoId: id,
      status: 'ANALYZING'
    });

  } catch (error: any) {
    logger.error(`Error starting Qwen VL analysis for video ${req.params?.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to start Qwen VL analysis',
      message: error?.message || 'An unexpected error occurred while starting Qwen VL analysis',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

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
  });
}

export default app;
