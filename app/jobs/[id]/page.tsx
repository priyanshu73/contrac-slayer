"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"

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
}

export default function JobDetailPage() {
  const params = useParams()
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
      setError(err.message || "Failed to load job")
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return { 
          label: 'Quote - Draft', 
          color: 'bg-gray-100 text-gray-800',
          icon: '📝'
        }
      case 'SENT':
        return { 
          label: 'Quote - Sent', 
          color: 'bg-blue-100 text-blue-800',
          icon: '📤'
        }
      case 'VIEWED':
        return { 
          label: 'Quote - Viewed', 
          color: 'bg-purple-100 text-purple-800',
          icon: '👁️'
        }
      case 'ACCEPTED':
        return { 
          label: 'Quote - Accepted', 
          color: 'bg-green-100 text-green-800',
          icon: '✅'
        }
      case 'REJECTED':
        return { 
          label: 'Quote - Rejected', 
          color: 'bg-red-100 text-red-800',
          icon: '❌'
        }
      case 'IN_PROGRESS':
        return { 
          label: 'Active Job - In Progress', 
          color: 'bg-green-100 text-green-800',
          icon: '🔨'
        }
      case 'COMPLETED':
        return { 
          label: 'Job - Completed', 
          color: 'bg-emerald-100 text-emerald-800',
          icon: '🎉'
        }
      case 'INVOICED':
        return { 
          label: 'Job - Invoiced', 
          color: 'bg-blue-100 text-blue-800',
          icon: '💰'
        }
      case 'PAID':
        return { 
          label: 'Job - Paid', 
          color: 'bg-gray-100 text-gray-800',
          icon: '💳'
        }
      default:
        return { 
          label: status, 
          color: 'bg-gray-100 text-gray-800',
          icon: '📄'
        }
    }
  }

  const getActions = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return [
          { label: 'Edit Quote', variant: 'default' as const },
          { label: 'Send to Client', variant: 'default' as const },
          { label: 'Delete', variant: 'destructive' as const }
        ]
      case 'SENT':
        return [
          { label: 'View Quote', variant: 'outline' as const },
          { label: 'Resend', variant: 'default' as const },
          { label: 'Mark as Viewed', variant: 'outline' as const }
        ]
      case 'ACCEPTED':
        return [
          { label: 'Start Job', variant: 'default' as const },
          { label: 'Create Invoice', variant: 'outline' as const },
          { label: 'Schedule', variant: 'outline' as const }
        ]
      case 'IN_PROGRESS':
        return [
          { label: 'Update Progress', variant: 'default' as const },
          { label: 'Add Photos', variant: 'outline' as const },
          { label: 'Complete Job', variant: 'default' as const }
        ]
      case 'COMPLETED':
        return [
          { label: 'Create Invoice', variant: 'default' as const },
          { label: 'Request Payment', variant: 'outline' as const },
          { label: 'Archive', variant: 'outline' as const }
        ]
      default:
        return [
          { label: 'View Details', variant: 'outline' as const }
        ]
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
            <h2 className="text-xl font-semibold mb-2">Error Loading Job</h2>
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
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
            <Button asChild>
              <a href="/jobs">Back to Jobs</a>
            </Button>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  const statusDisplay = getStatusDisplay(job.status)
  const actions = getActions(job.status)
  
  // Use backend-calculated total instead of frontend calculation
  const total = job.total_amount || 0

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job #{job.id}</h1>
              <p className="text-gray-600">Created on {formatDate(job.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusDisplay.color}>
                <span className="mr-1">{statusDisplay.icon}</span>
                {statusDisplay.label}
              </Badge>
              <Button variant="outline" asChild>
                <a href="/jobs">Back to Jobs</a>
              </Button>
            </div>
          </div>

          {/* Client Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Client Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{job.client_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-lg">{job.client_email}</p>
              </div>
              {job.client_phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg">{job.client_phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-lg">{job.client_address}</p>
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Line Items</h2>
            <div className="space-y-4">
              {job.items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  {/* Item Image */}
                  {item.thumbnail_url && (
                    <div className="w-16 h-16 flex-shrink-0 rounded border overflow-hidden bg-muted">
                      <img
                        src={item.thumbnail_url}
                        alt={item.custom_description}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Item Details */}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.custom_description}</h3>
                    {item.brand && (
                      <p className="text-sm text-gray-500">{item.brand} {item.model}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Qty: {item.quantity}</span>
                      <span>Rate: {formatCurrency(item.cost_per_unit)}</span>
                      <span>Unit: {item.unit_of_measure}</span>
                      {item.markup_percentage > 0 && (
                        <span className="text-primary font-medium">
                          +{item.markup_percentage}% markup
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Item Total */}
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatCurrency((item.quantity * item.cost_per_unit) * (1 + item.markup_percentage / 100))}
                    </p>
                    {item.markup_percentage > 0 && (
                      <p className="text-sm text-gray-500">
                        Base: {formatCurrency(item.quantity * item.cost_per_unit)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Totals */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quote Summary</h2>
            <div className="space-y-2">
              {(() => {
                // Calculate breakdown
                const baseSubtotal = job.items.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0)
                const markupAmount = job.items.reduce((sum, item) => {
                  const itemBase = item.quantity * item.cost_per_unit
                  return sum + (itemBase * item.markup_percentage / 100)
                }, 0)
                const subtotalWithMarkup = baseSubtotal + markupAmount
                const taxAmount = total - subtotalWithMarkup
                
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal (before markup):</span>
                      <span>{formatCurrency(baseSubtotal)}</span>
                    </div>
                    {markupAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Markup:</span>
                        <span className="text-primary">+{formatCurrency(markupAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(subtotalWithMarkup)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {actions.map((action, index) => (
              <Button 
                key={index}
                size="lg" 
                variant={action.variant}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
