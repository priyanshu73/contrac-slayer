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
      value: loading ? "..." : stats?.new_leads.toString() || "0",
      change: "Awaiting contact",
      trend: "neutral" as const,
    },
    {
      label: "Total Leads",
      value: loading ? "..." : stats?.total_leads.toString() || "0",
      change: "All time",
      trend: "neutral" as const,
    },
    {
      label: "Active Jobs",
      value: "0",
      change: "Coming soon",
      trend: "neutral" as const,
    },
    {
      label: "Revenue",
      value: "$0",
      change: "Coming soon",
      trend: "neutral" as const,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat) => (
        <Card key={stat.label} className="p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.change}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

