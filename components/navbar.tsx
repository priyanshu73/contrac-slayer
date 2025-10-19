"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import Link from "next/link"

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()

  // Don't show navbar on auth pages and public quote request pages
  if (pathname?.startsWith("/auth") || pathname?.startsWith("/quote-request")) {
    return null
  }

  const navLinks = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/leads", label: "Leads", icon: "💬" },
    { href: "/calendar", label: "Calendar", icon: "📅" },
    { href: "/clients", label: "Clients", icon: "👥" },
    { href: "/invoices", label: "Invoices", icon: "📄" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ]

  if (loading) {
    return (
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
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
    <nav className="border-b border-border bg-card sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold">
              ContractSlayer
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-muted-foreground">
              {user.full_name}
            </div>
            <Button onClick={logout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navLinks.slice(0, 5).map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

