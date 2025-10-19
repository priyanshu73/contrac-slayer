"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect on auth pages or public quote request pages
    if (
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show content if authenticated or on public pages
  if (
    user ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/quote-request")
  ) {
    return <>{children}</>
  }

  // Otherwise show nothing (will redirect)
  return null
}

