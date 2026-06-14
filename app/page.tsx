import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Get the accept-language header to determine user's preferred language
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');

  // Simple language detection - check if Spanish is preferred
  const preferredLanguage = acceptLanguage?.includes('es') ? 'es' : 'en';

  // Preserve the query string (utm_* ad params, ref, etc.) through the locale
  // redirect — otherwise a bare-domain ad link drops attribution and the nudge
  // never sees the utm params.
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
    else if (value != null) usp.set(key, value);
  }
  const qs = usp.toString();

  // Redirect to the appropriate locale, keeping the query string intact.
  redirect(`/${preferredLanguage}${qs ? `?${qs}` : ''}`);
}
