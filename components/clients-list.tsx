"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ClientsList() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch clients from API when endpoint is available
    // For now, show empty state
    setLoading(false)
    setClients([])
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "inactive":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-6">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clients will appear here once you create quotes or invoices for them.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Card key={client.id} className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{client.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{client.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(client.status)}`}
                >
                  {client.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span>{client.phone}</span>
            </div>
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
              <span className="truncate">{client.address}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Jobs</p>
              <p className="mt-0.5 font-semibold">{client.totalJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="mt-0.5 font-semibold">${client.totalRevenue}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Job</p>
              <p className="mt-0.5 text-xs font-medium">{client.lastJob.split(",")[0]}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1" asChild>
              <a href={`/clients/${client.id}`}>View Details</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${client.phone}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </a>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
