import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {locales} from './src/i18n';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: 'en',

  // Always show locale prefix in URLs
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Public booking route should stay locale-agnostic and outside app chrome.
  if (pathname.startsWith('/book/')) {
    return NextResponse.next();
  }

  // Engineering preview routes (e.g. /dev/preview) are gated server-side by
  // host + env. They don't need next-intl chrome.
  if (pathname.startsWith('/dev/')) {
    return NextResponse.next();
  }

  // Normalize localized booking links to the public route.
  const localizedMatch = pathname.match(/^\/(en|es)\/book\/(.+)$/);
  if (localizedMatch) {
    const slug = localizedMatch[2];
    if (slug) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/book/${slug}`;
      redirectUrl.search = search;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except static files, API routes, and Next.js internals
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_vercel).+)'
  ]
};
