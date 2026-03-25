"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { AgentChatPanel } from "@/components/agent-chat-panel"

/** Routes that should NOT show the Navbar / shell UI */
function isPublicShellRoute(pathname: string): boolean {
  return (
    !!pathname?.match(/^\/[a-z]{2}\/book\//) ||
    pathname?.startsWith("/book/") ||
    !!pathname?.match(/^\/[a-z]{2}\/auth(\/|$)/) ||
    pathname?.startsWith("/auth/") ||
    !!pathname?.match(/^\/[a-z]{2}\/?$/) ||  // landing page (e.g. /en, /es/)
    pathname === "/"
  )
}

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideShell = isPublicShellRoute(pathname ?? "")

  return (
    <>
      {!hideShell && <Navbar />}
      {!hideShell && <EmailVerificationBanner />}
      {children}
      {!hideShell && <AgentChatPanel />}
    </>
  )
}
