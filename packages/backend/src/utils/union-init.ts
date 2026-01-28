/**
 * UNION Settings Initialization
 * 
 * Initializes services with API keys from UNION on app startup
 */

import { unionSettingsClient } from '../services/union-settings.client';
import logger from './logger';
import { getUnionConfig } from '../config/union';

/**
 * Initialize all services with UNION API keys
 */
export async function initializeUnionSettings(): Promise<void> {
  const config = getUnionConfig();
  
  if (!config.enabled) {
    logger.info('UNION Settings disabled, using environment variables');
    return;
  }

  try {
    logger.info('Loading API keys from UNION...');
    const keys = await unionSettingsClient.getApiKeys('videon');
    
    if (Object.keys(keys).length > 0) {
      logger.info('API keys loaded from UNION', {
        keys: Object.keys(keys),
      });

      // Set environment variables for services that don't support async initialization
      // This allows services to use process.env which is synchronous
      if (keys['openai_api_key']) {
        const oldKey = process.env.OPENAI_API_KEY;
        process.env.OPENAI_API_KEY = keys['openai_api_key'];
        if (oldKey && oldKey !== keys['openai_api_key']) {
          logger.info('OpenAI API key updated from UNION', {
            keyChanged: true,
          });
        }
      }
      if (keys['elevenlabs_api_key']) {
        const oldKey = process.env.ELEVENLABS_API_KEY;
        process.env.ELEVENLABS_API_KEY = keys['elevenlabs_api_key'];
        if (oldKey && oldKey !== keys['elevenlabs_api_key']) {
          logger.info('ElevenLabs API key updated from UNION', {
            keyChanged: true,
          });
        }
      }
    } else {
      logger.info('No keys found in UNION, using environment variables');
    }
  } catch (error: any) {
    logger.warn('Failed to load keys from UNION, using environment variables', {
      error: error.message,
    });
  }
}
