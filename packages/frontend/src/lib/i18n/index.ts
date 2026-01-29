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

// Internal helper to avoid code duplication
function translate(translations: any, key: string, values?: Record<string, string | number>): string {
  const keys = key.split('.');
  let translation: any = translations;

  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      return key;
    }
  }

  if (typeof translation !== 'string') {
    return key;
  }

  if (values) {
    return translation.replace(/\{(\w+)\}/g, (match, placeholder) => {
      return values[placeholder]?.toString() || match;
    });
  }

  return translation;
}

// Translation function - imperative version (non-reactive unless called in reactive context)
export function _(key: string, values?: Record<string, string | number>): string {
  const currentLocaleValue = get(currentLocale);
  const translations = getTranslations(currentLocaleValue);
  return translate(translations, key, values);
}

// Create a derived store for translations - this is reactive!
export const translations: Readable<typeof de> = derived(currentLocale, ($currentLocale) =>
  getTranslations($currentLocale)
);

// Translation store - reactive version
export const t = derived(translations, ($translations) => {
  return (key: string, values?: Record<string, string | number>): string => {
    return translate($translations, key, values);
  };
});

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