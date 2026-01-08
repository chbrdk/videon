import { Request, Response } from 'express';
import { AICreatorService, VideoSuggestion } from '../services/ai-creator.service';
import logger from '../utils/logger';

const aiCreatorService = new AICreatorService();

// In-memory cache for suggestions (24 hours)
const suggestionsCache = new Map<string, VideoSuggestion>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup expired suggestions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, suggestion] of suggestionsCache.entries()) {
    if (now - suggestion.createdAt.getTime() > CACHE_TTL) {
      suggestionsCache.delete(id);
    }
  }
}, 60 * 60 * 1000);

export class AICreatorController {
  /**
   * POST /api/ai-creator/analyze
   * Analyze user query and generate video suggestions
   */
  async analyze(req: Request, res: Response) {
    try {
      const { query, variantCount = 1 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query parameter is required and must be a string' 
        });
      }

      if (variantCount < 1 || variantCount > 3) {
        return res.status(400).json({ 
          error: 'variantCount must be between 1 and 3' 
        });
      }

      logger.info(`AI Creator: Analyzing query: "${query}"`);

      // Generate suggestions
      const suggestions = await aiCreatorService.createVideoSuggestionsFromQuery(
        query,
        variantCount
      );

      // Cache suggestions
      for (const suggestion of suggestions) {
        suggestionsCache.set(suggestion.id, suggestion);
      }

      logger.info(`AI Creator: Generated ${suggestions.length} suggestion(s)`);

      res.json({
        success: true,
        suggestions
      });
    } catch (error: any) {
      logger.error('AI Creator analyze error:', error);
      
      // Provide helpful error messages
      if (error.message.includes('No relevant scenes found')) {
        return res.status(404).json({
          error: 'No relevant scenes found for your query. Try different keywords or upload more videos.'
        });
      }
      
      if (error.message.includes('OPENAI_API_KEY')) {
        return res.status(500).json({
          error: 'AI service not configured. Please set OPENAI_API_KEY.'
        });
      }

      res.status(500).json({ 
        error: 'Failed to analyze query',
        details: error.message
      });
    }
  }

  /**
   * POST /api/ai-creator/create-project
   * Create a project from a suggestion
   */
  async createProject(req: Request, res: Response) {
    try {
      const { suggestionId, adjustments } = req.body;

      if (!suggestionId || typeof suggestionId !== 'string') {
        return res.status(400).json({ 
          error: 'suggestionId parameter is required' 
        });
      }

      // Get suggestion from cache
      const suggestion = suggestionsCache.get(suggestionId);
      if (!suggestion) {
        return res.status(404).json({ 
          error: 'Suggestion not found or expired. Please create a new suggestion.' 
        });
      }

      logger.info(`AI Creator: Creating project from suggestion: ${suggestionId}`);

      // Create project
      const projectId = await aiCreatorService.createProjectFromSuggestion(
        suggestion,
        adjustments
      );

      logger.info(`AI Creator: Project created: ${projectId}`);

      // Clean up suggestion from cache after successful project creation
      suggestionsCache.delete(suggestionId);

      res.json({
        success: true,
        projectId,
        message: 'Project created successfully'
      });
    } catch (error: any) {
      logger.error('AI Creator create project error:', error);
      res.status(500).json({ 
        error: 'Failed to create project',
        details: error.message
      });
    }
  }

  /**
   * GET /api/ai-creator/suggestions/:id
   * Get a cached suggestion by ID
   */
  async getSuggestion(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const suggestion = suggestionsCache.get(id);
      if (!suggestion) {
        return res.status(404).json({ 
          error: 'Suggestion not found or expired' 
        });
      }

      res.json({
        success: true,
        suggestion
      });
    } catch (error: any) {
      logger.error('AI Creator get suggestion error:', error);
      res.status(500).json({ 
        error: 'Failed to get suggestion',
        details: error.message
      });
    }
  }

  /**
   * GET /api/ai-creator/health
   * Check if AI Creator service is available
   */
  async health(req: Request, res: Response) {
    try {
      // Check if OpenAI API key is configured
      const hasApiKey = !!process.env.OPENAI_API_KEY;

      res.json({
        success: true,
        available: hasApiKey,
        model: 'gpt-5-mini',
        cachedSuggestions: suggestionsCache.size
      });
    } catch (error: any) {
      logger.error('AI Creator health check error:', error);
      res.status(500).json({ 
        error: 'Health check failed',
        details: error.message
      });
    }
  }
}

