/**
 * UNION Integration Configuration
 * 
 * UNION is the central settings service for all MSQDX products.
 * VIDEON uses UNION to retrieve API keys (OpenAI, ElevenLabs, etc.)
 */

import dotenv from 'dotenv';
dotenv.config();

export interface UnionConfig {
  enabled: boolean;
  baseUrl: string;
  cacheTtl: number; // Cache TTL in seconds (default: 900 = 15 minutes)
}

/**
 * Get UNION configuration
 * 
 * UNION provides:
 * - Centralized API key management
 * - Encrypted storage
 * - Admin UI for key management
 */
export function getUnionConfig(): UnionConfig {
  const enabled = process.env.UNION_SETTINGS_ENABLED?.toLowerCase() !== 'false';
  const baseUrl = process.env.UNION_BASE_URL || 'http://localhost:8000';
  const cacheTtl = parseInt(process.env.UNION_SETTINGS_CACHE_TTL || '900', 10); // 15 minutes default

  return {
    enabled,
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    cacheTtl,
  };
}
