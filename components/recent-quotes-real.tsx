"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

interface ClientInfo {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
}

interface Quote {
  id: number
  client_id?: number
  client?: ClientInfo
  status: string
  total_amount: number
  created_at: string
  updated_at?: string
}

export function RecentQuotesReal() {
  const { user } = useAuth()
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.contractor_profile) {
      fetchQuotes()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchQuotes = async () => {
    try {
      const data = await api.getMyJobs(undefined, 0, 5)
      setQuotes((data as Quote[]).slice(0, 3))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to fetch quotes:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DRAFT":
        return "bg-amber-500/15 text-amber-600"
      case "SENT":
        return "bg-blue-500/15 text-blue-600"
      case "VIEWED":
        return "bg-purple-500/15 text-purple-600"
      case "ACCEPTED":
        return "bg-emerald-500/15 text-emerald-600"
      case "REJECTED":
        return "bg-red-500/15 text-red-600"
      case "PAID":
        return "bg-green-500/15 text-green-600"
      case "IN_PROGRESS":
        return "bg-sky-500/15 text-sky-600"
      case "COMPLETED":
        return "bg-teal-500/15 text-teal-600"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('recentQuotes')}</h2>
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded border border-border p-2.5">
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-14" />
              </div>
              <div className="h-3 bg-muted rounded w-1/2 mt-1" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('recentQuotes')}</h2>
        <div className="flex items-center gap-1.5">
          <Link 
            href={`/${locale}/quotes`}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 rounded transition-colors"
          >
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Button size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={`/${locale}/quotes/new`}>
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('createQuote')}
            </Link>
          </Button>
        </div>
      </div>
      {quotes.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{t('noQuotesYet')}</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <Link href={`/${locale}/quotes/new`}>{t('createQuote')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {quotes.map((quote) => (
            <Link 
              key={quote.id} 
              href={`/${locale}/quotes/${quote.id}`}
              className="block rounded border border-border p-2.5 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                      {quote.client?.name || 'Unknown Client'}
                    </span>
                    <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mt-0.5">
                    {quote.client?.address && (
                      <span className="text-xs text-muted-foreground truncate block max-w-full">
                        {quote.client.address}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    Created {formatDate(quote.created_at)}
                    {quote.updated_at && ` • Updated ${formatDate(quote.updated_at)}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary tabular-nums text-right shrink-0">
                  {formatCurrency(quote.total_amount)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
