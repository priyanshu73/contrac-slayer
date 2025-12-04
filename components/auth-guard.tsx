"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useLocale } from "next-intl"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  const isPublicRoute =
    pathname === "/" ||
    pathname?.match(/^\/[a-z]{2}\/auth/) || // Matches /en/auth, /es/auth, etc.
    pathname?.startsWith("/auth") || // Legacy non-i18n auth routes
    pathname?.match(/^\/[a-z]{2}\/quote-request/) || // Matches /en/quote-request, /es/quote-request, etc.
    pathname?.startsWith("/quote-request") || // Legacy non-i18n routes
    // Public customer views for quotes and invoices (no auth required)
    pathname?.match(/^\/[a-z]{2}\/quotes\//) || // Matches /en/quotes/, /es/quotes/, etc.
    pathname?.startsWith("/quotes/") || // Legacy non-i18n routes
    pathname?.match(/^\/[a-z]{2}\/invoices\//) || // Matches /en/invoices/, /es/invoices/, etc.
    pathname?.startsWith("/invoices/") // Legacy non-i18n routes

  useEffect(() => {
    // Don't redirect on auth pages, public pages, or landing page
    if (isPublicRoute) {
      return
    }

    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push(`/${locale}/auth/login`)
    }

    // Redirect to profile setup if user doesn't have a profile
    if (!loading && user && !user.contractor_profile && pathname !== `/${locale}/auth/profile-setup`) {
      router.push(`/${locale}/auth/profile-setup`)
    }
  }, [user, loading, router, pathname])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="relative">
          {/* Abstract spinning circles */}
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

  // Show content if authenticated or on public pages
  if (user || isPublicRoute) {
    return <>{children}</>
  }

  // Otherwise show nothing (will redirect)
  return null
}

