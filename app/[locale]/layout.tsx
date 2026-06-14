import type React from "react"
import { Suspense } from "react"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthProvider } from "@/contexts/AuthContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { ReferralProvider } from "@/contexts/ReferralContext"
import { AuthGuard } from "@/components/auth-guard"
import { ConditionalShell } from "@/components/conditional-shell"
import { AdWelcome } from "@/components/ad-welcome"
import { generateMetadata } from './metadata'

export { generateMetadata }

const locales = ['en', 'es'] as const;

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <LanguageProvider>
          <Suspense fallback={null}>
            <ReferralProvider>
              <AuthGuard>
                <ConditionalShell>
                  {children}
                </ConditionalShell>
              </AuthGuard>
              <AdWelcome />
            </ReferralProvider>
          </Suspense>
        </LanguageProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
