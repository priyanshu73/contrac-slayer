"use client"

import { useState, useEffect } from "react"
import { QuoteCreator } from "@/components/Quote-creator"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { Loader2, Sparkles } from "lucide-react"

function openAiPanelForEstimate() {
  window.dispatchEvent(new CustomEvent("open-ai-panel-for-estimate"))
}

export default function NewQuotePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const leadId = searchParams.get("leadId")
  const clientId = searchParams.get("clientId")
  const projectId = searchParams.get("projectId")
  const copyFromId = searchParams.get("copyFromId")

  const [copiedQuoteData, setCopiedQuoteData] = useState<any>(null)
  const [loadingCopy, setLoadingCopy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (copyFromId) {
      const fetchCopiedQuote = async () => {
        try {
          setLoadingCopy(true)
          const data = await api.getJob(parseInt(copyFromId))
          setCopiedQuoteData(data)
        } catch (err: any) {
          setError(err.message || "Failed to load quote to copy")
        } finally {
          setLoadingCopy(false)
        }
      }
      fetchCopiedQuote()
    }
  }, [copyFromId])

  const handleProjectContextChange = ({ projectId, clientId }: { projectId: number | null; clientId: number | null }) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (projectId != null) {
      nextParams.set("projectId", String(projectId))
    } else {
      nextParams.delete("projectId")
    }

    if (clientId != null) {
      nextParams.set("clientId", String(clientId))
    } else {
      nextParams.delete("clientId")
    }

    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current === next) return

    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const subtitle = copyFromId
    ? `Copying from Quote #${copyFromId}`
    : projectId
      ? "From project – client and project pre-filled"
      : clientId
        ? "From client – basic info pre-filled"
      : leadId
        ? "From Lead - AI-powered pricing"
        : "AI-powered pricing"

  if (loadingCopy) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading quote to copy...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-destructive mb-2 px-4 py-2 border border-destructive/20 bg-destructive/10 rounded-md">
          <p className="font-medium text-center">{error}</p>
        </div>
        <Button onClick={() => window.location.href = '/quotes/new'} variant="outline" className="mt-4">
          Start Blank Quote Instead
        </Button>
      </div>
    )
  }

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
              <h1 className="hidden text-lg font-semibold leading-none md:block">Create Quote</h1>
              <p className="text-sm text-muted-foreground md:mt-0">{subtitle}</p>
            </div>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 opacity-60 blur-md animate-pulse" />
            <Button
              size="sm"
              onClick={openAiPanelForEstimate}
              className="relative flex items-center gap-1.5 rounded-full border-0 bg-gradient-to-r from-sky-500 to-blue-600 px-4 font-semibold text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-105 hover:from-sky-400 hover:to-blue-500"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              Estimate with AI
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-24 md:py-6 md:pb-6 max-w-[1600px]">
        <QuoteCreator 
          leadId={leadId} 
          clientId={clientId} 
          projectId={projectId}
          initialData={copiedQuoteData} 
          onProjectContextChange={handleProjectContextChange}
        />
      </main>
    </div>
  )
}
