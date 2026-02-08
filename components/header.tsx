'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'

export function Header() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const { changeLanguage, isChanging } = useLanguageContext()
  const signupUrl = buildSignupUrl(locale, referralId)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#how-it-works', label: t('howItWorks') },
    { href: '#pricing', label: t('pricing') },
  ]

  return (
    <header className="relative md:fixed top-0 left-0 right-0 z-50 border-0 bg-transparent backdrop-blur-none md:border-b md:border-border md:bg-background/80 md:backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + brand: desktop only; on mobile they move to hero */}
          <Link href="/" className="hidden md:flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
              <img src="/logo1.png" alt="Logo" className="h-5 w-5 object-contain" />
            </span>
            <span className="text-lg font-bold">
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">Contractor</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">Ops</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-300">AI</span>
            </span>
          </Link>

          {/* Desktop: nav + language + auth */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
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
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/auth/login`}>{t('signIn')}</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href={signupUrl}>{t('startFreeTrial')}</Link>
            </Button>
          </div>

          {/* Mobile: Sign In + hamburger (right-aligned) */}
          <div className="flex md:hidden items-center gap-2 ml-auto">
            <Button size="sm" className="shrink-0 text-white bg-black/70 hover:bg-black/80 ring-1 ring-white/10 border-0" asChild>
              <Link href={`/${locale}/auth/login`}>{t('signIn')}</Link>
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              {/* Dark theme for mobile sheet only */}
              <SheetContent side="right" className="w-[min(100vw-2rem,320px)] flex flex-col bg-zinc-900 text-white border-zinc-800 [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:opacity-100">
                <SheetHeader className="text-left">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 pt-2">
                  {navLinks.map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      onClick={closeMobile}
                      className="py-3 px-3 rounded-lg text-base font-medium text-white hover:bg-white/10 transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
                {/* Language below nav */}
                <div className="mt-6 pt-6 border-t border-zinc-700">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-3 mb-3">
                    {t('languageLabel')}
                  </p>
                  <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => { changeLanguage('en'); closeMobile(); }}
                      disabled={isChanging}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-md transition-colors ${locale === 'en' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <span className="text-lg leading-none" aria-hidden>🇺🇸</span>
                      {t('english')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { changeLanguage('es'); closeMobile(); }}
                      disabled={isChanging}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-md transition-colors ${locale === 'es' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <span className="text-lg leading-none" aria-hidden>🇲🇽</span>
                      {t('espanol')}
                    </button>
                  </div>
                </div>
                {/* Auth buttons at bottom */}
                <div className="mt-auto pt-6 flex flex-col gap-3">
                  <Button variant="outline" className="w-full bg-white text-black border-zinc-500 hover:bg-gray-100 hover:text-black" size="lg" asChild>
                    <Link href={`/${locale}/auth/login`} onClick={closeMobile}>
                      {t('signIn')}
                    </Link>
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" asChild>
                    <Link href={signupUrl} onClick={closeMobile}>
                      {t('startFreeTrial')}
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
