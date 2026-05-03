"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { Receipt, Search, ChevronDown, ChevronRight } from "lucide-react"

interface ClientInfo {
  id: number
  name: string
  email: string
  phone?: string
}

const ITEMS_PER_PAGE = 10

const STATUS_ORDER = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const

function statusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25"
    case "SENT":
      return "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/25"
    case "PARTIALLY_PAID":
      return "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/25"
    case "PAID":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/25"
    case "OVERDUE":
      return "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/25"
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
    case "PARTIALLY_PAID":
      return "border-l-orange-500"
    case "PAID":
      return "border-l-emerald-500"
    case "OVERDUE":
      return "border-l-red-500"
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function InvoicesPage() {
  const router = useRouter()
  const locale = useLocale()
  const basePath = `/${locale}/invoices`

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [clientFilterId, setClientFilterId] = useState<number | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load clients for filter
  useEffect(() => {
    let cancelled = false
    api
      .getClients(0, 500)
      .then((raw) => {
        if (cancelled) return
        const arr = Array.isArray(raw) ? raw : []
        const mapped: ClientInfo[] = arr.map((c: any) => ({
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
        const statusFilter = activeStatuses.length === 1 ? activeStatuses[0] : undefined

        const data = await api.getInvoices(statusFilter, skip, ITEMS_PER_PAGE + 1)
        let items = data.items || []

        // Client-side filtering for multi-status, search, and client
        if (activeStatuses.length > 1) {
          items = items.filter((inv: any) =>
            activeStatuses.some((s) => s === inv.status?.toUpperCase())
          )
        }

        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase()
          items = items.filter(
            (inv: any) =>
              inv.client_name?.toLowerCase().includes(q) ||
              inv.invoice_number?.toLowerCase().includes(q) ||
              inv.title?.toLowerCase().includes(q)
          )
        }

        if (clientFilterId !== undefined) {
          items = items.filter((inv: any) => inv.client_id === clientFilterId)
        }

        if (items.length > ITEMS_PER_PAGE) {
          setHasMore(true)
          setInvoices(items.slice(0, ITEMS_PER_PAGE))
        } else {
          setHasMore(false)
          setInvoices(items)
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error)
        setInvoices([])
      } finally {
        setLoading(false)
      }
    },
    [activeStatuses, debouncedSearch, clientFilterId]
  )

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [activeStatuses, debouncedSearch, clientFilterId, loadPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const hasActiveFilters = activeStatuses.length > 0 || clientFilterId !== undefined || debouncedSearch.length > 0

  const clearFilters = () => {
    setActiveStatuses([])
    setClientFilterId(undefined)
    setSearchInput("")
    setDebouncedSearch("")
  }

  const toggleStatusFilter = (statusCode: string) => {
    setActiveStatuses((prev) =>
      prev.includes(statusCode) ? prev.filter((s) => s !== statusCode) : [...prev, statusCode]
    )
  }

  const statusLabel = useMemo(() => {
    const map: Record<string, string> = {
      DRAFT: "Draft",
      SENT: "Sent",
      PARTIALLY_PAID: "Partially Paid",
      PAID: "Paid",
      OVERDUE: "Overdue",
      CANCELLED: "Cancelled",
    }
    return (code: string) => map[code] ?? formatStatusLabel(code)
  }, [])

  const statusFilterLabel = useMemo(() => {
    if (activeStatuses.length === 0) return "All Statuses"
    if (activeStatuses.length === 1) return statusLabel(activeStatuses[0])
    return `${activeStatuses.length} statuses`
  }, [activeStatuses, statusLabel])

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background pb-24 md:pb-10">
      <main className="container mx-auto max-w-5xl px-3 py-4 md:px-4 md:py-8">
        {/* Desktop Header */}
        <div className="mb-6 hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </span>
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 pl-0 sm:pl-12">Manage and track your invoices</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm md:mb-5 md:rounded-lg md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by client name or invoice number..."
                className="h-12 rounded-xl bg-background pl-9 text-base shadow-xs md:h-10 md:rounded-lg md:bg-transparent md:text-sm md:shadow-none"
                aria-label="Search invoices"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
              <div className="min-w-[150px] flex-1 md:flex-none">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full min-w-[150px] justify-between rounded-xl bg-background px-3 font-normal md:h-10 md:rounded-lg md:bg-transparent"
                    >
                      <span className="truncate">{statusFilterLabel}</span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[240px]">
                    {STATUS_ORDER.map((code) => (
                      <DropdownMenuCheckboxItem
                        key={code}
                        checked={activeStatuses.includes(code)}
                        onCheckedChange={() => toggleStatusFilter(code)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              code === "PAID"
                                ? "bg-emerald-500"
                                : code === "SENT"
                                  ? "bg-blue-500"
                                  : code === "PARTIALLY_PAID"
                                    ? "bg-orange-500"
                                    : code === "OVERDUE"
                                      ? "bg-red-500"
                                      : code === "DRAFT"
                                        ? "bg-amber-500"
                                        : "bg-muted-foreground/60"
                            }`}
                          />
                          {statusLabel(code)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="min-w-[180px] flex-1 md:flex-none">
                <Select
                  value={clientFilterId != null ? String(clientFilterId) : "all"}
                  onValueChange={(v) => setClientFilterId(v === "all" ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background md:h-10 md:rounded-lg md:bg-transparent">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} textValue={`${c.name} ${c.email}`}>
                        <span className="truncate block">{c.name}</span>
                        <span className="text-muted-foreground text-xs truncate block">{c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" size="sm" className="h-11 rounded-xl px-3 text-xs md:h-10 md:rounded-lg" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="rounded-2xl border-l-4 border-l-muted p-4 animate-pulse md:rounded-xl">
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
        ) : invoices.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/20 p-7 text-center md:p-10">
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                {hasActiveFilters ? "No invoices match your filters" : "No invoices yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters or search query."
                  : "Invoices will appear here once you create them from accepted quotes."}
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" className="mt-2 w-full md:w-auto" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="group relative">
                <Card
                  className={`rounded-2xl border-l-4 border-border/80 bg-card/95 p-4 shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:shadow-md md:rounded-lg md:p-5 md:active:scale-100 ${statusAccentClass(invoice.status)}`}
                  onClick={() => router.push(`${basePath}/${invoice.id}`)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {invoice.invoice_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wide font-semibold border ${statusBadgeClass(invoice.status)}`}
                        >
                          {statusLabel(String(invoice.status))}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {invoice.client_name || "Unknown Client"}
                      </h3>
                      {invoice.title?.trim() && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{invoice.title}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {invoice.client_email && <span className="truncate max-w-full">{invoice.client_email}</span>}
                        {invoice.client_phone && <span>{invoice.client_phone}</span>}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground md:mt-0 md:flex md:flex-wrap md:gap-x-4 md:gap-y-0 md:pt-0.5">
                        <span className="rounded-lg bg-muted/50 px-2 py-1 md:bg-transparent md:p-0">Issued {formatDate(invoice.issue_date)}</span>
                        <span className="rounded-lg bg-muted/50 px-2 py-1 md:bg-transparent md:p-0">Due {formatDate(invoice.due_date)}</span>
                        {invoice.balance_due > 0 && invoice.balance_due < invoice.total_amount && (
                          <span className="col-span-2 rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700 md:bg-transparent md:p-0 md:text-amber-600">
                            Balance: {formatCurrency(invoice.balance_due)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2 sm:flex-col sm:items-end sm:bg-transparent sm:p-0 gap-3 shrink-0">
                      <span className="text-xl font-bold text-primary tabular-nums">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 w-11 rounded-xl p-0 opacity-100 sm:h-8 sm:w-8 sm:rounded-lg sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`${basePath}/${invoice.id}`)
                        }}
                        title="Open"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
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
                  className="h-11 min-w-24 rounded-xl md:h-10 md:rounded-lg"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <span className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground tabular-nums md:bg-transparent">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 min-w-24 rounded-xl md:h-10 md:rounded-lg"
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
    </div>
  )
}
