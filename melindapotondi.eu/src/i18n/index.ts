// i18n configuration and utilities

export const languages = {
  hu: 'Magyar',
  en: 'English'
} as const;

export type Language = keyof typeof languages;

export const defaultLang: Language = 'hu';

// Get the language from the URL path
export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Language;
  return defaultLang;
}

// Load translations for a specific language
export async function loadTranslations(lang: Language) {
  try {
    const translations = await import(`./locales/${lang}.json`);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${lang}, falling back to ${defaultLang}`);
    if (lang !== defaultLang) {
      return await loadTranslations(defaultLang);
    }
    return {};
  }
}

// Translation function
export function t(translations: Record<string, any>, key: string): string {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key "${key}" not found`);
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

// Use translation hook for Astro components
export function useTranslations(url: URL) {
  const lang = getLangFromUrl(url);
  return {
    lang,
    t: async (key: string) => {
      const translations = await loadTranslations(lang);
      return t(translations, key);
    },
    // For synchronous usage when translations are already loaded
    createT: (translations: Record<string, any>) => (key: string) => t(translations, key)
  };
}

// Create a translation function for a specific URL/language context
export async function createTranslationFunction(url: URL): Promise<(key: string) => string> {
  const lang = getLangFromUrl(url);
  const translations = await loadTranslations(lang);
  
  return (key: string): string => {
    return t(translations, key);
  };
}

// Generate alternate language URLs
export function getAlternateUrls(url: URL): Record<Language, string> {
  const pathWithoutLang = url.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
  const cleanPath = pathWithoutLang === '/' ? '' : pathWithoutLang;
  
  return Object.keys(languages).reduce((acc, lang) => {
    acc[lang as Language] = lang === defaultLang 
      ? `${cleanPath || '/'}`
      : `/${lang}${cleanPath || '/'}`;
    return acc;
  }, {} as Record<Language, string>);
}