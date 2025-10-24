"use client"

import { useState, useEffect } from "react"
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const data = await api.getMyJobs()
      setJobs(data as Job[])
    } catch (err: any) {
      setError(err.message || "Failed to load jobs")
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

  const getJobCategory = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'SENT':
      case 'VIEWED':
      case 'ACCEPTED':
      case 'REJECTED':
        return 'quote'
      case 'IN_PROGRESS':
      case 'COMPLETED':
        return 'active'
      case 'INVOICED':
      case 'PAID':
        return 'completed'
      default:
        return 'other'
    }
  }

  const getFilteredJobs = () => {
    if (activeFilter === "all") return jobs
    
    return jobs.filter(job => {
      const category = getJobCategory(job.status)
      return category === activeFilter
    })
  }

  const getCounts = () => {
    const quoteCount = jobs.filter(job => getJobCategory(job.status) === 'quote').length
    const activeCount = jobs.filter(job => getJobCategory(job.status) === 'active').length
    const completedCount = jobs.filter(job => getJobCategory(job.status) === 'completed').length
    
    return {
      all: jobs.length,
      quote: quoteCount,
      active: activeCount,
      completed: completedCount
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
      month: 'short',
      day: 'numeric'
    })
  }

  const getActions = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return ['Edit Quote', 'Send to Client', 'Delete']
      case 'SENT':
        return ['View Quote', 'Resend', 'Mark as Viewed']
      case 'ACCEPTED':
        return ['Start Job', 'Create Invoice', 'Schedule']
      case 'IN_PROGRESS':
        return ['Update Progress', 'Add Photos', 'Complete Job']
      case 'COMPLETED':
        return ['Create Invoice', 'Request Payment', 'Archive']
      default:
        return ['View Details']
    }
  }

  const counts = getCounts()
  const filteredJobs = getFilteredJobs()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Jobs & Quotes</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your projects from quote to completion
                </p>
                {activeFilter !== "all" && (
                  <Badge variant="secondary" className="mt-2">
                    Showing: {
                      activeFilter === "quote" ? "Quotes" :
                      activeFilter === "active" ? "Active Jobs" :
                      activeFilter === "completed" ? "Completed Jobs" :
                      "All Jobs"
                    } ({filteredJobs.length})
                  </Badge>
                )}
              </div>
              <Button asChild>
                <a href="/jobs/new">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Quote
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Filter Tabs */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                onClick={() => setActiveFilter("all")}
                size="sm"
              >
                All Jobs
                <Badge variant="secondary" className="ml-2">
                  {counts.all}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "quote" ? "default" : "outline"}
                onClick={() => setActiveFilter("quote")}
                size="sm"
              >
                Quotes
                <Badge variant="secondary" className="ml-2">
                  {counts.quote}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "active" ? "default" : "outline"}
                onClick={() => setActiveFilter("active")}
                size="sm"
              >
                Active Jobs
                <Badge variant="secondary" className="ml-2">
                  {counts.active}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "completed" ? "default" : "outline"}
                onClick={() => setActiveFilter("completed")}
                size="sm"
              >
                Completed
                <Badge variant="secondary" className="ml-2">
                  {counts.completed}
                </Badge>
              </Button>
            </div>
          </Card>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty State */
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeFilter
                      ? `No ${activeFilter} jobs found`
                      : "Create your first quote to get started"}
                  </p>
                  <Button asChild>
                    <a href="/jobs/new">Create Quote</a>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            /* Jobs List */
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const statusDisplay = getStatusDisplay(job.status)
                const actions = getActions(job.status)
                
                return (
                  <a
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block group"
                  >
                    <Card className="p-6 hover:shadow-lg transition-all hover:border-primary/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                              {job.client_name}
                            </h3>
                            <Badge className={statusDisplay.color}>
                              <span className="mr-1">{statusDisplay.icon}</span>
                              {statusDisplay.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {job.client_email}
                          </p>
                          {job.client_address && (
                            <p className="text-sm text-muted-foreground">
                              {job.client_address}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>Created {formatDate(job.created_at)}</span>
                            {job.updated_at && (
                              <span>• Updated {formatDate(job.updated_at)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bold text-primary mb-2">
                            {formatCurrency(job.total_amount)}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {actions.slice(0, 2).map((action, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                onClick={(e) => {
                                  e.preventDefault()
                                  // Handle action
                                }}
                              >
                                {action}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                          >
                            View Details
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
