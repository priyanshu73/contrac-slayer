import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    generator: "v0.app",
    icons: {
      icon: "/images/favicon.ico",
    },
    appleWebApp: {
      capable: true,
      title: "ContractorOps",
      statusBarStyle: "default",
    },
    alternates: {
      languages: {
        'en': '/en',
        'es': '/es',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale: locale,
      alternateLocale: locale === 'en' ? 'es' : 'en',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}
