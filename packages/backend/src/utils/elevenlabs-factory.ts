/**
 * ElevenLabs Client Factory
 * 
 * Creates ElevenLabs client with API key from UNION or environment
 */

import { ElevenLabsClient } from '../services/elevenlabs.client';
import { unionSettingsClient } from '../services/union-settings.client';
import logger from './logger';

let cachedElevenLabsClient: ElevenLabsClient | null = null;
let lastApiKey: string | null = null;

/**
 * Get or create ElevenLabs client with UNION key
 */
export async function getElevenLabsClient(): Promise<ElevenLabsClient | null> {
  // Try to get key from UNION first
  let apiKey: string | null = null;

  try {
    const unionKey = await unionSettingsClient.getApiKey('elevenlabs_api_key', 'videon');
    if (unionKey) {
      apiKey = unionKey;
      logger.info('Using ElevenLabs API key from UNION');
    }
  } catch (error: any) {
    logger.debug('Failed to load ElevenLabs key from UNION, trying environment variable', {
      error: error.message,
    });
  }

  // Fallback to environment variable
  if (!apiKey) {
    apiKey = process.env.ELEVENLABS_API_KEY || null;
    if (apiKey) {
      logger.debug('Using ElevenLabs API key from environment variable');
    }
  }

  if (!apiKey) {
    logger.warn('ElevenLabs API key not found in UNION or environment variables');
    return null;
  }

  // Recreate client if API key changed
  if (!cachedElevenLabsClient || lastApiKey !== apiKey) {
    cachedElevenLabsClient = new ElevenLabsClient(apiKey);
    lastApiKey = apiKey;
    logger.info('ElevenLabs client created/updated');
  }

  return cachedElevenLabsClient;
}

/**
 * Get ElevenLabs client synchronously (uses cached value or env var)
 * For synchronous contexts where async is not possible
 */
export function getElevenLabsClientSync(): ElevenLabsClient | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  // Recreate if key changed
  if (!cachedElevenLabsClient || lastApiKey !== apiKey) {
    cachedElevenLabsClient = new ElevenLabsClient(apiKey);
    lastApiKey = apiKey;
  }

  return cachedElevenLabsClient;
}
