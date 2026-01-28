import { writable, get, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import en from './locales/en.json';
import de from './locales/de.json';

export type Locale = 'en' | 'de';

const defaultLocale: Locale = 'de';

// Translation store
export const currentLocale = writable<Locale>(defaultLocale);

// Helper function to get translations object based on locale
function getTranslations(locale: Locale) {
  return locale === 'en' ? en : de;
}

// Translation function - reactive version
// This function must be used within reactive context (templates or $: blocks)
export function _(key: string, values?: Record<string, string | number>): string {
  const currentLocaleValue = get(currentLocale);
  const translations = getTranslations(currentLocaleValue);

  // Navigate through nested object keys
  const keys = key.split('.');
  let translation: any = translations;

  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      // Fallback to key if translation not found
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

// Create a derived store for translations - this is reactive!
export const translations: Readable<typeof de> = derived(currentLocale, ($currentLocale) =>
  getTranslations($currentLocale)
);

// Initialize locale from localStorage and subscribe to changes
export function initI18n() {
  if (browser) {
    const savedLocale = localStorage.getItem('prismvid-locale') as Locale;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'de')) {
      currentLocale.set(savedLocale);
    }

    // Persist changes
    currentLocale.subscribe((value) => {
      localStorage.setItem('prismvid-locale', value);
    });
  }
}