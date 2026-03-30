"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { api } from "@/lib/api"
import { FileText, Plus, RefreshCw, Search, Trash2, ChevronRight } from "lucide-react"

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
  title?: string | null
  created_from_job_id?: number | null
}

const ITEMS_PER_PAGE = 10

const STATUS_ORDER = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "CUSTOMER_MODIFIED",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "CANCELLED",
] as const

function statusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25"
    case "SENT":
      return "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/25"
    case "VIEWED":
      return "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/25"
    case "CUSTOMER_MODIFIED":
      return "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-500/25"
    case "ACCEPTED":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/25"
    case "REJECTED":
      return "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/25"
    case "IN_PROGRESS":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/25"
    case "COMPLETED":
      return "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/25"
    case "INVOICED":
      return "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/25"
    case "PAID":
      return "bg-green-600/15 text-green-800 dark:text-green-200 border-green-600/25"
    case "CANCELLED":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function statusAccentClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "border-l-amber-500"
    case "SENT":
      return "border-l-blue-500"
    case "VIEWED":
      return "border-l-violet-500"
    case "CUSTOMER_MODIFIED":
      return "border-l-fuchsia-500"
    case "ACCEPTED":
      return "border-l-emerald-500"
    case "REJECTED":
      return "border-l-red-500"
    case "IN_PROGRESS":
      return "border-l-sky-500"
    case "COMPLETED":
      return "border-l-teal-500"
    case "INVOICED":
      return "border-l-indigo-500"
    case "PAID":
      return "border-l-green-600"
    case "CANCELLED":
      return "border-l-slate-400"
    default:
      return "border-l-muted-foreground/40"
  }
}

