'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ChevronDown,
  Menu,
  PhoneCall,
  ReceiptText,
  UsersRound,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'
import { useLanguageContext } from '@/contexts/LanguageContext'

const languageOptions = [
  { code: 'en' as const, label: 'Switch to English', short: 'EN' },
  { code: 'es' as const, label: 'Switch to Spanish', short: 'ES' },
]

type FeatureMenuItem = {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
}

export function Header() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const { changeLanguage, isChanging } = useLanguageContext()
  const signupUrl = buildSignupUrl(locale, referralId)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const featuresCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 60)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  useEffect(() => {
    return () => {
      if (featuresCloseTimer.current) {
        clearTimeout(featuresCloseTimer.current)
      }
    }
  }, [])

  const openFeaturesMenu = () => {
    if (featuresCloseTimer.current) {
      clearTimeout(featuresCloseTimer.current)
      featuresCloseTimer.current = null
    }
    setFeaturesOpen(true)
  }

  const closeFeaturesMenuSoon = () => {
    if (featuresCloseTimer.current) {
      clearTimeout(featuresCloseTimer.current)
    }
    featuresCloseTimer.current = setTimeout(() => setFeaturesOpen(false), 180)
  }

  const navLinks = [
    { href: `/${locale}#pricing`, label: t('pricing') },
  ]

  const featureMenuItems: FeatureMenuItem[] = [
    {
      title: 'AI lead capture',
      description: 'Calls, SMS, photos, and project details land in one CRM.',
      href: `/${locale}/features/phone-ai-scheduling`,
      icon: PhoneCall,
    },
    {
      title: 'Quotes & estimating',
      description: 'Generate estimates from scope, materials, labor, and margin.',
      href: `/${locale}/features/smart-job-costing`,
      icon: Calculator,
    },
    {
      title: 'Scheduling calendar',
      description: 'Bookings, availability, and calendar events stay aligned.',
      href: `/${locale}/features/calendar`,
      icon: CalendarDays,
    },
    {
      title: 'Projects & costing',
      description: 'Track tasks, scopes, documents, trades, and financials.',
      href: `/${locale}/features/project-finance-management`,
      icon: BriefcaseBusiness,
    },
    {
      title: 'Invoices & QuickBooks',
      description: 'Move approved work into invoices and accounting handoff.',
      href: `/${locale}/features/quickbooks-integration`,
      icon: ReceiptText,
    },
    {
      title: 'Crew coordination',
      description: 'Manage subs, trade scopes, priority, and field updates.',
      href: `/${locale}/features/subcontractor-management`,
      icon: UsersRound,
    },
  ]

  const LanguageToggle = ({ solid = false }: { solid?: boolean }) => {
    const isSolid = solid || scrolled
    const isSpanish = locale === 'es'

    return (
      <div
        className={`relative grid h-9 w-[92px] grid-cols-2 items-center rounded-full border p-1 backdrop-blur-xl transition-all duration-300 ${
          isSolid
            ? 'border-[#eadfd7] bg-[#efe6de] shadow-[inset_0_1px_2px_rgba(96,75,64,0.10)]'
            : 'border-white/18 bg-white/[0.12] shadow-[inset_0_1px_2px_rgba(255,255,255,0.10)]'
        }`}
        aria-label="Language selector"
      >
        <span
          className={`pointer-events-none absolute left-1 top-1 h-7 w-[42px] rounded-full transition-transform duration-300 ease-out ${
            isSpanish ? 'translate-x-[42px]' : 'translate-x-0'
          } ${isSolid ? 'bg-[#fffaf7] shadow-[0_4px_14px_rgba(96,75,64,0.16)]' : 'bg-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.16)]'}`}
        />
        {languageOptions.map(({ code, label, short }) => {
          const active = locale === code

          return (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              disabled={isChanging}
              aria-pressed={active}
              title={label}
              className={`relative z-10 h-7 rounded-full text-[11px] font-black tracking-[0.16em] transition-colors duration-300 ${
                active
                  ? 'text-[#26313d]'
                  : isSolid
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-white/70 hover:text-white'
              }`}
            >
              {short}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-3 sm:px-6">
      <div
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full px-3 backdrop-blur-2xl transition-all duration-300 sm:px-4 ${
          scrolled
            ? 'border border-white/70 bg-[#fffaf7]/78 shadow-[0_18px_60px_rgba(96,75,64,0.10)]'
            : 'border border-white/18 bg-white/[0.08] shadow-none'
        }`}
      >
        <Link href={`/${locale}`} className="flex items-center gap-3" aria-label="ContractorOps AI home">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-full object-contain" />
          </span>
          <span className={`text-sm font-black tracking-tight transition-colors sm:text-base ${scrolled ? 'text-slate-950' : 'text-white drop-shadow-sm'}`}>
            ContractorOps AI
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Main navigation">
          <DropdownMenu modal={false} open={featuresOpen} onOpenChange={setFeaturesOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onPointerEnter={openFeaturesMenu}
                onPointerLeave={closeFeaturesMenuSoon}
                onFocus={openFeaturesMenu}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 ${
                  scrolled
                    ? 'text-slate-600 hover:bg-[#f4ede6]/55 hover:text-slate-950 focus-visible:bg-[#f4ede6]/55'
                    : 'text-white/78 hover:bg-white/10 hover:text-white focus-visible:bg-white/10'
                }`}
              >
                {t('features')}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={14}
              onPointerEnter={openFeaturesMenu}
              onPointerLeave={closeFeaturesMenuSoon}
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="w-[560px] overflow-hidden rounded-2xl border border-white/20 bg-slate-950/55 p-2 text-white shadow-[0_24px_80px_rgba(8,14,22,0.28)] backdrop-blur-2xl"
            >
              <div className="border-b border-white/10 px-3 pb-3 pt-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Core workflows</p>
                <p className="mt-1 text-sm font-semibold text-white/82">The operating pieces contractors use every day.</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1.5">
                {featureMenuItems.map((feature) => {
                  const Icon = feature.icon

                  return (
                    <DropdownMenuItem key={feature.href} asChild className="rounded-xl p-0 focus:bg-transparent">
                      <Link
                        href={feature.href}
                        onClick={() => setFeaturesOpen(false)}
                        className="group flex min-h-[86px] items-start gap-3 rounded-xl px-3 py-3 outline-none transition-colors hover:bg-white/[0.08] focus-visible:bg-white/[0.08]"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.10] text-white/78 ring-1 ring-white/10 transition-colors group-hover:bg-white/[0.14] group-hover:text-white">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black leading-5 text-white">{feature.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-white/58">{feature.description}</span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </div>
              <div className="border-t border-white/10 px-2 py-2">
                <Link
                  href={`/${locale}/features`}
                  onClick={() => setFeaturesOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black text-white/78 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  Explore the feature overview
                  <span className="text-xs font-semibold text-white/38">Less noise, more context</span>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                scrolled ? 'text-slate-600 hover:bg-[#f4ede6]/55 hover:text-slate-950' : 'text-white/78 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden w-[388px] grid-cols-[92px_112px_160px] items-center gap-3 md:grid">
          <LanguageToggle />
          <Link
            href={`/${locale}/auth/login`}
            className={`flex h-9 items-center justify-center rounded-full px-3 text-center text-sm font-semibold transition-all duration-200 ${
              scrolled ? 'text-slate-600 hover:bg-[#f4ede6]/55 hover:text-slate-950' : 'text-white/78 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t('signIn')}
          </Link>
          <Button size="sm" className="w-full rounded-full bg-[#26313d]/84 px-3 text-xs text-white shadow-none hover:bg-[#26313d]/72" asChild>
            <Link href={signupUrl}>{t('startFreeTrial')}</Link>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className={`rounded-full md:hidden ${scrolled ? 'text-slate-950 hover:bg-slate-950/[0.04]' : 'text-white hover:bg-white/10 hover:text-white'}`} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[min(100vw-2rem,320px)] flex-col bg-[#fffaf7]">
            <SheetHeader className="text-left">
              <SheetTitle>ContractorOps AI</SheetTitle>
            </SheetHeader>
            <nav className="mt-8 grid gap-2">
              <div className="rounded-xl bg-slate-950/[0.03] p-2">
                <p className="px-2 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t('features')}</p>
                <div className="grid gap-1">
                  {featureMenuItems.map((feature) => (
                    <Link
                      key={feature.href}
                      href={feature.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-white/45"
                    >
                      {feature.title}
                    </Link>
                  ))}
                </div>
              </div>
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-3 text-lg font-semibold text-slate-800 transition-colors hover:bg-slate-950/[0.04]"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-6 flex">
              <LanguageToggle solid />
            </div>
            <div className="mt-auto grid gap-3">
              <Button variant="outline" className="rounded-full hover:bg-slate-950/[0.04]" asChild>
                <Link href={`/${locale}/auth/login`} onClick={() => setMobileOpen(false)}>
                  {t('signIn')}
                </Link>
              </Button>
              <Button className="rounded-full bg-[#26313d]/88 text-white hover:bg-[#26313d]/74" asChild>
                <Link href={signupUrl} onClick={() => setMobileOpen(false)}>
                  {t('startFreeTrial')}
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
