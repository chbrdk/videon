/**
 * UNION Settings Client for VIDEON
 * 
 * Client for retrieving API keys from UNION Settings API
 */

import axios, { AxiosInstance } from 'axios';
import { getUnionConfig } from '../config/union';
import logger from '../utils/logger';

interface CachedKey {
  value: string;
  expiresAt: number;
}

/**
 * Simple in-memory cache for API keys
 * Keys are cached for the configured TTL
 */
class KeyCache {
  private cache: Map<string, CachedKey> = new Map();

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearKey(key: string): void {
    this.cache.delete(key);
  }
}

export class UnionSettingsClient {
  private baseUrl: string;
  private enabled: boolean;
  private cacheTtl: number;
  private axiosInstance: AxiosInstance;
  private cache: KeyCache;

  constructor() {
    const config = getUnionConfig();
    this.enabled = config.enabled;
    this.baseUrl = config.baseUrl;
    this.cacheTtl = config.cacheTtl;
    this.cache = new KeyCache();

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000, // 5 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.enabled) {
      logger.info('UNION Settings Client initialized', {
        baseUrl: this.baseUrl,
        cacheTtl: this.cacheTtl,
      });
    } else {
      logger.info('UNION Settings Client disabled, using environment variables');
    }
  }

  /**
   * Get a single API key from UNION
   */
  async getApiKey(keyName: string, serviceName: string = 'videon'): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    // Check cache first
    const cacheKey = `union:settings:${serviceName}:${keyName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all keys for the service (more efficient)
    const allKeys = await this.getApiKeys(serviceName);
    const keyValue = allKeys[keyName] || null;

    // Cache if found
    if (keyValue) {
      this.cache.set(cacheKey, keyValue, this.cacheTtl);
    }

    return keyValue;
  }

  /**
   * Get all API keys for a service from UNION
   */
  async getApiKeys(serviceName: string = 'videon'): Promise<Record<string, string>> {
    if (!this.enabled) {
      return {};
    }

    // Check cache
    const cacheKey = `union:settings:${serviceName}:all`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    try {
      const url = `${this.baseUrl}/api/admin/settings/keys-all?service_name=${serviceName}`;
      const response = await this.axiosInstance.get<{
        service_name: string;
        settings: Record<string, string>;
      }>(url);

      if (response.data && response.data.settings) {
        const settings = response.data.settings;

        // Cache the result
        this.cache.set(cacheKey, JSON.stringify(settings), this.cacheTtl);

        // Cache individual keys as well
        for (const [keyName, keyValue] of Object.entries(settings)) {
          const individualCacheKey = `union:settings:${serviceName}:${keyName}`;
          this.cache.set(individualCacheKey, keyValue, this.cacheTtl);
        }

        logger.info('Keys loaded from UNION', {
          serviceName,
          count: Object.keys(settings).length,
        });

        return settings;
      }

      return {};
    } catch (error: any) {
      // Log warning but don't throw - fallback to environment variables
      logger.warn('Failed to load keys from UNION, using environment variables', {
        serviceName,
        error: error.message,
        url: error.config?.url,
      });
      return {};
    }
  }

  /**
   * Clear cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific key
   */
  clearKeyCache(serviceName: string, keyName: string): void {
    const cacheKey = `union:settings:${serviceName}:${keyName}`;
    this.cache.clearKey(cacheKey);
    this.cache.clearKey(`union:settings:${serviceName}:all`);
  }
}

// Global instance
export const unionSettingsClient = new UnionSettingsClient();
