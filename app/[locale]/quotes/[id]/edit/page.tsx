"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"
import { QuoteCreator } from "@/components/Quote-creator"
import { Sparkles } from "lucide-react"

function openAiPanelForEstimate() {
  window.dispatchEvent(new CustomEvent("open-ai-panel-for-estimate"))
}

interface JobItem {
  id: number
  title?: string
  custom_description: string
  quantity: number
  cost_per_unit: number
  unit_of_measure: string
  image_url?: string
  thumbnail_url?: string
  brand?: string
  model?: string
  is_taxable: boolean
  markup_percentage: number
}

interface Client {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
}

interface Job {
  id: number
  client?: Client
  client_name?: string
  client_email?: string
  client_phone?: string
  client_address?: string
  location_zip_code?: string
  status: string
  total_amount: number
  created_at: string
  updated_at: string
  items: JobItem[]
  job_description?: string
  project_type?: string
  payment_terms?: string
  customer_notes?: string
  due_date?: string
  quote_expiration_date?: string
}

export default function EditQuotePage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  const fetchJob = async () => {
    try {
      setLoading(true)
      const data = await api.getJob(parseInt(jobId))
      setJob(data as Job)
    } catch (err: any) {
      setError(err.message || "Failed to load quote")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6 max-w-[1600px]">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="p-8 text-center">
            <div className="text-destructive mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Quote</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  if (!job) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground mb-4">The quote you're looking for doesn't exist.</p>
            <Button asChild>
              <a href="/quotes">Back to Quotes</a>
            </Button>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <a href={`/quotes/${jobId}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              </Button>
              <div>
                <h1 className="hidden text-lg font-semibold leading-none md:block">Edit Quote #{job.id}</h1>
                <p className="text-sm text-muted-foreground">
                  Update quote details and line items
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openAiPanelForEstimate}
              className="flex items-center gap-1.5 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Estimate with AI
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-4 pb-24 md:py-6 md:pb-6 max-w-[1600px]">
          <QuoteCreator 
            quoteId={jobId}
            initialData={job}
          />
        </main>
      </div>
    </AuthGuard>
  )
}

