"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

interface Lead {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  project_type: string | null
  description: string | null
  status: string
  created_at: string
  estimated_value: number | null
}

export function LeadsListReal() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const data = await api.getMyLeads()
      setLeads(data)
    } catch (err: any) {
      setError(err.message || "Failed to load leads")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-500/10 text-blue-500"
      case "contacted":
        return "bg-yellow-500/10 text-yellow-500"
      case "quoted":
        return "bg-green-500/10 text-green-500"
      case "converted":
        return "bg-purple-500/10 text-purple-500"
      case "lost":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return "1 day ago"
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchLeads} className="mt-4" variant="outline">
          Retry
        </Button>
      </Card>
    )
  }

  if (leads.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No leads yet. Share your quote request page to get started!</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <Card key={lead.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{lead.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-none">{lead.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {lead.project_type || "General inquiry"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(lead.status)}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{lead.address}</span>
                  </div>
                )}
                {lead.description && (
                  <p className="text-muted-foreground">{lead.description}</p>
                )}
                {lead.estimated_value && (
                  <p className="text-muted-foreground">
                    Est. Value: ${lead.estimated_value.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={`/leads/${lead.id}`}>View Details</a>
                </Button>
                {lead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      Call
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <a href={`/quotes/new?leadId=${lead.id}`}>
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Quote
                  </a>
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">{formatTime(lead.created_at)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

