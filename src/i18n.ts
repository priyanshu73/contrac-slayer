import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

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
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      messages,
      locale,
      timeZone: 'America/Mexico_City'
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Fallback to English messages
    const messages = (await import(`../messages/en.json`)).default;
    return {
      messages,
      locale: 'en',
      timeZone: 'America/Mexico_City'
    };
  }
});
