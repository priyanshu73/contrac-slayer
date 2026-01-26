'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export function Header() {
  const locale = useLocale()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
              ContractorOps AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href={`/${locale}/auth/login`}>Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href={`/${locale}/auth/signup`}>Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
