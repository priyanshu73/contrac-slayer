"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { api } from "@/lib/api"

interface Quote {
  id: number
  client_name: string
  client_email: string
  client_address?: string
  status: string
  total_amount: number
  created_at: string
  updated_at?: string
}

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchQuotes()
  }, [activeFilter])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const data = await api.getMyJobs(activeFilter, 0, 100)
      setQuotes(data as Quote[])
    } catch (error) {
      console.error("Failed to fetch quotes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DRAFT":
        return "bg-gray-500/10 text-gray-500"
      case "SENT":
        return "bg-blue-500/10 text-blue-500"
      case "VIEWED":
        return "bg-purple-500/10 text-purple-500"
      case "ACCEPTED":
        return "bg-green-500/10 text-green-500"
      case "REJECTED":
        return "bg-red-500/10 text-red-500"
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-500"
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

  const getCounts = () => {
    return {
      all: quotes.length,
      draft: quotes.filter(q => q.status?.toUpperCase() === 'DRAFT').length,
      sent: quotes.filter(q => q.status?.toUpperCase() === 'SENT').length,
      accepted: quotes.filter(q => q.status?.toUpperCase() === 'ACCEPTED').length,
    }
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
        description: `Quote for ${quoteToDelete.client_name} has been deleted successfully.`,
      })
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
      // Refresh the quotes list
      fetchQuotes()
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

  const counts = getCounts()

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeFilter === undefined ? "default" : "outline"}
                onClick={() => setActiveFilter(undefined)}
                size="sm"
              >
                All
                <Badge variant="secondary" className="ml-2">
                  {counts.all}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "DRAFT" ? "default" : "outline"}
                onClick={() => setActiveFilter("DRAFT")}
                size="sm"
              >
                Draft
                <Badge variant="secondary" className="ml-2">
                  {counts.draft}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "SENT" ? "default" : "outline"}
                onClick={() => setActiveFilter("SENT")}
                size="sm"
              >
                Sent
                <Badge variant="secondary" className="ml-2">
                  {counts.sent}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === "ACCEPTED" ? "default" : "outline"}
                onClick={() => setActiveFilter("ACCEPTED")}
                size="sm"
              >
                Accepted
                <Badge variant="secondary" className="ml-2">
                  {counts.accepted}
                </Badge>
              </Button>
            </div>
            <Button asChild>
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
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </Card>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          /* Empty State */
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeFilter
                    ? `No ${activeFilter.toLowerCase()} quotes found`
                    : "Create your first quote to get started"}
                </p>
                <Button asChild>
                  <a href="/quotes/new">Create Quote</a>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Quotes List */
          <div className="space-y-4">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="group relative"
              >
                <Card 
                  className="p-6 hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {quote.client_name}
                        </h3>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {quote.client_email}
                      </p>
                      {quote.client_address && (
                        <p className="text-sm text-muted-foreground">
                          {quote.client_address}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>Created {formatDate(quote.created_at)}</span>
                        {quote.updated_at && (
                          <span>• Updated {formatDate(quote.updated_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(quote.total_amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/${quote.id}`)
                          }}
                        >
                          View Details
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, quote)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the quote for <strong>{quoteToDelete?.client_name}</strong>? 
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