function formatStatusLabel(status: string): string {
  if (!status) return ""
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function QuotesPage() {
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()
  const tFilters = useTranslations("filters")
  const tQuotes = useTranslations("quotes")

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [clientFilterId, setClientFilterId] = useState<number | undefined>(undefined)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const basePath = `/${locale}/quotes`

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    api
      .getClients(0, 500)
      .then((raw) => {
        if (cancelled) return
        const arr = Array.isArray(raw) ? raw : []
        const mapped: ClientInfo[] = arr.map((c: { id: number; name: string; email: string; phone?: string }) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
        }))
        mapped.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        setClients(mapped)
      })
      .catch(() => {
        if (!cancelled) setClients([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadPage = useCallback(
    async (page: number) => {
      try {
        setLoading(true)
        const skip = (page - 1) * ITEMS_PER_PAGE
        const data = (await api.getMyJobs(
          activeFilter,
          skip,
          ITEMS_PER_PAGE + 1,
          clientFilterId,
          debouncedSearch || undefined
        )) as Quote[]

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
    },
    [activeFilter, debouncedSearch, clientFilterId]
  )

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [activeFilter, debouncedSearch, clientFilterId, loadPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleRefresh = () => {
    loadPage(currentPage)
  }

  const hasActiveFilters =
    activeFilter !== undefined || clientFilterId !== undefined || debouncedSearch.length > 0

  const clearFilters = () => {
    setActiveFilter(undefined)
    setClientFilterId(undefined)
    setSearchInput("")
    setDebouncedSearch("")
  }

  const statusLabel = useMemo(() => {
    const map: Record<string, string> = {
      DRAFT: tFilters("draft"),
      SENT: tFilters("sent"),
      VIEWED: tFilters("viewed"),
      ACCEPTED: tFilters("accepted"),
      REJECTED: tFilters("rejected"),
      IN_PROGRESS: tFilters("inProgress"),
      COMPLETED: tFilters("completed"),
      INVOICED: tFilters("invoiced"),
      PAID: tFilters("paid"),
      CANCELLED: tFilters("cancelled"),
      CUSTOMER_MODIFIED: tFilters("customerModified"),
    }
    return (code: string) => map[code] ?? formatStatusLabel(code)
  }, [tFilters])

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
        description: `Quote for ${quoteToDelete.client?.name || "client"} has been deleted successfully.`,
      })
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
      if (quotes.length === 1 && currentPage > 1) {
        const p = currentPage - 1
        setCurrentPage(p)
        loadPage(p)
      } else {
        loadPage(currentPage)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background pb-24 md:pb-10">
      <main className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              {tQuotes("listTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 pl-0 sm:pl-12">{tQuotes("listSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <a href={`${basePath}/new`}>
                <Plus className="h-4 w-4" />
                New Quote
              </a>
            </Button>
          </div>
        </div>

        <Card className="p-4 md:p-5 mb-5 shadow-sm border-border/80 bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tQuotes("searchPlaceholder")}
                className="pl-9 h-10 bg-background"
                aria-label={tQuotes("searchPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tQuotes("statusFilter")}
                </span>
                <Select
                  value={activeFilter ?? "all"}
                  onValueChange={(v) => setActiveFilter(v === "all" ? undefined : v)}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={tFilters("all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tFilters("all")}</SelectItem>
                    {STATUS_ORDER.map((code) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              code === "PAID"
                                ? "bg-green-600"
                                : code === "INVOICED"
                                  ? "bg-indigo-500"
                                  : code === "ACCEPTED"
                                    ? "bg-emerald-500"
                                    : code === "DRAFT"
                                      ? "bg-amber-500"
                                      : "bg-muted-foreground/60"
                            }`}
                          />
                          {statusLabel(code)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</span>
                <Select
                  value={clientFilterId != null ? String(clientFilterId) : "all"}
                  onValueChange={(v) => setClientFilterId(v === "all" ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={tQuotes("allClients")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="all">{tQuotes("allClients")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} textValue={`${c.name} ${c.email}`}>
                        <span className="truncate block">{c.name}</span>
                        <span className="text-muted-foreground text-xs truncate block">{c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="self-start -mt-1 h-8 text-xs" onClick={clearFilters}>
                {tQuotes("clearFilters")}
              </Button>
            )}
          </div>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 border-l-4 border-l-muted animate-pulse">
                <div className="flex justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </Card>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <Card className="p-10 text-center border-dashed bg-muted/20">
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{hasActiveFilters ? tQuotes("noMatches") : "No quotes yet"}</h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? tQuotes("tryAdjustFilters") : "Create your first quote to get started."}
              </p>
              {!hasActiveFilters && (
                <Button size="sm" asChild className="mt-2">
                  <a href={`${basePath}/new`}>Create Quote</a>
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div key={quote.id} className="group relative">
                <Card
                  className={`p-4 md:p-5 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-border/80 bg-card/90 hover:border-primary/30 ${statusAccentClass(quote.status)}`}
                  onClick={() => router.push(`${basePath}/${quote.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {quote.created_from_job_id
                            ? `Change order · #${quote.id}`
                            : tQuotes("quoteNumber", { id: quote.id })}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wide font-semibold border ${statusBadgeClass(quote.status)}`}
                        >
                          {statusLabel(String(quote.status))}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {quote.client?.name || "Unknown client"}
                      </h3>
                      {quote.title?.trim() && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{quote.title}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {quote.client?.email && <span className="truncate max-w-full">{quote.client.email}</span>}
                        {quote.client?.phone && <span>{quote.client.phone}</span>}
                      </div>
                      {quote.client?.address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{quote.client.address}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Created {formatDate(quote.created_at)}
                        {quote.updated_at && ` · Updated ${formatDate(quote.updated_at)}`}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                      <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(quote.total_amount)}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`${basePath}/${quote.id}`)
                          }}
                          title="Open"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, quote)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}

            {(currentPage > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-2 pt-6 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4 tabular-nums">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the quote for{" "}
              <strong>{quoteToDelete?.client?.name || "this client"}</strong>? This action cannot be undone.
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
