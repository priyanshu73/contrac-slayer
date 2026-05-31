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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { FileText, Plus, Search, Trash2, ChevronDown, FolderOpen, Unlink } from "lucide-react"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"

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
  project_id?: number | null
  project_title?: string | null
  has_proposal?: boolean
}

const ITEMS_PER_PAGE = 10

const STATUS_ORDER = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
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
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])
  const [hasProposalFilter, setHasProposalFilter] = useState(false)
  const [clientFilterId, setClientFilterId] = useState<number | undefined>(undefined)
  const [projectFilterId, setProjectFilterId] = useState<number | undefined>(undefined)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [projects, setProjects] = useState<{ id: number; title: string }[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [quoteForProject, setQuoteForProject] = useState<Quote | null>(null)
  const [createProjectForQuote, setCreateProjectForQuote] = useState(false)
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

  useEffect(() => {
    let cancelled = false
    api
      .getProjects({ limit: 500 })
      .then((raw) => {
        if (cancelled) return
        const arr = Array.isArray(raw) ? raw : []
        const mapped = arr
          .map((p: { id: number; title: string }) => ({ id: p.id, title: p.title }))
          .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
        setProjects(mapped)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
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
        const selectedStatuses = STATUS_ORDER.filter((code) => activeStatuses.includes(code))

        const proposalParam = hasProposalFilter ? true : undefined

        if (selectedStatuses.length <= 1) {
          const statusFilter = selectedStatuses[0]
          const data = (await api.getMyJobs(
            statusFilter,
            skip,
            ITEMS_PER_PAGE + 1,
            clientFilterId,
            debouncedSearch || undefined,
            projectFilterId,
            proposalParam
          )) as Quote[]

          if (data.length > ITEMS_PER_PAGE) {
            setHasMore(true)
            setQuotes(data.slice(0, ITEMS_PER_PAGE))
          } else {
            setHasMore(false)
            setQuotes(data)
          }
          return
        }

        const batchSize = 100
        const maxBatches = 10
        let cursor = 0
        let allJobs: Quote[] = []

        for (let i = 0; i < maxBatches; i++) {
          const chunk = (await api.getMyJobs(
            undefined,
            cursor,
            batchSize,
            clientFilterId,
            debouncedSearch || undefined,
            projectFilterId,
            proposalParam
          )) as Quote[]
          allJobs = allJobs.concat(chunk)
          if (chunk.length < batchSize) break
          cursor += batchSize
        }

        const filtered = allJobs.filter((quote) =>
          selectedStatuses.some((statusCode) => statusCode === String(quote.status).toUpperCase())
        )
        setQuotes(filtered.slice(skip, skip + ITEMS_PER_PAGE))
        setHasMore(skip + ITEMS_PER_PAGE < filtered.length)
      } catch (error) {
        console.error("Failed to fetch quotes:", error)
      } finally {
        setLoading(false)
      }
    },
    [activeStatuses, debouncedSearch, clientFilterId, projectFilterId, hasProposalFilter]
  )

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [activeStatuses, debouncedSearch, clientFilterId, projectFilterId, hasProposalFilter, loadPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const hasActiveFilters = activeStatuses.length > 0 || hasProposalFilter || clientFilterId !== undefined || projectFilterId !== undefined || debouncedSearch.length > 0

  const clearFilters = () => {
    setActiveStatuses([])
    setHasProposalFilter(false)
    setClientFilterId(undefined)
    setProjectFilterId(undefined)
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

  const statusFilterLabel = useMemo(() => {
    const parts: string[] = []
    if (activeStatuses.length === 1) parts.push(statusLabel(activeStatuses[0]))
    else if (activeStatuses.length > 1) parts.push(`${activeStatuses.length} statuses`)
    if (hasProposalFilter) parts.push("Has proposal")
    if (parts.length === 0) return tFilters("all")
    return parts.join(" · ")
  }, [activeStatuses, hasProposalFilter, statusLabel, tFilters])

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

  const handleLinkQuoteToProject = async (quote: Quote, projectId: number, projectTitle: string) => {
    try {
      await api.updateJob(quote.id, { project_id: projectId })
      setQuotes((prev) =>
        prev.map((q) => q.id === quote.id ? { ...q, project_id: projectId, project_title: projectTitle } : q)
      )
      toast({ title: "Quote linked to project" })
    } catch {
      toast({ title: "Failed to link quote to project", variant: "destructive" })
    }
  }

  const handleUnlinkQuoteFromProject = async (quote: Quote) => {
    if (!quote.project_id) return
    try {
      await api.unlinkProjectQuote(quote.project_id, quote.id)
      setQuotes((prev) =>
        prev.map((q) => q.id === quote.id ? { ...q, project_id: null, project_title: null } : q)
      )
      toast({ title: "Quote unlinked from project" })
    } catch {
      toast({ title: "Failed to unlink quote from project", variant: "destructive" })
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
      <main className="container mx-auto max-w-5xl px-3 py-4 md:px-4 md:py-8">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between md:hidden">
          <p className="text-sm text-muted-foreground">{tQuotes("listSubtitle")}</p>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild size="sm" className="w-full gap-1.5 rounded-xl sm:w-auto">
              <a href={`${basePath}/new`}>
                <Plus className="h-4 w-4" />
                New Quote
              </a>
            </Button>
          </div>
        </div>
        <div className="mb-6 hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex">
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
            <Button asChild size="sm" className="gap-1.5">
              <a href={`${basePath}/new`}>
                <Plus className="h-4 w-4" />
                New Quote
              </a>
            </Button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tQuotes("searchPlaceholder")}
                className="h-12 rounded-xl bg-background pl-9 text-base shadow-xs md:h-10 md:rounded-md md:bg-transparent md:text-sm md:shadow-none"
                aria-label={tQuotes("searchPlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
              <div className="min-w-[150px] flex-1 md:flex-none">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full min-w-[150px] justify-between rounded-xl bg-background px-3 font-normal md:h-10 md:rounded-md md:bg-transparent"
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
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={hasProposalFilter}
                      onCheckedChange={(checked) => setHasProposalFilter(checked === true)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        Has proposal
                      </span>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="min-w-[180px] flex-1 md:flex-none">
                <Select
                  value={clientFilterId != null ? String(clientFilterId) : "all"}
                  onValueChange={(v) => setClientFilterId(v === "all" ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background md:h-10 md:rounded-md md:bg-transparent">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="all">{tQuotes("allClients")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} textValue={c.name}>
                        <span className="truncate block">{c.name}</span>
                        <span className="text-muted-foreground text-xs truncate block">{c.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px] flex-1 md:flex-none">
                <Select
                  value={projectFilterId != null ? String(projectFilterId) : "all"}
                  onValueChange={(v) => setProjectFilterId(v === "all" ? undefined : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background md:h-10 md:rounded-md md:bg-transparent">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} textValue={p.title}>
                        <span className="truncate block">{p.title}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" size="sm" className="h-11 rounded-xl px-3 text-xs md:h-10 md:rounded-md" onClick={clearFilters}>
                  {tQuotes("clearFilters")}
                </Button>
              )}
            </div>
          </div>
        </div>

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
        ) : quotes.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/20 p-7 text-center md:p-10">
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{hasActiveFilters ? tQuotes("noMatches") : "No quotes yet"}</h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? tQuotes("tryAdjustFilters") : "Create your first quote to get started."}
              </p>
              {!hasActiveFilters && (
                <Button size="sm" asChild className="mt-2 w-full md:w-auto">
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
                  className={`rounded-2xl border-l-4 border-border/80 bg-card/95 px-3 py-2.5 shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:shadow-md md:rounded-xl md:px-4 md:py-3 md:active:scale-100 ${statusAccentClass(quote.status)}`}
                  onClick={() => router.push(`${basePath}/${quote.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {quote.project_id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 hover:bg-sky-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FolderOpen className="h-2.5 w-2.5" />
                                {quote.project_title || "Project"}
                                <ChevronDown className="h-2 w-2 opacity-70" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/${locale}/projects/${quote.project_id}`)
                                }}
                              >
                                <FolderOpen className="mr-2 h-3.5 w-3.5" />
                                View Project
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUnlinkQuoteFromProject(quote)
                                }}
                              >
                                <Unlink className="mr-2 h-3.5 w-3.5" />
                                Unlink
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Project
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
                              {projects.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Link to existing project</div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {projects.map((p) => (
                                      <DropdownMenuItem
                                        key={p.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleLinkQuoteToProject(quote, p.id, p.title)
                                        }}
                                      >
                                        <FolderOpen className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="truncate">{p.title}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setQuoteForProject(quote)
                                  setCreateProjectForQuote(true)
                                }}
                              >
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Create New Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
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
                      <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(quote.total_amount)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-[5.6px] -right-[5.6px] h-5 w-5 rounded-full z-10 p-0 opacity-0 group-hover:opacity-100 group-hover:bg-background group-hover:text-muted-foreground group-hover:shadow-sm hover:bg-destructive hover:text-white transition-all"
                    onClick={(e) => handleDeleteClick(e, quote)}
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </Card>
              </div>
            ))}

            {(currentPage > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-2 pt-6 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 min-w-24 rounded-xl md:h-8 md:min-w-0 md:rounded-md"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <span className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground tabular-nums md:bg-transparent">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 min-w-24 rounded-xl md:h-8 md:min-w-0 md:rounded-md"
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

      {quoteForProject && (
        <NewProjectDialog
          open={createProjectForQuote}
          onOpenChange={(open) => {
            setCreateProjectForQuote(open)
            if (!open) setQuoteForProject(null)
          }}
          fromQuote={{
            jobId: quoteForProject.id,
            title: quoteForProject.title || "",
            clientId: quoteForProject.client_id,
            contractValue: quoteForProject.total_amount,
          }}
          onProjectCreated={(projectId) => {
            setQuotes((prev) =>
              prev.map((q) =>
                q.id === quoteForProject.id
                  ? { ...q, project_id: projectId }
                  : q
              )
            )
            setCreateProjectForQuote(false)
            setQuoteForProject(null)
            api.getProjects({ limit: 500 }).then((raw) => {
              const arr = Array.isArray(raw) ? raw : []
              setProjects(arr.map((p: { id: number; title: string }) => ({ id: p.id, title: p.title })).sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })))
            }).catch(() => {})
          }}
        />
      )}

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
