"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect on auth pages, public pages, or landing page
    if (
      pathname === "/" ||
      pathname?.startsWith("/auth") ||
      pathname?.startsWith("/quote-request")
    ) {
      return
    }

    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/auth/login")
    }

    // Redirect to profile setup if user doesn't have a profile
    if (!loading && user && !user.contractor_profile && pathname !== "/auth/profile-setup") {
      router.push("/auth/profile-setup")
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
  if (
    user ||
    pathname === "/" ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/quote-request")
  ) {
    return <>{children}</>
  }

  // Otherwise show nothing (will redirect)
  return null
}

