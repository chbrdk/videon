/**
 * AI Creator Service
 * Uses GPT-5-mini to intelligently create video projects from natural language queries
 */
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai.service';
import { SearchService, SearchResult } from './search.service';
import { ProjectService } from './project.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Type Definitions
export interface QueryAnalysis {
  intent: string;
  searchQueries: string[];
  estimatedDuration?: number;
  tone?: string;
}

export interface SceneCandidate {
  videoId: string;
  videoTitle: string;
  sceneId?: string;
  startTime: number;
  endTime: number;
  duration: number;
  content: string;
  qwenVLDescription?: string;
  transcription?: string;
  thumbnail?: string;
}

export interface EvaluatedScene extends SceneCandidate {
  score: number;
  reasoning: string;
  suggestedTrimming?: {
    start: number;
    end: number;
  };
}

export interface SelectedScene {
  videoId: string;
  sceneId?: string;
  startTime: number;
  endTime: number;
  order: number;
  reasoning: string;
}

export interface VideoSuggestion {
  id: string;
  title: string;
  description: string;
  scenes: SelectedScene[];
  totalDuration: number;
  tone: string;
  createdAt: Date;
}

export class AICreatorService {
  private openaiService: OpenAIService;
  private searchService: SearchService;
  private projectService: ProjectService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.searchService = new SearchService();
    this.projectService = new ProjectService();
  }

  /**
   * Main entry point: Analyze query and create video suggestions
   */
  async createVideoSuggestionsFromQuery(
    query: string,
    variantCount: number = 1
  ): Promise<VideoSuggestion[]> {
    console.log(`🤖 [AI Creator Service] Starting query: "${query}"`);
    logger.info(`🤖 AI Creator: Processing query: "${query}"`);

    // Step 1: Analyze user query with GPT-4o-mini
    console.log('🤖 [AI Creator Service] Step 1: Analyzing query with GPT-4o-mini...');
    const analysis = await this.analyzeUserQuery(query);
    console.log(`🤖 [AI Creator Service] Analysis result:`, JSON.stringify(analysis));
    logger.info(`📊 Query analysis: ${JSON.stringify(analysis)}`);

    // Step 2: Find relevant scenes using multiple search queries
    console.log(`🤖 [AI Creator Service] Step 2: Searching with ${analysis.searchQueries.length} queries...`);
    const sceneCandidates = await this.findRelevantScenes(analysis.searchQueries);
    console.log(`🤖 [AI Creator Service] Found ${sceneCandidates.length} scene candidates`);
    logger.info(`🔍 Found ${sceneCandidates.length} scene candidates`);

    if (sceneCandidates.length === 0) {
      console.log('🤖 [AI Creator Service] ERROR: No candidates found, throwing error');
      throw new Error('No relevant scenes found for this query');
    }

    // Step 3: Evaluate and rank scenes with GPT-5-mini
    const evaluatedScenes = await this.evaluateScenes(sceneCandidates, analysis.intent);
    logger.info(`✅ Evaluated ${evaluatedScenes.length} scenes`);

    // Step 4: Create video suggestions
    const suggestions = await this.createVideoSuggestions(
      query,
      analysis,
      evaluatedScenes,
      variantCount
    );
    logger.info(`🎬 Created ${suggestions.length} video suggestion(s)`);

    return suggestions;
  }

  /**
   * Analyze user query with GPT-5-mini to extract intent and generate search queries
   */
  async analyzeUserQuery(query: string): Promise<QueryAnalysis> {
    const systemPrompt = `You are a video editor assistant AI. Analyze user requests for creating videos and extract key information.

Your task:
1. Understand the main intent (what kind of video they want)
2. Generate 3-5 different search keywords/queries to find relevant video scenes
   - Use SINGLE WORDS or very short phrases (1-2 words max)
   - Extract key nouns and concepts from the user's request
   - Examples: "management", "presentation", "conference", "speaker"
   - Avoid long descriptive phrases
3. Estimate the desired video duration in seconds (default 60 if not specified)
4. Identify the tone/style (professional, casual, energetic, dramatic, etc.)

IMPORTANT: Respond ONLY with valid JSON. No other text.`;

    const userPrompt = `User request: "${query}"

Respond in this exact JSON format:
{
  "intent": "brief description of what the user wants",
  "searchQueries": ["query1", "query2", "query3", "query4", "query5"],
  "estimatedDuration": 60,
  "tone": "professional"
}`;

    try {
      const response = await this.openaiService.createStructuredCompletion<QueryAnalysis>(
        systemPrompt,
        userPrompt,
        { temperature: 0.7, maxTokens: 800 }
      );

      // Validate response
      if (!response.intent || !response.searchQueries || response.searchQueries.length === 0) {
        throw new Error('Invalid query analysis response');
      }

      return response;
    } catch (error: any) {
      logger.error('Query analysis failed:', error);
      // Fallback: Use the original query
      return {
        intent: query,
        searchQueries: [query],
        estimatedDuration: 60,
        tone: 'professional'
      };
    }
  }

  /**
   * Find relevant scenes using multiple search queries
   */
  async findRelevantScenes(searchQueries: string[]): Promise<SceneCandidate[]> {
    const allResults: SearchResult[] = [];
    const seenScenes = new Set<string>();

    console.log(`🔍 [Find Scenes] Searching with ${searchQueries.length} queries:`, searchQueries);

    // Execute all search queries
    for (const query of searchQueries) {
      try {
        console.log(`🔍 [Find Scenes] Executing search for: "${query}"`);
        const results = await this.searchService.search(query, 20);
        console.log(`🔍 [Find Scenes] Search returned ${results.length} results for "${query}"`);
        
        // Deduplicate by scene/video combination
        for (const result of results) {
          const key = `${result.videoId}-${result.sceneId || 'full'}-${result.startTime}`;
          if (!seenScenes.has(key)) {
            seenScenes.add(key);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.error(`🔍 [Find Scenes] Search failed for query "${query}":`, error);
        logger.error(`Search failed for query "${query}":`, error);
      }
    }
    
    console.log(`🔍 [Find Scenes] Total unique results: ${allResults.length}`);

    // Convert to SceneCandidate format and enrich with additional data
    const candidates: SceneCandidate[] = [];
    
    for (const result of allResults) {
      try {
        // Get additional scene data if available
        let qwenVLDescription: string | undefined;
        let transcription: string | undefined;

        if (result.sceneId) {
          const scene = await prisma.scene.findUnique({
            where: { id: result.sceneId },
            include: {
              visionAnalysis: true,
              video: {
                include: {
                  transcriptions: true
                }
              }
            }
          });

          if (scene) {
            qwenVLDescription = scene.visionAnalysis?.qwenVLDescription || undefined;
            
            // Extract transcription for this scene
            if (scene.video.transcriptions && scene.video.transcriptions.length > 0) {
              const segments = JSON.parse(scene.video.transcriptions[0].segments);
              const sceneSegments = segments.filter((seg: any) => 
                seg.start < scene.endTime && seg.end > scene.startTime
              );
              transcription = sceneSegments.map((seg: any) => seg.text).join(' ');
            }
          }
        }

        candidates.push({
          videoId: result.videoId,
          videoTitle: result.videoTitle,
          sceneId: result.sceneId,
          startTime: result.startTime,
          endTime: result.endTime,
          duration: result.endTime - result.startTime,
          content: result.content,
          qwenVLDescription,
          transcription,
          thumbnail: result.thumbnail
        });
      } catch (error) {
        logger.error('Failed to enrich scene candidate:', error);
        // Add basic candidate without enrichment
        candidates.push({
          videoId: result.videoId,
          videoTitle: result.videoTitle,
          sceneId: result.sceneId,
          startTime: result.startTime,
          endTime: result.endTime,
          duration: result.endTime - result.startTime,
          content: result.content,
          thumbnail: result.thumbnail
        });
      }
    }

    return candidates;
  }

  /**
   * Evaluate scenes with GPT-5-mini
   */
  async evaluateScenes(
    candidates: SceneCandidate[],
    userIntent: string
  ): Promise<EvaluatedScene[]> {
    // Limit to top 30 candidates to avoid token limits
    const topCandidates = candidates.slice(0, 30);
    
    const evaluatedScenes: EvaluatedScene[] = [];

    // Evaluate in batches to optimize API calls
    const batchSize = 10;
    for (let i = 0; i < topCandidates.length; i += batchSize) {
      const batch = topCandidates.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.evaluateSceneBatch(batch, userIntent);
        evaluatedScenes.push(...batchResults);
      } catch (error) {
        logger.error('Batch evaluation failed:', error);
        // Add scenes with default scores
        evaluatedScenes.push(...batch.map(scene => ({
          ...scene,
          score: 50,
          reasoning: 'Could not evaluate with AI'
        })));
      }
    }

    // Sort by score descending
    return evaluatedScenes.sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluate a batch of scenes
   */
  private async evaluateSceneBatch(
    scenes: SceneCandidate[],
    userIntent: string
  ): Promise<EvaluatedScene[]> {
    const systemPrompt = `You are evaluating video scenes for relevance to a user's request.

Rate each scene from 0-100 based on:
- Content match with user intent
- Visual quality (from descriptions)
- Duration appropriateness
- Storytelling value

IMPORTANT: Respond ONLY with valid JSON array. No other text.`;

    const scenesInfo = scenes.map((scene, idx) => ({
      index: idx,
      duration: scene.duration.toFixed(1) + 's',
      description: scene.qwenVLDescription || scene.content.substring(0, 200),
      transcription: scene.transcription?.substring(0, 150) || 'N/A'
    }));

    const userPrompt = `User wants: "${userIntent}"

Evaluate these ${scenes.length} scenes:
${JSON.stringify(scenesInfo, null, 2)}

Respond with JSON array:
[
  {
    "index": 0,
    "score": 85,
    "reasoning": "brief explanation",
    "suggestedTrimming": { "start": 5, "end": 20 }
  }
]

If no trimming needed, omit suggestedTrimming.`;

    try {
      const response = await this.openaiService.createStructuredCompletion<Array<{
        index: number;
        score: number;
        reasoning: string;
        suggestedTrimming?: { start: number; end: number };
      }>>(
        systemPrompt,
        userPrompt,
        { temperature: 0.5, maxTokens: 2000 }
      );

      // Map results back to scenes
      return scenes.map((scene, idx) => {
        const evaluation = response.find(r => r.index === idx) || {
          score: 50,
          reasoning: 'No evaluation available'
        };

        return {
          ...scene,
          ...evaluation
        };
      });
    } catch (error) {
      logger.error('Scene evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Create video suggestions from evaluated scenes
   */
  private async createVideoSuggestions(
    originalQuery: string,
    analysis: QueryAnalysis,
    evaluatedScenes: EvaluatedScene[],
    variantCount: number
  ): Promise<VideoSuggestion[]> {
    // Take top scored scenes (lowered threshold to 40 for better results)
    const topScenes = evaluatedScenes.filter(s => s.score >= 40).slice(0, 20);

    console.log(`🎬 [Video Suggestions] ${topScenes.length} scenes passed score threshold (>= 40)`);

    if (topScenes.length === 0) {
      console.log(`🎬 [Video Suggestions] No scenes passed threshold. Total evaluated: ${evaluatedScenes.length}`);
      if (evaluatedScenes.length > 0) {
        console.log(`🎬 [Video Suggestions] Top scores:`, evaluatedScenes.slice(0, 3).map(s => s.score));
      }
      throw new Error('No suitable scenes found');
    }

    const systemPrompt = `You are assembling video projects from selected scenes.

Create ${variantCount} different video suggestion(s). Each should:
1. Select 3-8 most relevant scenes
2. Order them logically for storytelling
3. Apply suggested trimming if beneficial
4. Target duration: ${analysis.estimatedDuration || 60} seconds
5. Maintain consistent ${analysis.tone || 'professional'} tone

IMPORTANT: Respond ONLY with valid JSON array. No other text.`;

    const scenesInfo = topScenes.map((scene, idx) => ({
      index: idx,
      videoId: scene.videoId,
      sceneId: scene.sceneId,
      startTime: scene.startTime,
      endTime: scene.endTime,
      duration: scene.duration,
      score: scene.score,
      reasoning: scene.reasoning,
      suggestedTrimming: scene.suggestedTrimming,
      description: (scene.qwenVLDescription || scene.content).substring(0, 200)
    }));

    const userPrompt = `User request: "${originalQuery}"
Target duration: ${analysis.estimatedDuration || 60}s
Tone: ${analysis.tone || 'professional'}

Available scenes (${topScenes.length}):
${JSON.stringify(scenesInfo, null, 2)}

Create ${variantCount} video suggestion(s) in this JSON format:
[
  {
    "title": "descriptive title",
    "description": "brief description of video concept",
    "scenes": [
      {
        "index": 0,
        "startTime": 10.5,
        "endTime": 25.3,
        "order": 0,
        "reasoning": "why this scene and position"
      }
    ]
  }
]

Use "index" to reference scenes. Apply trimming by adjusting startTime/endTime.`;

    try {
      const response = await this.openaiService.createStructuredCompletion<Array<{
        title: string;
        description: string;
        scenes: Array<{
          index: number;
          startTime?: number;
          endTime?: number;
          order: number;
          reasoning: string;
        }>;
      }>>(
        systemPrompt,
        userPrompt,
        { temperature: 0.8, maxTokens: 3000 }
      );

      // Convert to VideoSuggestion format
      const suggestions: VideoSuggestion[] = response.map(suggestion => {
        const scenes: SelectedScene[] = suggestion.scenes.map(sceneRef => {
          const originalScene = topScenes[sceneRef.index];
          
          return {
            videoId: originalScene.videoId,
            sceneId: originalScene.sceneId,
            startTime: sceneRef.startTime ?? originalScene.startTime,
            endTime: sceneRef.endTime ?? originalScene.endTime,
            order: sceneRef.order,
            reasoning: sceneRef.reasoning
          };
        });

        const totalDuration = scenes.reduce((sum, scene) => 
          sum + (scene.endTime - scene.startTime), 0
        );

        return {
          id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: suggestion.title,
          description: suggestion.description,
          scenes: scenes.sort((a, b) => a.order - b.order),
          totalDuration,
          tone: analysis.tone || 'professional',
          createdAt: new Date()
        };
      });

      return suggestions;
    } catch (error: any) {
      logger.error('Video assembly failed:', error);
      
      // Fallback: Create simple suggestion with top 5 scenes
      const fallbackScenes: SelectedScene[] = topScenes.slice(0, 5).map((scene, idx) => ({
        videoId: scene.videoId,
        sceneId: scene.sceneId,
        startTime: scene.startTime,
        endTime: scene.endTime,
        order: idx,
        reasoning: `High relevance score: ${scene.score}`
      }));

      return [{
        id: `suggestion-fallback-${Date.now()}`,
        title: 'AI-Selected Scenes',
        description: originalQuery,
        scenes: fallbackScenes,
        totalDuration: fallbackScenes.reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
        tone: analysis.tone || 'professional',
        createdAt: new Date()
      }];
    }
  }

  /**
   * Create a project from a suggestion
   */
  async createProjectFromSuggestion(
    suggestion: VideoSuggestion,
    adjustments?: Partial<VideoSuggestion>
  ): Promise<string> {
    // Apply adjustments if provided
    const finalSuggestion = adjustments 
      ? { ...suggestion, ...adjustments }
      : suggestion;

    logger.info(`📁 Creating project: ${finalSuggestion.title}`);

    // Create project
    const project = await this.projectService.createProject({
      name: finalSuggestion.title,
      description: finalSuggestion.description
    });

    // Add scenes to project
    for (const scene of finalSuggestion.scenes) {
      await this.projectService.addSceneToProject(project.id, {
        videoId: scene.videoId,
        startTime: scene.startTime,
        endTime: scene.endTime
      });
    }

    logger.info(`✅ Project created: ${project.id}`);
    return project.id;
  }
}

