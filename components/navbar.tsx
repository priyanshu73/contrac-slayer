"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const locale = useLocale()

  // Don't show navbar on auth pages, public quote request pages, or homepage
  if (pathname === "/" || pathname?.startsWith("/auth") || pathname?.startsWith("/quote-request")) {
    return null
  }

  const navLinks = [
    { href: `/${locale}/dashboard`, label: t('dashboard') },
    { href: `/${locale}/leads`, label: t('leads') },
    { href: `/${locale}/quotes`, label: t('quotes') },
    { href: `/${locale}/clients`, label: t('clients') },
    // { href: `/${locale}/invoices`, label: t('invoices') }, // Commented out - might use in the future
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
                ContractPro
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sky-500/10 text-sky-700"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block text-sm text-muted-foreground">
              {user.full_name}
            </div>
            <Link href={`/${locale}/settings`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-4 gap-0.5 px-1 py-1">
          {navLinks.slice(0, 4).map((link) => {
            const isActive = pathname === link.href
            
            // SVG icons for mobile
            const getIcon = () => {
              switch(link.href.split('/')[2]) { // Get the page name from the href
                case "dashboard":
                  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                case "leads":
                  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                case "quotes":
                  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                case "clients":
                  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                // case "invoices":
                  // return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                default:
                  return null
              }
            }
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 ${
                  isActive ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
                }`}
              >
                {getIcon()}
                <span className="text-[10px] font-medium leading-tight">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

