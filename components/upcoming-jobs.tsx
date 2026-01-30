"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import { api } from "@/lib/api"

type Booking = Record<string, any>

function bookingStartDate(b: Booking): Date | null {
  const raw =
    b?.starts_at ||
    b?.starts_at_for_client ||
    b?.start_time ||
    b?.start_at ||
    b?.start ||
    b?.scheduled_at
  if (!raw) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function bookingTitle(b: Booking): string {
  return (
    b?.meeting?.name ||
    b?.title ||
    b?.event_name ||
    b?.meeting_name ||
    b?.name ||
    "Booking"
  )
}

function isPlaceholderEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return email.startsWith("sms_") && email.endsWith("@call.placeholder.local")
}

function extractLocationFromNotes(notes: string | undefined | null): string | null {
  if (!notes) return null
  const locationMatch = notes.match(/Location:\s*(.+?)(?:\n|$)/i)
  return locationMatch ? locationMatch[1].trim() : null
}

function getBookingLocation(b: Booking): string | null {
  if (b?.metadata && typeof b.metadata === 'object') {
    const originalRequest = (b.metadata as any)?.original_request
    if (originalRequest && typeof originalRequest === 'object') {
      const location = originalRequest.meeting_location
      if (location && typeof location === 'string' && location.trim()) {
        return location.trim()
      }
    }
    const location = (b.metadata as any)?.location
    if (location && typeof location === 'string' && location.trim()) {
      return location.trim()
    }
  }
  if (b?.internal_notes) {
    const location = extractLocationFromNotes(b.internal_notes)
    if (location) return location
  }
  return null
}

function formatBookingDateTime(b: Booking): { date: string; time: string } {
  const dt = bookingStartDate(b)
  if (!dt) return { date: "—", time: "—" }
  
  const date = dt.toLocaleDateString(undefined, { 
    month: "short", 
    day: "numeric"
  })
  const time = dt.toLocaleTimeString([], { 
    hour: "numeric", 
    minute: "2-digit" 
  })
  
  return { date, time }
}

export function UpcomingJobs() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [jobs, setJobs] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true)
        setError("")
        const profile = await api.getMyProfile()
        const res = await api.getNeetoBookings({ 
          page_size: 5, 
          type: "upcoming", 
          host_email: profile?.email,
          sorting_order: "asc"
        })
        
        const data = (res as any)?.data ?? res
        const list = Array.isArray(data) ? data : (data?.bookings ?? data?.data ?? [])
        const bookingsArray = Array.isArray(list) ? list : []
        
        // Sort by start date (earliest first)
        const sortedJobs = bookingsArray
          .filter((b) => bookingStartDate(b) !== null)
          .sort((a, b) => {
            const dateA = bookingStartDate(a)?.getTime() ?? 0
            const dateB = bookingStartDate(b)?.getTime() ?? 0
            return dateA - dateB
          })
        
        setJobs(sortedJobs)
      } catch (e: any) {
        console.error("Failed to load upcoming jobs:", e)
        setError(e?.message || "Failed to load jobs")
      } finally {
        setLoading(false)
      }
    }

    loadJobs()
  }, [])

  if (loading) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('upcomingJobs')}</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/calendar`}>{t('viewAll')}</Link>
        </Button>
      </div>
      {error ? (
        <div className="text-center py-8">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8">
          <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{t('jobs.noJobs')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, idx) => {
            const { date, time } = formatBookingDateTime(job)
            const location = getBookingLocation(job)
            const clientName = job?.name || "—"
            const showEmail = job?.email && !isPlaceholderEmail(job.email)
            
            return (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-none">{bookingTitle(job)}</p>
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {clientName}
                        {showEmail ? ` (${job.email})` : ""}
                      </p>
                    </div>
                    {job?.status && (
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {date} at {time}
                    </span>
                    {location && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
    case "pending":
      return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
    default:
      return "bg-muted text-muted-foreground"
  }
}
