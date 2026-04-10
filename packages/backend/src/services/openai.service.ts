import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import logger from '../utils/logger';
import { unionSettingsClient } from './union-settings.client';

/** Structured semantic description for keyframe / scene analysis (used with vision + structured outputs). */
export const semanticSceneDescriptionSchema = z.object({
  summary: z.string().describe('Kurze zusammenhängende Beschreibung der Szene'),
  subjects: z.array(z.string()).describe('Erkannte Personen, Objekte oder Motive'),
  actions: z.array(z.string()).describe('Was passiert / Aktivitäten'),
  setting: z.string().describe('Ort oder Umgebung'),
  mood: z.string().describe('Stimmung oder Atmosphäre'),
  notable_details: z.array(z.string()).describe('Weitere auffällige Details'),
});

export type SemanticSceneDescription = z.infer<typeof semanticSceneDescriptionSchema>;

/** JSON Schema for OpenAI Structured Outputs (strict). */
export const semanticSceneJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    subjects: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string' } },
    setting: { type: 'string' },
    mood: { type: 'string' },
    notable_details: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'subjects', 'actions', 'setting', 'mood', 'notable_details'],
} as const;

export function formatSemanticSceneDescription(s: SemanticSceneDescription): string {
  const lines: string[] = [s.summary.trim()];
  if (s.subjects?.length) lines.push(`Subjekte: ${s.subjects.join(', ')}`);
  if (s.actions?.length) lines.push(`Aktionen: ${s.actions.join(', ')}`);
  if (s.setting?.trim()) lines.push(`Setting: ${s.setting.trim()}`);
  if (s.mood?.trim()) lines.push(`Stimmung: ${s.mood.trim()}`);
  if (s.notable_details?.length) lines.push(`Details: ${s.notable_details.join('; ')}`);
  return lines.join('\n');
}

export class OpenAIService {
  private client: OpenAI;
  private apiKey: string | undefined;

  /** True if an API key was loaded (env or constructor). */
  isConfigured(): boolean {
    return !!this.client;
  }

