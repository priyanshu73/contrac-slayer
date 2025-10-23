"use client"

import { QuoteCreator } from "@/components/Quote-creator"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

export default function NewQuotePage() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("leadId")

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/quotes">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-none">Create Quote</h1>
              <p className="text-sm text-muted-foreground">
                {leadId ? "From Lead - AI-powered pricing" : "AI-powered pricing"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <QuoteCreator leadId={leadId} />
      </main>
    </div>
  )
}
