'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'
import { useLanguageContext } from '@/contexts/LanguageContext'

export function Header() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const { changeLanguage, isChanging } = useLanguageContext()
  const signupUrl = buildSignupUrl(locale, referralId)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
              ContractorOps AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('features')}
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('howItWorks')}
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('pricing')}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language toggle: 🇺🇸 English | 🇲🇽 Español */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                disabled={isChanging}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="English"
              >
                <span className="text-base leading-none" aria-hidden>🇺🇸</span>
                {t('english')}
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('es')}
                disabled={isChanging}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${locale === 'es' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Español"
              >
                <span className="text-base leading-none" aria-hidden>🇲🇽</span>
                {t('espanol')}
              </button>
            </div>
            {/* Desktop: Sign In + Start Free Trial */}
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href={`/${locale}/auth/login`}>{t('signIn')}</Link>
            </Button>
            <Button size="sm" className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href={signupUrl}>{t('startFreeTrial')}</Link>
            </Button>
            {/* Mobile: Just Sign In (blue) */}
            <Button size="sm" className="sm:hidden bg-blue-600 text-white hover:bg-blue-700" asChild>
              <Link href={`/${locale}/auth/login`}>{t('signIn')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
