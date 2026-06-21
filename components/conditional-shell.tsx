"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { AgentChatPanel } from "@/components/agent-chat-panel"

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed"

/** Public customer quote link: /en/quotes/{uuid} (not numeric contractor id or /new, /copy). */
function isPublicCustomerQuoteRoute(pathname: string): boolean {
  const match = pathname?.match(/^\/[a-z]{2}\/quotes\/([^/]+)$/)
  if (!match) return false
  const segment = match[1]
  if (segment === "new" || segment === "copy") return false
  if (/^\d+$/.test(segment)) return false
  return true
}

/** Routes that should NOT show the Navbar / shell UI */
function isPublicShellRoute(pathname: string): boolean {
  return (
    !!pathname?.match(/^\/[a-z]{2}\/book\//) ||
    pathname?.startsWith("/book/") ||
    !!pathname?.match(/^\/[a-z]{2}\/auth(\/|$)/) ||
    pathname?.startsWith("/auth/") ||
    !!pathname?.match(/^\/[a-z]{2}\/features(\/|$)/) ||
    pathname?.startsWith("/features") ||
    !!pathname?.match(/^\/[a-z]{2}\/?$/) ||  // landing page (e.g. /en, /es/)
    pathname === "/" ||
    // Public client portal — no contractor shell
    !!pathname?.match(/^\/[a-z]{2}\/client\//) ||
    pathname?.startsWith("/client/") ||
    // Public crew (subcontractor) portal — no contractor shell
    !!pathname?.match(/^\/[a-z]{2}\/crew\/portal\//) ||
    pathname?.startsWith("/crew/portal/") ||
    // Public proposal share links
    !!pathname?.match(/^\/[a-z]{2}\/proposals\//) ||
    pathname?.startsWith("/proposals/") ||
    isPublicCustomerQuoteRoute(pathname ?? "")
  )
}

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideShell = isPublicShellRoute(pathname ?? "")

  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const syncState = () => {
      try {
        const val = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        setCollapsed(val === "true")
      } catch {}
    }
    syncState()

    // Listen for changes from the sidebar toggle
    window.addEventListener("storage", syncState)

    // Also poll for same-tab changes (storage event doesn't fire in the same tab)
    const interval = setInterval(syncState, 200)

    return () => {
      window.removeEventListener("storage", syncState)
      clearInterval(interval)
    }
  }, [])

  if (hideShell) {
    return <>{children}</>
  }

  // Margin class for the sidebar — only apply on md+ screens after mount
  const marginClass = mounted
    ? collapsed ? "md:ml-16" : "md:ml-60"
    : "md:ml-60" // default to expanded to avoid flash

  return (
    <>
      <Navbar />
      <div className={`transition-[margin] duration-300 ease-in-out ${marginClass} pb-16 md:pb-0`}>
        <EmailVerificationBanner />
        {children}
      </div>
      <AgentChatPanel />
    </>
  )
}
