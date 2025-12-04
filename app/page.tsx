import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage() {
  // Get the accept-language header to determine user's preferred language
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  
  // Simple language detection - check if Spanish is preferred
  const preferredLanguage = acceptLanguage?.includes('es') ? 'es' : 'en';
  
  // Redirect to the appropriate locale
  redirect(`/${preferredLanguage}`);
}
