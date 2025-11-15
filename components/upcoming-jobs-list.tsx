"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function UpcomingJobsList() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch upcoming jobs from API when endpoint is available
    // For now, show empty state
    setLoading(false)
    setJobs([])
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "completed":
        return "bg-[var(--status-completed)]/10 text-[var(--status-completed)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Upcoming Jobs</h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border p-3 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Upcoming Jobs</h2>
        <div className="text-center py-8">
          <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">No upcoming jobs scheduled</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Upcoming Jobs</h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-lg border border-border p-3 hover:bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-none">{job.client}</p>
                <p className="mt-1 text-sm text-muted-foreground">{job.service}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                {job.status}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {job.date} at {job.time}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{job.duration}</span>
              </div>
            </div>

            <Button size="sm" variant="outline" className="mt-3 w-full bg-transparent" asChild>
              <a href={`/calendar/${job.id}`}>View Details</a>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
