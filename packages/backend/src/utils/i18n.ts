/**
 * Backend i18n utility for internationalization
 */

export type Locale = 'en' | 'de';

// Import locales
let enTranslations: any;
let deTranslations: any;

try {
  enTranslations = require('../locales/en.json');
  deTranslations = require('../locales/de.json');
} catch (error) {
  console.warn('Failed to load translation files, using defaults');
  enTranslations = {};
  deTranslations = {};
}

/**
 * Get translation for a key
 * @param key - Translation key (dot notation, e.g., 'errors.notFound')
 * @param locale - Locale ('en' or 'de')
 * @param values - Object with placeholder values to replace
 * @returns Translated string or the key if not found
 */
export function t(key: string, locale: Locale = 'en', values?: Record<string, any>): string {
  const translations = locale === 'en' ? enTranslations : deTranslations;
  
  // Navigate through nested object keys
  const keys = key.split('.');
  let translation: any = translations;
  
  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      // Fallback to key if translation not found
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof translation !== 'string') {
    return key;
  }
  
  // Replace placeholders with values
  if (values) {
    return translation.replace(/\{(\w+)\}/g, (match, placeholder) => {
      return values[placeholder]?.toString() || match;
    });
  }
  
  return translation;
}

/**
 * Detect locale from Accept-Language header
 */
export function detectLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return 'en';
  return acceptLanguage.toLowerCase().includes('de') ? 'de' : 'en';
}

/**
 * Get locale from request
 */
export function getRequestLocale(req: any): Locale {
  return detectLocale(req?.headers?.['accept-language'] || req?.get?.('accept-language'));
}
