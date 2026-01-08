import { Router } from 'express';
import { AICreatorController } from '../controllers/ai-creator.controller';

const router = Router();
const controller = new AICreatorController();

/**
 * AI Creator Routes
 * Intelligent video creation using GPT-5-mini
 */

// Analyze user query and generate suggestions
router.post('/analyze', (req, res) => controller.analyze(req, res));

// Create project from suggestion
router.post('/create-project', (req, res) => controller.createProject(req, res));

// Get cached suggestion
router.get('/suggestions/:id', (req, res) => controller.getSuggestion(req, res));

// Health check
router.get('/health', (req, res) => controller.health(req, res));

export default router;

