"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"

interface Stats {
  new_leads: number
  total_leads: number
  // Add more as backend provides them
}

export function StatsCardsReal() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch leads to calculate stats
      const leads = await api.getMyLeads()
      const newLeads = leads.filter((l: any) => l.status.toLowerCase() === "new").length
      setStats({
        new_leads: newLeads,
        total_leads: leads.length,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const displayStats = [
    {
      label: "New Leads",
      value: stats?.new_leads.toString() || "0",
      change: "Awaiting contact",
      trend: "neutral" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Total Leads",
      value: stats?.total_leads.toString() || "0",
      change: "All time",
      trend: "neutral" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      label: "Active Jobs",
      value: "0",
      change: "Coming soon",
      trend: "neutral" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Revenue",
      value: "$0",
      change: "Coming soon",
      trend: "neutral" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-24 animate-shimmer bg-[length:200%_100%]" />
                <div className="h-5 w-5 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
              </div>
              <div className="h-9 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-20 animate-shimmer bg-[length:200%_100%]" />
              <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-32 animate-shimmer bg-[length:200%_100%]" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat) => (
        <Card key={stat.label} className="p-5 hover:shadow-lg transition-all duration-300">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <div className="text-muted-foreground opacity-60">
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.change}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

