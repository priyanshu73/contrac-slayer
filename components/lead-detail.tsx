"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Lead } from "@/lib/types"
import Image from "next/image"

export function LeadDetail({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchLead()
  }, [leadId])

  const fetchLead = async () => {
    try {
      setLoading(true)
      const data = await api.getLead(parseInt(leadId))
      setLead(data as Lead)
    } catch (err: any) {
      setError(err.message || "Failed to load lead")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "NEW":
        return "bg-blue-500/10 text-blue-500"
      case "CONTACTED":
        return "bg-yellow-500/10 text-yellow-500"
      case "QUOTED":
        return "bg-green-500/10 text-green-500"
      case "CONVERTED":
        return "bg-purple-500/10 text-purple-500"
      case "REJECTED":
      case "LOST":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-muted text-muted-foreground"
    }
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
      WEBSITE_FORM: "🌐 Website Form",
      REFERRAL: "👥 Referral",
      PHONE_CALL: "📞 Phone Call",
      EMAIL: "📧 Email",
      SOCIAL_MEDIA: "📱 Social Media",
      OTHER: "📌 Other"
    }
    return sourceMap[source] || source
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 bg-muted rounded w-48" />
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>
              <div className="h-5 bg-muted rounded w-64" />
              <div className="flex gap-2">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-6 w-32 bg-muted rounded" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
            </div>
          </div>
        </Card>

        {/* Lead Management Info skeleton */}
        <Card className="p-6">
          <div className="h-6 bg-muted rounded w-1/4 mb-4" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-28" />
              <div className="h-8 bg-muted rounded" />
            </div>
          </div>
        </Card>

        {/* Description skeleton */}
        <Card className="p-6">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </Card>

        {/* Attachments skeleton */}
        <Card className="p-6">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video bg-muted rounded-lg" />
            ))}
          </div>
        </Card>

        {/* Actions skeleton */}
        <Card className="p-6">
          <div className="h-6 bg-muted rounded w-1/4 mb-4" />
          <div className="flex gap-2 flex-wrap">
            <div className="h-11 w-36 bg-muted rounded" />
            <div className="h-11 w-24 bg-muted rounded" />
            <div className="h-11 w-24 bg-muted rounded" />
            <div className="h-11 w-28 bg-muted rounded" />
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !lead) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load lead</h3>
        <p className="text-muted-foreground mb-4">{error || "Lead not found"}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={fetchLead} variant="outline">Try Again</Button>
          <Button asChild><a href="/leads">Back to Leads</a></Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Lead Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-2xl font-semibold">{lead.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h2 className="text-2xl font-bold">{lead.name}</h2>
                  {getPriorityBadge(lead.priority)}
                </div>
                <p className="text-lg text-muted-foreground">{lead.project_type || "General Inquiry"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(lead.status)}`}>
                {lead.status}
              </span>
            </div>

            {/* Source and estimated value */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {lead.source && (
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded">
                  {getSourceBadge(lead.source)}
                </span>
              )}
              {lead.estimated_value && (
                <span className="text-sm font-semibold text-primary">
                  Est. Value: ${lead.estimated_value.toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${lead.email}`} className="text-sm hover:underline truncate">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${lead.phone}`} className="text-sm hover:underline">{lead.phone}</a>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm truncate">{lead.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lead Management Info */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Lead Management</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Source */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Source</p>
            <p className="font-medium">{getSourceBadge(lead.source)}</p>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Priority</p>
            <div>{getPriorityBadge(lead.priority) || <span className="text-sm">Normal</span>}</div>
          </div>

          {/* Estimated Value */}
          {lead.estimated_value && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estimated Value</p>
              <p className="font-bold text-primary text-lg">${lead.estimated_value.toLocaleString()}</p>
            </div>
          )}

          {/* Last Contacted */}
          {lead.last_contacted_at && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Contacted</p>
              <p className="text-sm">{formatDate(lead.last_contacted_at)}</p>
            </div>
          )}

          {/* Created Date */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lead Created</p>
            <p className="text-sm">{formatDate(lead.created_at)}</p>
          </div>

          {/* Updated Date */}
          {lead.updated_at && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-sm">{formatDate(lead.updated_at)}</p>
            </div>
          )}
        </div>

        {/* Conversion Status */}
        {(lead.converted_to_job_id || lead.converted_to_client_id) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Conversion Status</p>
            <div className="flex gap-2 flex-wrap">
              {lead.converted_to_client_id && (
                <Badge className="bg-green-500/10 text-green-500">
                  ✓ Converted to Client #{lead.converted_to_client_id}
                </Badge>
              )}
              {lead.converted_to_job_id && (
                <Badge className="bg-blue-500/10 text-blue-500">
                  ✓ Job Created #{lead.converted_to_job_id}
                </Badge>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Project Description Card */}
      {lead.description && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Project Description</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{lead.description}</p>
        </Card>
      )}

      {/* Notes Card */}
      {lead.notes && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Internal Notes</h3>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
        </Card>
      )}

      {/* Media Gallery Card */}
      {lead.attachments && lead.attachments.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Customer Attachments
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({lead.attachments.length} file{lead.attachments.length > 1 ? 's' : ''})
              </span>
            </h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {lead.attachments.map((attachment) => {
              const isVideo = attachment.file_type === "VIDEO"
              const isImage = attachment.file_type === "IMAGE"
              const isPDF = attachment.file_type === "PDF" || attachment.mime_type?.includes('pdf')
              const isDoc = attachment.file_type === "DOCUMENT"
              
              return (
                <button
                  key={attachment.id}
                  onClick={() => isImage || isVideo ? setSelectedImage(attachment.public_url || attachment.file_path) : window.open(attachment.public_url || attachment.file_path, '_blank')}
                  className="group relative aspect-video overflow-hidden rounded-lg border-2 border-border transition-all hover:border-primary hover:shadow-md"
                >
                  {isImage || isVideo ? (
                    <>
                      <Image
                        src={attachment.thumbnail_url || attachment.public_url || attachment.file_path}
                        alt={attachment.description || attachment.file_name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized={attachment.public_url?.includes('cloudinary')}
                      />
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="rounded-full bg-white/95 p-3 shadow-lg">
                            <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                      <svg className="h-12 w-12 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isPDF ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        )}
                      </svg>
                      <p className="text-xs text-center px-2 text-muted-foreground">
                        {isPDF ? 'PDF' : isDoc ? 'DOC' : attachment.file_type}
                      </p>
                    </div>
                  )}
                  
                  {/* File info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs text-white truncate font-medium">
                      {attachment.description || attachment.file_name}
                    </p>
                    {attachment.file_size && (
                      <p className="text-xs text-white/70">
                        {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  {/* File type badge */}
                  <div className="absolute top-2 right-2">
                    {isVideo && (
                      <Badge className="bg-red-500/90 text-white text-xs">VIDEO</Badge>
                    )}
                    {isPDF && (
                      <Badge className="bg-blue-500/90 text-white text-xs">PDF</Badge>
                    )}
                    {isDoc && (
                      <Badge className="bg-purple-500/90 text-white text-xs">DOC</Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-dashed">
          <div className="text-center text-muted-foreground py-8">
            <svg className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No attachments provided</p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <a href={`/jobs/new?leadId=${lead.id}`}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Create Quote
            </a>
          </Button>
          {lead.phone && (
            <Button variant="outline" size="lg" asChild>
              <a href={`tel:${lead.phone}`}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </a>
            </Button>
          )}
          {lead.email && (
            <Button variant="outline" size="lg" asChild>
              <a href={`mailto:${lead.email}`}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <a href={`/calendar/new?leadId=${lead.id}`}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Schedule
            </a>
          </Button>
        </div>
      </Card>

      {/* Full-screen image viewer modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage || "/placeholder.svg"} alt="Full size" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}
