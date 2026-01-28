import OpenAI from 'openai';
import logger from '../utils/logger';
import { unionSettingsClient } from './union-settings.client';

export class OpenAIService {
  private client: OpenAI;
  private apiKey: string;
  
  constructor(apiKey?: string) {
    // If API key provided, use it directly (for testing or manual override)
    if (apiKey) {
      this.apiKey = apiKey;
      this.client = new OpenAI({ apiKey });
      return;
    }

    // Otherwise, try to get key from environment or UNION
    this.apiKey = this.getApiKey();
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  private getApiKey(): string {
    // Fallback to environment variable
    const envKey = process.env.OPENAI_API_KEY;
    
    if (!envKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    return envKey;
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
        logger.debug('No OpenAI key found in UNION, using environment variable');
      }
    } catch (error: any) {
      logger.warn('Failed to load OpenAI key from UNION, using environment variable', {
        error: error.message,
      });
    }
  }
  
  async createEmbedding(text: string): Promise<number[]> {
    try {
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
}
