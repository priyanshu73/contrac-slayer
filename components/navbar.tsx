"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import {
  ChevronDown,
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  Zap,
  MessageCircle,
  Settings,
  Link2,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const tQuote = useTranslations('dashboard.quoteRequest')
  const locale = useLocale()
  const { toast } = useToast()
  const [quoteLinkCopied, setQuoteLinkCopied] = useState(false)

  const isDashboard = pathname === `/${locale}/dashboard`
  const contractorUuid = user?.contractor_profile?.uuid
  const frontendUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_FRONTEND_URL || '')
  const quoteRequestUrl = contractorUuid ? `${frontendUrl}/quote-request/${contractorUuid}` : ''

  // Don't show navbar on auth pages (except profile-setup), public quote request pages, or homepage (including locale home /en, /es)
  const isProfileSetup = pathname?.includes("/auth/profile-setup")
  const isHomepage = pathname === "/" || pathname?.match(/^\/[a-z]{2}$/)
  if (isHomepage || (pathname?.startsWith("/auth") && !isProfileSetup) || pathname?.startsWith("/quote-request")) {
    return null
  }

  const navLinks = [
    { href: `/${locale}/dashboard`, label: t('dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/leads`, label: t('leads'), icon: MessageSquare },
    { href: `/${locale}/calendar`, label: t('calendar'), icon: Calendar },
    { href: `/${locale}/clients`, label: t('clients'), icon: Users },
  ]

  if (loading) {
    return (
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-2 md:px-3">
          <div className="flex h-12 md:h-14 items-center justify-between">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return null
  }

  // Show only logo on profile-setup page
  if (isProfileSetup) {
    return (
      <nav className="border-b border-border bg-card sticky top-0 z-40 print:hidden">
        <div className="container mx-auto px-2 md:px-3">
          <div className="flex h-12 md:h-14 items-center">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:gap-2">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 object-contain"
              />
              <span className="text-base md:text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                ContractorOps AI
              </span>
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-40 print:hidden">
      <div className="container mx-auto px-2 md:px-3">
        <div className="flex h-12 md:h-14 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:gap-2">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 object-contain"
              />
              <span className="text-base md:text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                ContractorOps AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-sky-500/10 text-sky-700"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </Link>
                )
              })}
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      pathname?.startsWith(`/${locale}/actions`)
                        ? "bg-sky-500/10 text-sky-700"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Zap className="h-4 w-4 shrink-0" />
                    {t('actions')}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px]">
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/actions/scheduling`} className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {t('scheduling')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    {t('moreComingSoon')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block text-sm text-muted-foreground">
              {user.contractor_profile?.company_name || user.email}
            </div>
            {isDashboard && quoteRequestUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 md:h-9 px-2 md:px-3 text-muted-foreground hover:text-foreground md:hidden"
                title={tQuote('title')}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(quoteRequestUrl)
                    setQuoteLinkCopied(true)
                    toast({ title: tQuote('linkCopied'), description: tQuote('linkCopiedDesc') })
                    setTimeout(() => setQuoteLinkCopied(false), 2000)
                  } catch {
                    toast({ title: tQuote('copyFailed'), description: tQuote('copyFailedDesc'), variant: 'destructive' })
                  }
                }}
              >
                {quoteLinkCopied ? (
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Link2 className="h-4 w-4 shrink-0 text-sky-600" />
                )}
                <span className="hidden sm:inline text-sm font-medium">{tQuote('title')}</span>
                {quoteLinkCopied ? (
                  <span className="hidden sm:inline text-xs text-green-600">{tQuote('copied')}</span>
                ) : (
                  <span className="hidden sm:inline text-xs">{tQuote('copy')}</span>
                )}
              </Button>
            )}
            <Link href={`/${locale}/settings`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" title={t('settings')}>
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - 5 items: Dashboard, Leads, Calendar, Clients, Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full overflow-x-hidden border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5 min-w-0 gap-1 p-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 ${
                  isActive ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate text-center text-xs font-medium leading-tight">{link.label}</span>
              </Link>
            )
          })}
          {/* Actions -> Scheduling on mobile */}
          <Link
            href={`/${locale}/actions/scheduling`}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 ${
              pathname?.startsWith(`/${locale}/actions`) ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
            }`}
          >
            <Zap className="h-5 w-5 shrink-0" />
            <span className="truncate text-center text-xs font-medium leading-tight">{t('actions')}</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

