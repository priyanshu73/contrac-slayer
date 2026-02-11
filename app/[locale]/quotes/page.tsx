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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

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
  client?: ClientInfo  // Client details populated from client_id
  status: string
  total_amount: number
  created_at: string
  updated_at?: string
}

const ITEMS_PER_PAGE = 10

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const t = useTranslations('filters')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    // Reset to page 1 when filter changes
    setCurrentPage(1)
    fetchQuotes(1)
  }, [activeFilter])

  const fetchQuotes = async (page: number) => {
    try {
      setLoading(true)
      const skip = (page - 1) * ITEMS_PER_PAGE
      // Fetch one extra to check if there are more pages
      const data = await api.getMyJobs(activeFilter, skip, ITEMS_PER_PAGE + 1) as Quote[]
      
      // Check if there are more pages
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
    // Scroll to top of page
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
    })
  }

  const handleRefresh = () => {
    fetchQuotes(currentPage)
  }

  const handleDeleteClick = (e: React.MouseEvent, quote: Quote) => {
    e.preventDefault()
    e.stopPropagation()
    setQuoteToDelete(quote)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return

    try {
      setDeleting(true)
      await api.deleteJob(quoteToDelete.id)
      toast({
        title: "Quote deleted",
        description: `Quote for ${quoteToDelete.client?.name || 'client'} has been deleted successfully.`,
      })
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
      // Refresh the quotes list - go to page 1 if current page becomes empty
      if (quotes.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
        fetchQuotes(currentPage - 1)
      } else {
        fetchQuotes(currentPage)
      }
    } catch (error) {
      console.error("Failed to delete quote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const getFilterLabel = (filter: string | undefined) => {
    if (filter === undefined) return t('all')
    const filterKey = filter.toLowerCase() as keyof typeof t
    return t(filterKey as any) || filter.charAt(0) + filter.slice(1).toLowerCase()
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-4 p-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Mobile: Dropdown, Desktop: Buttons */}
            {isMobile ? (
              <div className="flex items-center gap-2">
                <Select
                  value={activeFilter || "all"}
                  onValueChange={(value) => setActiveFilter(value === "all" ? undefined : value)}
                >
                  <SelectTrigger className="flex-1 min-w-0">
                    <SelectValue>
                      {getFilterLabel(activeFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    <SelectItem value="DRAFT">{t('draft')}</SelectItem>
                    <SelectItem value="SENT">{t('sent')}</SelectItem>
                    <SelectItem value="ACCEPTED">{t('accepted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilter === undefined ? "default" : "outline"}
                  onClick={() => setActiveFilter(undefined)}
                  size="sm"
                >
                  {t('all')}
                </Button>
                <Button
                  variant={activeFilter === "DRAFT" ? "default" : "outline"}
                  onClick={() => setActiveFilter("DRAFT")}
                  size="sm"
                >
                  {t('draft')}
                </Button>
                <Button
                  variant={activeFilter === "SENT" ? "default" : "outline"}
                  onClick={() => setActiveFilter("SENT")}
                  size="sm"
                >
                  {t('sent')}
                </Button>
                <Button
                  variant={activeFilter === "ACCEPTED" ? "default" : "outline"}
                  onClick={() => setActiveFilter("ACCEPTED")}
                  size="sm"
                >
                  {t('accepted')}
                </Button>
              </div>
            )}
            <Button asChild className="w-full sm:w-auto">
              <a href="/quotes/new">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Quote
              </a>
            </Button>
          </div>
        </Card>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-3">
                <div className="animate-pulse flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
                <div className="h-3 bg-muted rounded w-1/2 mt-1.5" />
              </Card>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          /* Empty State */
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">No quotes yet</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {activeFilter
                    ? `No ${activeFilter.toLowerCase()} quotes found`
                    : "Create your first quote to get started"}
                </p>
                <Button size="sm" asChild>
                  <a href="/quotes/new">Create Quote</a>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Quotes List */
          <div className="space-y-2">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="group relative"
              >
                <Card 
                  className="p-3 hover:shadow-md transition-all hover:border-primary/50 cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                          {quote.client?.name || 'Unknown Client'}
                        </h3>
                        <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
                        {quote.client?.address && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {quote.client.address}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Created {formatDate(quote.created_at)}
                        {quote.updated_at && ` • Updated ${formatDate(quote.updated_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 justify-end text-right shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/quotes/${quote.id}`)
                        }}
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(e, quote)}
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                      <span className="text-base font-semibold text-primary tabular-nums min-w-[4.5rem] text-right">
                        {formatCurrency(quote.total_amount)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}

            {/* Pagination Controls */}
            {(currentPage > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the quote for <strong>{quoteToDelete?.client?.name || 'this client'}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

