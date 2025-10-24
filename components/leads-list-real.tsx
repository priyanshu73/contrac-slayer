"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { LeadsFilters } from "./leads-filters"

interface Lead {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  project_type: string | null
  description: string | null
  status: string
  source: string | null
  priority: number | null
  created_at: string
  estimated_value: number | null
  attachments?: Array<{ id: number }>
}

export function LeadsListReal() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, activeFilter])

  const fetchLeads = async () => {
    try {
      const data = await api.getMyLeads()
      setLeads(data as Lead[])
    } catch (err: any) {
      setError(err.message || "Failed to load leads")
    } finally {
      setLoading(false)
    }
  }

  const filterLeads = () => {
    if (activeFilter === "all") {
      setFilteredLeads(leads)
    } else {
      setFilteredLeads(leads.filter(lead => lead.status === activeFilter))
    }
  }

  const getCounts = () => {
    return {
      all: leads.length,
      new: leads.filter(l => l.status === "NEW").length,
      contacted: leads.filter(l => l.status === "CONTACTED").length,
      quoted: leads.filter(l => l.status === "QUOTED").length,
      converted: leads.filter(l => l.status === "CONVERTED").length,
      lost: leads.filter(l => l.status === "LOST" || l.status === "REJECTED").length,
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

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null
    if (priority >= 8) return <Badge variant="destructive">High Priority</Badge>
    if (priority >= 5) return <Badge className="bg-yellow-500/10 text-yellow-500">Medium Priority</Badge>
    return null
  }

  const getSourceBadge = (source: string | null) => {
    if (!source) return null
    const sourceMap: Record<string, string> = {
      WEBSITE_FORM: "🌐 Website",
      REFERRAL: "👥 Referral",
      PHONE_CALL: "📞 Phone",
      EMAIL: "📧 Email",
      SOCIAL_MEDIA: "📱 Social",
      OTHER: "📌 Other"
    }
    return sourceMap[source] || source
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Card className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </Card>
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
      <>
        <LeadsFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={getCounts()} />
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchLeads} className="mt-4" variant="outline">
            Retry
          </Button>
        </Card>
      </>
    )
  }

  if (leads.length === 0) {
    return (
      <>
        <LeadsFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={getCounts()} />
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Share your quote request page to start receiving leads!
          </p>
          <Button asChild>
            <a href="/settings">Get Your Quote Link</a>
          </Button>
        </Card>
      </>
    )
  }

  if (filteredLeads.length === 0) {
    return (
      <>
        <LeadsFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={getCounts()} />
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No leads with this status.</p>
        </Card>
      </>
    )
  }

  return (
    <>
      <LeadsFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={getCounts()} />
      <div className="space-y-3">
        {filteredLeads.map((lead) => (
        <Card key={lead.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{lead.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold leading-none">{lead.name}</h3>
                    {getPriorityBadge(lead.priority)}
                  </div>
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

              {/* Source and time badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {lead.source && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {getSourceBadge(lead.source)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatTime(lead.created_at)}
                </span>
                {lead.attachments && lead.attachments.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {lead.attachments.length} file{lead.attachments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                  </div>
                )}
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
                  <p className="text-muted-foreground pt-2 border-t">{lead.description}</p>
                )}
                {lead.estimated_value && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Est. Value:</span>
                    <span className="text-sm font-bold text-primary">${lead.estimated_value.toLocaleString()}</span>
                  </div>
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
                  <a href={`/jobs/new?leadId=${lead.id}`}>
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

            </div>
          </div>
        </Card>
      ))}
      </div>
    </>
  )
}

