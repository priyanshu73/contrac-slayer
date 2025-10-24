"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function JobDetail({ jobId }: { jobId: string }) {
  const [newNote, setNewNote] = useState("")

  // Mock data - would come from database
  const job = {
    id: jobId,
    client: "John Smith",
    service: "Weekly Mowing",
    status: "confirmed",
    date: "Oct 17, 2025",
    time: "2:00 PM",
    duration: "1 hour",
    location: "123 Oak Street, Springfield, IL 62701",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    price: "$75.00",
    notes: "Regular weekly service. Gate code: 1234. Dog in backyard - please close gate.",
    createdAt: "Oct 10, 2025",
  }

  const jobHistory = [
    {
      id: 1,
      type: "status",
      content: "Job confirmed with client",
      timestamp: "Oct 15, 2025 at 3:00 PM",
      author: "You",
    },
    {
      id: 2,
      type: "note",
      content: "Client requested to avoid using loud equipment before 9 AM",
      timestamp: "Oct 12, 2025 at 10:30 AM",
      author: "You",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "completed":
        return "bg-[var(--status-completed)]/10 text-[var(--status-completed)]"
      case "cancelled":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Job Info Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{job.client}</h2>
                <p className="mt-1 text-lg text-muted-foreground">{job.service}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(job.status)}`}>
                {job.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">
                  {job.date} at {job.time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{job.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="text-sm">{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-semibold">{job.price}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">Job Notes:</p>
              <p className="mt-1 text-sm text-muted-foreground">{job.notes}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <a href={`tel:${job.phone}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call Client
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(job.location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  Directions
                </a>
              </Button>
              <Button variant="outline">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Mark Complete
              </Button>
              <Button variant="outline" asChild>
                <a href={`/jobs/new?jobId=${job.id}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Create Invoice
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Job History */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Job History</h3>
        <div className="space-y-4">
          {jobHistory.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg border border-border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{item.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.author}</span>
                  <span>•</span>
                  <span>{item.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Note Form */}
        <div className="mt-6 space-y-3">
          <Textarea
            placeholder="Add a note or update..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <Button>Add Note</Button>
        </div>
      </Card>
    </div>
  )
}
