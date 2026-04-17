"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Receipt,
  MessageSquare,
  Calendar,
  Users,
  Wrench,
  Zap,
  MessageCircle,
  Settings,
  FolderKanban,
  ListTodo,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed"

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const locale = useLocale()

  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === "true") setCollapsed(true)
    } catch { }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch { }
      return next
    })
  }

  // Don't show navbar on auth pages (except profile-setup), public quote request pages, or homepage
  const isProfileSetup = pathname?.includes("/auth/profile-setup")
  const isHomepage = pathname === "/" || pathname?.match(/^\/[a-z]{2}$/)
  if (isHomepage || (pathname?.startsWith("/auth") && !isProfileSetup) || pathname?.startsWith("/quote-request")) {
    return null
  }

  const navLinks = [
    { href: `/${locale}/dashboard`, label: t('dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/quotes`, label: t('quotes'), icon: FileText },
    { href: `/${locale}/invoices`, label: t('invoices'), icon: Receipt },
    { href: `/${locale}/leads`, label: t('leads'), icon: MessageSquare },
    { href: `/${locale}/lead-generator-agent`, label: t('leadGeneratorAgent'), icon: Zap },
    { href: `/${locale}/calendar`, label: t('calendar'), icon: Calendar },
    { href: `/${locale}/clients`, label: "Clients", icon: Users },
    { href: `/${locale}/crew`, label: "Crew", icon: Wrench },
    { href: `/${locale}/projects`, label: t('projects'), icon: FolderKanban },
    { href: `/${locale}/tasks`, label: t('tasks'), icon: ListTodo },
  ]

  const actionLinks = [
    { href: `/${locale}/actions/scheduling`, label: t('scheduling'), icon: MessageCircle },
  ]

  if (loading) {
    return (
      <>
        {/* Desktop skeleton sidebar */}
        <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-16 border-r border-border bg-card">
          <div className="p-3 flex items-center justify-center">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
          </div>
        </aside>
        {/* Mobile skeleton */}
        <nav className="md:hidden border-b border-border bg-card">
          <div className="flex h-12 items-center justify-between px-3">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </nav>
      </>
    )
  }

  if (!user) {
    return null
  }

  // Show only logo on profile-setup page
  if (isProfileSetup) {
    return (
      <nav className="border-b border-border bg-card sticky top-0 z-40 print:hidden md:hidden">
        <div className="container mx-auto px-3">
          <div className="flex h-12 items-center">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
              <span className="text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                ContractorOps AI
              </span>
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  const companyName = user.contractor_profile?.company_name || user.email || ""

  // Determine the current sidebar width for consistent rendering
  const sidebarWidth = collapsed ? "w-16" : "w-60"
  const contentMargin = collapsed ? "md:ml-16" : "md:ml-60"

  return (
    <TooltipProvider delayDuration={0}>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border bg-card print:hidden transition-all duration-300 ease-in-out ${sidebarWidth}`}
      >
        {/* Logo / Brand */}
        <div className={`flex items-center h-14 border-b border-border shrink-0 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-7 h-7 shrink-0 object-contain"
            />
            {!collapsed && (
              <span className="text-[15px] font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent truncate leading-tight">
                ContractorOps AI
              </span>
            )}
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navLinks.map((link) => {
            let isActive = false
            if (link.href === `/${locale}/dashboard`) {
              isActive = pathname === link.href
            } else {
              isActive = pathname?.startsWith(link.href) || false
            }
            const Icon = link.icon

            const linkContent = (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                  } ${isActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}

          {/* Actions section */}
          {!collapsed && (
            <div className="pt-3 mt-3 border-t border-border">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {t('actions')}
              </p>
            </div>
          )}
          {collapsed && <div className="pt-2 mt-2 border-t border-border" />}

          {actionLinks.map((link) => {
            const isActive = pathname?.startsWith(link.href)
            const Icon = link.icon

            const linkContent = (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                  } ${isActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>

        {/* Bottom section: user info, settings, collapse toggle */}
        <div className="shrink-0 border-t border-border">
          {/* Company / user */}
          {!collapsed && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-foreground truncate">{companyName}</p>
              {user.contractor_profile?.company_name && user.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
              )}
            </div>
          )}

          {/* Settings */}
          {(() => {
            const isSettingsActive = pathname?.startsWith(`/${locale}/settings`)
            const settingsLink = (
              <Link
                href={`/${locale}/settings`}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mx-2 my-1.5 ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                  } ${isSettingsActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Settings className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{t('settings')}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {t('settings')}
                  </TooltipContent>
                </Tooltip>
              )
            }
            return settingsLink
          })()}

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={`flex items-center gap-3 w-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-0 px-2 py-3 border-t border-border ${collapsed ? "justify-center" : "px-5"
              }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full overflow-x-hidden border-t border-border bg-card md:hidden print:hidden">
        <div className="grid grid-cols-5 min-w-0 gap-1 p-2">
          {/* Mobile: Dashboard, Quotes, Calendar, Clients, Leads */}
          {[navLinks[0], navLinks[1], navLinks[4], navLinks[5], navLinks[3]].map((link) => {
            const isActive = pathname === link.href || (link.href !== `/${locale}/dashboard` && pathname?.startsWith(link.href))
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 ${isActive ? "bg-sky-500/10 text-sky-700" : "text-muted-foreground"
                  }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate text-center text-xs font-medium leading-tight">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

/** Returns the CSS class for the content area's left margin, matching the sidebar width. */
export function useSidebarMargin(): string {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === "true") setCollapsed(true)
    } catch { }

    // Listen for storage changes so the margin updates in sync
    const handler = () => {
      try {
        const val = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        setCollapsed(val === "true")
      } catch { }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  if (!mounted) return ""
  return collapsed ? "md:ml-16" : "md:ml-60"
}
