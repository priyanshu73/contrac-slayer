"use client"

import Link from "next/link"
import { useLocale } from "next-intl"

export function LandingFooter() {
  const locale = useLocale()

  return (
    <footer className="border-t border-border bg-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ContractorOps AI. All rights reserved.
        </p>
        <nav className="flex items-center gap-6">
          <Link
            href={`/${locale}/privacy`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
