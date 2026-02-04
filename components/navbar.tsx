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
} from "lucide-react"
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
  const locale = useLocale()

  // Don't show navbar on auth pages (except profile-setup), public quote request pages, or homepage
  const isProfileSetup = pathname?.includes("/auth/profile-setup")
  if (pathname === "/" || (pathname?.startsWith("/auth") && !isProfileSetup) || pathname?.startsWith("/quote-request")) {
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
              {user.full_name}
            </div>
            <Link href={`/${locale}/settings`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" title={t('settings')}>
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-6 gap-0.5 px-1 py-1">
          {navLinks.slice(0, 5).map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 ${
                  isActive ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-medium leading-tight">{link.label}</span>
              </Link>
            )
          })}
          {/* Actions -> Scheduling on mobile */}
          <Link
            href={`/${locale}/actions/scheduling`}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 ${
              pathname?.startsWith(`/${locale}/actions`) ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
            }`}
          >
            <Zap className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">{t('actions')}</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

