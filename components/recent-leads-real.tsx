"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

interface Lead {
  id: number
  name: string
  email: string
  phone: string | null
  project_type: string | null
  status: string
  created_at: string
}

export function RecentLeadsReal() {
  const { user } = useAuth()
  const t = useTranslations('dashboard')
  const tTime = useTranslations('dashboard.time')
  const locale = useLocale()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only fetch leads if user has a contractor profile
    // This prevents errors when user hasn't created profile yet
    if (user?.contractor_profile) {
      fetchLeads()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchLeads = async () => {
    try {
      const data = await api.getMyLeads(undefined, 0, 5) // Get only 5 most recent
      setLeads((data as Lead[]).slice(0, 3)) // Show top 3
    } catch (error) {
      // Silently handle errors - profile might not exist yet or other issues
      // Don't log to console to avoid cluttering production logs
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to fetch leads:", error)
      }
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
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return tTime('justNow')
    if (diffInHours < 24) return tTime('hoursAgo', { count: diffInHours })
    if (diffInHours < 48) return tTime('dayAgo')
    return tTime('daysAgo', { count: Math.floor(diffInHours / 24) })
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recentLeads')}</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border p-3">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('recentLeads')}</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/leads`}>{t('viewAll')}</Link>
        </Button>
      </div>
      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No leads yet. Share your quote request page!
        </p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Link 
              key={lead.id} 
              href={`/${locale}/leads/${lead.id}`}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <span className="text-sm font-semibold">{lead.name.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-none group-hover:text-primary transition-colors">{lead.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lead.project_type || "General inquiry"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatTime(lead.created_at)}</span>
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-medium">View</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

