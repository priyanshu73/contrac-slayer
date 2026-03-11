"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useLocale } from "next-intl"

/** Same loading UI used for initial render to avoid server/client hydration mismatch. */
function AuthGuardLoadingUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="relative">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-blue-50"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-blue-600 text-center animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isPublicRoute =
    pathname === "/" ||
    pathname?.match(/^\/[a-z]{2}$/) || // Matches /en, /es (homepage with locale)
    pathname?.match(/^\/[a-z]{2}\/auth/) || // Matches /en/auth, /es/auth, etc.
    pathname?.startsWith("/auth") || // Legacy non-i18n auth routes
    pathname?.match(/^\/[a-z]{2}\/privacy$/) || // Privacy policy (no auth required)
    pathname === "/privacy" || // Legacy non-i18n
    pathname?.match(/^\/[a-z]{2}\/quote-request/) || // Matches /en/quote-request, /es/quote-request, etc.
    pathname?.startsWith("/quote-request") || // Legacy non-i18n routes
    // Public customer views for quotes and invoices (no auth required)
    pathname?.match(/^\/[a-z]{2}\/quotes\//) || // Matches /en/quotes/, /es/quotes/, etc.
    pathname?.startsWith("/quotes/") || // Legacy non-i18n routes
    pathname?.match(/^\/[a-z]{2}\/invoices\//) || // Matches /en/invoices/, /es/invoices/, etc.
    pathname?.startsWith("/invoices/") || // Legacy non-i18n routes
    // Public subcontractor portal view
    pathname?.match(/^\/[a-z]{2}\/projects\/trade\//) || // Matches /en/projects/trade/, /es/projects/trade/, etc.
    pathname?.startsWith("/projects/trade/") // Legacy non-i18n routes

  // Routes accessible without subscription (but require auth)
  const isBillingRoute =
    pathname?.match(/^\/[a-z]{2}\/billing/) || // Matches /en/billing, /es/billing, etc.
    pathname?.startsWith("/billing")

  // Settings page should be accessible for subscription management
  const isSettingsRoute =
    pathname?.match(/^\/[a-z]{2}\/settings/) ||
    pathname?.startsWith("/settings")

  useEffect(() => {
    // Don't redirect on auth pages, public pages, landing page, or admin
    if (isPublicRoute || pathname?.includes('/admin')) {
      return
    }

    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push(`/${locale}/auth/login`)
      return
    }

    // Redirect to profile setup if user doesn't have a profile
    if (!loading && user && !user.contractor_profile && pathname !== `/${locale}/auth/profile-setup`) {
      router.push(`/${locale}/auth/profile-setup`)
      return
    }

    // Redirect to billing if user has profile but no subscription
    // Allow access to billing and settings pages without subscription
    if (!loading && user && user.contractor_profile && !user.has_access) {
      if (!isBillingRoute && !isSettingsRoute) {
        router.push(`/${locale}/billing`)
        return
      }
    }
  }, [user, loading, router, pathname, locale, isBillingRoute, isSettingsRoute])

  // Always show same loading UI until after mount so server and client HTML match (avoids hydration error)
  if (!hasMounted || loading) {
    return <AuthGuardLoadingUI />
  }

  // Show content if authenticated, on public pages, admin route, or billing/settings pages
  if (user || isPublicRoute || pathname?.includes('/admin')) {
    // If user is authenticated but has no access, only allow billing and settings
    if (user && user.contractor_profile && !user.has_access && !isBillingRoute && !isSettingsRoute && !isPublicRoute) {
      return null // Will redirect in useEffect
    }
    return <>{children}</>
  }

  // Otherwise show nothing (will redirect)
  return null
}

