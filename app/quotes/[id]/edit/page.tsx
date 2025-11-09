"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"
import { QuoteCreator } from "@/components/Quote-creator"

interface JobItem {
  id: number
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

interface Job {
  id: number
  client_name: string
  client_email: string
  client_phone?: string
  client_address: string
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
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Quote</h2>
            <p className="text-gray-600 mb-4">{error}</p>
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-gray-600 mb-4">The quote you're looking for doesn't exist.</p>
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Quote #{job.id}</h1>
              <p className="text-gray-600 mt-1">Update quote details and line items</p>
            </div>
            <Button variant="outline" onClick={() => router.push(`/quotes/${jobId}`)}>
              Cancel
            </Button>
          </div>
          <QuoteCreator 
            quoteId={jobId}
            initialData={job}
          />
        </div>
      </div>
    </AuthGuard>
  )
}

