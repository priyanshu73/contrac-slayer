import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import enFallback from '../messages/en.json';
import esFallback from '../messages/es.json';

// Can be imported from a shared config
export const locales = ['en', 'es'] as const;
export type Locale = typeof locales[number];

export default getRequestConfig(async ({locale}) => {
  // Handle undefined or invalid locale
  if (!locale || !locales.includes(locale as any)) {
    // Don't log errors for common static files
    if (locale && !locale.includes('.') && locale !== 'favicon.ico') {
      console.warn(`Invalid locale: ${locale}, falling back to 'en'`);
    }
    locale = 'en';
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const endpoint = apiUrl.startsWith('/')
      ? `http://localhost:4000${apiUrl}/localization/${locale}`
      : `${apiUrl.replace(/\/+$/, '')}/localization/${locale}`;
    const response = await fetch(endpoint, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Localization API returned ${response.status}`);
    const payload = await response.json();
    const messages = payload.messages;
    return {
      messages,
      locale,
      timeZone: 'America/Mexico_City'
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Fallback to English messages
    const messages = locale === 'es' ? esFallback : enFallback;
    return {
      messages,
      locale: 'en',
      timeZone: 'America/Mexico_City'
    };
  }
});
