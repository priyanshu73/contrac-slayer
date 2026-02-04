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
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recentQuotes')}</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border p-4">
              <div className="flex justify-between mb-2">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('recentQuotes')}</h2>
        <div className="flex items-center gap-2">
          <Link 
            href={`/${locale}/quotes`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 rounded-md transition-colors"
          >
            View All
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Button size="sm" asChild>
            <Link href={`/${locale}/quotes/new`}>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('createQuote')}
            </Link>
          </Button>
        </div>
      </div>
      {quotes.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{t('noQuotesYet')}</p>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/${locale}/quotes/new`}>{t('createQuote')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <Link 
              key={quote.id} 
              href={`/${locale}/quotes/${quote.id}`}
              className="block rounded-lg border border-border p-4 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold group-hover:text-primary transition-colors truncate">
                      {quote.client?.name || 'Unknown Client'}
                    </span>
                    <Badge className={`shrink-0 text-xs ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </Badge>
                  </div>
                  {quote.client?.email && (
                    <p className="text-sm text-muted-foreground truncate">
                      {quote.client.email}
                    </p>
                  )}
                  {quote.client?.address && (
                    <p className="text-sm text-muted-foreground truncate">
                      {quote.client.address}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDate(quote.created_at)}
                    {quote.updated_at && ` • Updated ${formatDate(quote.updated_at)}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(quote.total_amount)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
