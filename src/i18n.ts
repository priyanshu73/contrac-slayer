import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import enFallback from '../messages/en.json';
import esFallback from '../messages/es.json';

// Can be imported from a shared config
export const locales = ['en', 'es'] as const;
export type Locale = typeof locales[number];

function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

export default getRequestConfig(async ({locale}) => {
  // Handle undefined or invalid locale
  if (!locale || !locales.includes(locale as any)) {
    // Don't log errors for common static files
    if (locale && !locale.includes('.') && locale !== 'favicon.ico') {
      console.warn(`Invalid locale: ${locale}, falling back to 'en'`);
    }
    locale = 'en';
  }

  const fallback = locale === 'es' ? esFallback : enFallback;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const endpoint = apiUrl.startsWith('/')
      ? `http://localhost:4000${apiUrl}/localization/${locale}`
      : `${apiUrl.replace(/\/+$/, '')}/localization/${locale}`;
    const response = await fetch(endpoint, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Localization API returned ${response.status}`);
    const payload = await response.json();
    const messages = deepMerge(fallback, payload.messages);
    return {
      messages,
      locale,
      timeZone: 'America/Mexico_City'
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    return {
      messages: fallback,
      locale: 'en',
      timeZone: 'America/Mexico_City'
    };
  }
});
