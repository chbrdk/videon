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

// Zentrale Backend URL für Frontend-Kommunikation
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4001';

const app: express.Application = express();
const PORT = config.port;

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
  console.log('🎯🎯🎯 Qwen VL Route HIT!', req.method, req.path, req.url);
  console.log('🎯 Qwen VL Route HIT DIRECTLY!', req.method, req.path, req.params, req.url);
  try {
    const { id } = req.params;
    const QwenVLService = require('./services/qwen-vl.service').QwenVLService;
    const qwenVLService = new QwenVLService();

    const isAvailable = await qwenVLService.isAvailable();
    if (!isAvailable) {
      return res.status(503).json({ 
        error: 'Qwen VL Service not available',
        message: 'Qwen VL Service is not running or not reachable'
      });
    }

    console.log(`🎯 Triggering Qwen VL analysis for video: ${id}`);
    
    qwenVLService.analyzeVideo(id).catch((error: any) => {
      console.error(`❌ Qwen VL analysis failed for video ${id}:`, error);
    });

    res.json({ 
      message: 'Qwen VL analysis started',
      videoId: id,
      status: 'ANALYZING'
    });

  } catch (error: any) {
    console.error('❌ Qwen VL analysis trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger Qwen VL analysis' });
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
    name: 'PrismVid API',
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
    logger.info('PrismVid Backend API started', {
      port: PORT,
      environment: config.nodeEnv,
      corsOrigins: config.security.corsOrigins
    });
  });
}

export default app;
