'use client'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function Header() {
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ContractPro AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <button 
              onClick={() => setIsPricingDialogOpen(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="https://cal.com/johnson-subedi/30min" target="_blank" rel="noopener noreferrer">Schedule a Demo</Link>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription>
              Our pricing plans are currently being finalized. Check back soon or schedule a demo to learn more about our offerings.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  )
}
