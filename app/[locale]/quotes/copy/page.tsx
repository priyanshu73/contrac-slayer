"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocale, useTranslations } from "next-intl"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/api"
import { ArrowLeft, Copy } from "lucide-react"

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
  title?: string
  project_type?: string
}

const ITEMS_PER_PAGE = 10

export default function CopyQuotePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('filters')
  const isMobile = useIsMobile()
  
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setCurrentPage(1)
    fetchQuotes(1)
  }, [activeFilter])

  const fetchQuotes = async (page: number) => {
    try {
      setLoading(true)
      const skip = (page - 1) * ITEMS_PER_PAGE
      const data = await api.getMyJobs(activeFilter, skip, ITEMS_PER_PAGE + 1) as Quote[]
      
      if (data.length > ITEMS_PER_PAGE) {
        setHasMore(true)
        setQuotes(data.slice(0, ITEMS_PER_PAGE))
      } else {
        setHasMore(false)
        setQuotes(data)
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchQuotes(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      year: 'numeric'
    })
  }

  const getFilterLabel = (filter: string | undefined) => {
    if (filter === undefined) return t('all')
    const filterKey = filter.toLowerCase() as keyof typeof t
    return t(filterKey as any) || filter.charAt(0) + filter.slice(1).toLowerCase()
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-none flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground" />
                Select Quote to Copy
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Choose an existing quote to use as a starting point</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="mb-4 p-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {isMobile ? (
              <Select
                value={activeFilter || "all"}
                onValueChange={(value) => setActiveFilter(value === "all" ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getFilterLabel(activeFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="DRAFT">{t('draft')}</SelectItem>
                  <SelectItem value="SENT">{t('sent')}</SelectItem>
                  <SelectItem value="ACCEPTED">{t('accepted')}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={activeFilter === undefined ? "default" : "outline"} onClick={() => setActiveFilter(undefined)} size="sm">
                  {t('all')}
                </Button>
                <Button variant={activeFilter === "DRAFT" ? "default" : "outline"} onClick={() => setActiveFilter("DRAFT")} size="sm">
                  {t('draft')}
                </Button>
                <Button variant={activeFilter === "SENT" ? "default" : "outline"} onClick={() => setActiveFilter("SENT")} size="sm">
                  {t('sent')}
                </Button>
                <Button variant={activeFilter === "ACCEPTED" ? "default" : "outline"} onClick={() => setActiveFilter("ACCEPTED")} size="sm">
                  {t('accepted')}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse flex justify-between">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-20" />
                </div>
                <div className="h-4 bg-muted rounded w-1/2 mt-3" />
              </Card>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Copy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">No quotes to copy</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {activeFilter ? `No ${activeFilter.toLowerCase()} quotes found` : "You haven't created any quotes yet."}
                </p>
                <Button size="sm" asChild>
                  <a href={`/${locale}/quotes/new`}>Create New Blank Quote</a>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <Card 
                key={quote.id}
                className="p-4 hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group"
                onClick={() => router.push(`/${locale}/quotes/new?copyFromId=${quote.id}`)}
              >
                <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                        {quote.title || quote.project_type || quote.client?.name || `Quote #${quote.id}`}
                      </h3>
                      <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </Badge>
                    </div>
                    {quote.client?.name && (
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mb-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {quote.client.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      Created {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-base font-semibold tabular-nums text-right">
                      {formatCurrency(quote.total_amount)}
                    </span>
                    <Button variant="secondary" size="sm" className="h-8 shadow-sm">
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Select
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {(currentPage > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