  constructor(apiKey?: string) {
    // If API key provided, use it directly
    if (apiKey) {
      this.apiKey = apiKey;
      this.client = new OpenAI({ apiKey });
      return;
    }

    // Otherwise, try to get key from environment (non-throwing)
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) {
      this.apiKey = envKey;
      this.client = new OpenAI({ apiKey: envKey });
    } else {
      logger.warn('OPENAI_API_KEY is not set. OpenAI features will be disabled until initialized via Union or update.');
    }
  }

  /**
   * Initialize with UNION keys (async)
   * Call this after service creation to load keys from UNION
   */
  async initializeFromUnion(): Promise<void> {
    try {
      const keys = await unionSettingsClient.getApiKeys('videon');
      const unionKey = keys['openai_api_key'];

      if (unionKey && unionKey !== this.apiKey) {
        // Update API key and recreate client
        this.apiKey = unionKey;
        this.client = new OpenAI({ apiKey: unionKey });
        logger.info('OpenAI client initialized with key from UNION');
      } else if (unionKey) {
        logger.debug('OpenAI key from UNION matches environment variable');
      } else {
        logger.debug('No OpenAI key found in UNION');
      }
    } catch (error: any) {
      logger.warn('Failed to load OpenAI key from UNION', {
        error: error.message,
      });
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.client) throw new Error('OpenAI client is not initialized (missing API key)');
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error creating embedding:', error);
      throw error;
    }
  }

  /**
   * Creates a chat completion using GPT-5-mini
   * @param messages Array of chat messages with role and content
   * @param options Optional configuration for temperature and max tokens
   * @returns The completion response content
   */
  async createChatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'text' | 'json_object';
    }
  ): Promise<string> {
    try {
      if (!this.client) throw new Error('OpenAI client is not initialized (missing API key)');
      // GPT-5-mini only supports temperature: 1 (default), so we omit it
      const completionParams: any = {
        model: 'gpt-5-mini',
        messages: messages,
        max_completion_tokens: options?.maxTokens ?? 16000, // High limit for GPT-5-mini reasoning + output
      };

      if (options?.responseFormat === 'json_object') {
        completionParams.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(completionParams);

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content in GPT-5-mini response');
      }

      return content;
    } catch (error: any) {
      logger.error('Error creating chat completion:', error);
      throw new Error(`GPT-5-mini chat completion failed: ${error.message}`);
    }
  }

  /**
   * Creates a structured JSON response from GPT-5-mini
   * @param systemPrompt System instructions
   * @param userPrompt User query
   * @param options Optional configuration
   * @returns Parsed JSON object
   */
  async createStructuredCompletion<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T> {
    const response = await this.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        ...options,
        responseFormat: 'json_object'
      }
    );

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      logger.error('Failed to parse GPT-5-mini JSON response:', response);
      throw new Error('Invalid JSON response from GPT-5-mini');
    }
  }

  // Cosine similarity für Vektor-Vergleich
  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Vision + structured output: analyze one image (base64) and return parsed object + formatted text for storage.
   */
  async analyzeKeyframeStructured(
    imageBase64: string,
    mimeType: string,
    userPrompt: string,
    model: string,
    maxCompletionTokens = 4096
  ): Promise<{ parsed: SemanticSceneDescription; descriptionText: string }> {
    if (!this.client) throw new Error('OpenAI client is not initialized (missing API key)');

    const system =
      'Du bist ein präziser Video-/Bildanalyst. Antworte ausschließlich mit gültigem JSON gemäß Schema. Nutze Deutsch, sofern die Eingabe deutsch ist.';

    const userContent: ChatCompletionMessageParam['content'] = [
      { type: 'text', text: userPrompt },
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
    ];

    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'semantic_scene',
          strict: true,
          schema: semanticSceneJsonSchema as unknown as Record<string, unknown>,
        },
      },
      max_completion_tokens: maxCompletionTokens,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('No content in vision structured output response');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      logger.error('Vision model returned non-JSON:', raw);
      throw new Error('Invalid JSON from vision model');
    }

    const parsed = semanticSceneDescriptionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.error('Vision structured output failed Zod', parsed.error.flatten());
      throw new Error('Structured output did not match schema');
    }

    return {
      parsed: parsed.data,
      descriptionText: formatSemanticSceneDescription(parsed.data),
    };
  }

  /**
   * Multiple keyframes in one request (same schema; prompt should ask for synthesis across frames).
   */
  async analyzeKeyframesStructured(
    frames: { base64: string; mimeType: string }[],
    userPrompt: string,
    model: string,
    maxCompletionTokens = 8192
  ): Promise<{ parsed: SemanticSceneDescription; descriptionText: string }> {
    if (!this.client) throw new Error('OpenAI client is not initialized (missing API key)');
    if (frames.length === 0) throw new Error('No frames provided');

    const system =
      'Du bist ein präziser Video-Analyst. Die Nutzereingabe enthält mehrere Bilder derselben Szene. Fasse sie zu EINER strukturierten Beschreibung zusammen.';

    const parts: Extract<ChatCompletionMessageParam, { role: 'user' }>['content'] = [
      { type: 'text', text: userPrompt },
      ...frames.map((f) => ({
        type: 'image_url' as const,
        image_url: { url: `data:${f.mimeType};base64,${f.base64}` },
      })),
    ];

    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: parts },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'semantic_scene',
          strict: true,
          schema: semanticSceneJsonSchema as unknown as Record<string, unknown>,
        },
      },
      max_completion_tokens: maxCompletionTokens,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('No content in vision structured output response');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      logger.error('Vision model returned non-JSON:', raw);
      throw new Error('Invalid JSON from vision model');
    }

    const parsed = semanticSceneDescriptionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.error('Vision structured output failed Zod', parsed.error.flatten());
      throw new Error('Structured output did not match schema');
    }

    return {
      parsed: parsed.data,
      descriptionText: formatSemanticSceneDescription(parsed.data),
    };
  }
}
