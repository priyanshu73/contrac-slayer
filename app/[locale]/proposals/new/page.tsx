"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/api"
import type { ProposalDocument } from "@/lib/types"

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
  project_type?: string | null
  proposal_document?: ProposalDocument | null
}

const ITEMS_PER_PAGE = 10

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "bg-amber-500/15 text-amber-700"
    case "SENT":
      return "bg-blue-500/15 text-blue-700"
    case "VIEWED":
      return "bg-violet-500/15 text-violet-700"
    case "ACCEPTED":
      return "bg-emerald-500/15 text-emerald-700"
    case "REJECTED":
      return "bg-rose-500/15 text-rose-700"
    case "IN_PROGRESS":
      return "bg-sky-500/15 text-sky-700"
    case "COMPLETED":
      return "bg-teal-500/15 text-teal-700"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatStatusLabel(status: string) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function NewProposalPage() {
  const router = useRouter()
  const locale = useLocale()
  const tDashboard = useTranslations("dashboard")
  const tFilters = useTranslations("filters")
  const isMobile = useIsMobile()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setCurrentPage(1)
    void fetchQuotes(1, activeFilter)
  }, [activeFilter])

  const fetchQuotes = async (page: number, statusFilter = activeFilter) => {
    try {
      setLoading(true)
      const skip = (page - 1) * ITEMS_PER_PAGE
      const data = (await api.getMyJobs(statusFilter, skip, ITEMS_PER_PAGE + 1)) as Quote[]

      if (data.length > ITEMS_PER_PAGE) {
        setHasMore(true)
        setQuotes(data.slice(0, ITEMS_PER_PAGE))
      } else {
        setHasMore(false)
        setQuotes(data)
      }
    } catch (error) {
      console.error("Failed to fetch quotes for proposal builder:", error)
      setHasMore(false)
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    void fetchQuotes(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openProposalBuilder = (quoteId: number) => {
    router.push(`/${locale}/quotes/${quoteId}/proposal`)
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
              <h1 className="hidden items-center gap-2 text-lg font-semibold leading-none md:flex">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {tDashboard("proposalSelector.title")}
              </h1>
              <p className="text-sm text-muted-foreground md:mt-1">
                {tDashboard("proposalSelector.description")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-6">
        <Card className="mb-4 p-3">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            {isMobile ? (
              <Select
                value={activeFilter || "all"}
                onValueChange={(value) => setActiveFilter(value === "all" ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{activeFilter ? tFilters(activeFilter.toLowerCase() as any) : tFilters("all")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tFilters("all")}</SelectItem>
                  <SelectItem value="DRAFT">{tFilters("draft")}</SelectItem>
                  <SelectItem value="SENT">{tFilters("sent")}</SelectItem>
                  <SelectItem value="ACCEPTED">{tFilters("accepted")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={activeFilter === undefined ? "default" : "outline"} onClick={() => setActiveFilter(undefined)} size="sm">
                  {tFilters("all")}
                </Button>
                <Button variant={activeFilter === "DRAFT" ? "default" : "outline"} onClick={() => setActiveFilter("DRAFT")} size="sm">
                  {tFilters("draft")}
                </Button>
                <Button variant={activeFilter === "SENT" ? "default" : "outline"} onClick={() => setActiveFilter("SENT")} size="sm">
                  {tFilters("sent")}
                </Button>
                <Button variant={activeFilter === "ACCEPTED" ? "default" : "outline"} onClick={() => setActiveFilter("ACCEPTED")} size="sm">
                  {tFilters("accepted")}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <Card key={item} className="p-4">
                <div className="flex animate-pulse justify-between">
                  <div className="h-5 w-1/3 rounded bg-muted" />
                  <div className="h-5 w-20 rounded bg-muted" />
                </div>
                <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
              </Card>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-semibold">{tDashboard("proposalSelector.emptyTitle")}</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {tDashboard("proposalSelector.emptyDescription")}
                </p>
                <Button size="sm" asChild>
                  <Link href={`/${locale}/quotes/new`}>{tDashboard("createQuote")}</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => {
              const hasProposal = Boolean(quote.proposal_document)

              return (
                <Card
                  key={quote.id}
                  className="group cursor-pointer p-4 transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => openProposalBuilder(quote.id)}
                >
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                          {quote.title || quote.project_type || quote.client?.name || `Quote #${quote.id}`}
                        </h3>
                        <Badge className={`shrink-0 px-1.5 py-0 text-[10px] ${getStatusColor(quote.status)}`}>
                          {formatStatusLabel(quote.status)}
                        </Badge>
                        {hasProposal ? (
                          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-700">
                            {tDashboard("proposalSelector.saved")}
                          </Badge>
                        ) : null}
                      </div>
                      {quote.client?.name ? (
                        <p className="mb-1 text-sm text-muted-foreground">{quote.client.name}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {tDashboard("proposalSelector.created")} {formatDate(quote.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-base font-semibold tabular-nums text-right">
                        {formatCurrency(quote.total_amount)}
                      </span>
                      <Button variant="secondary" size="sm" className="h-8 shadow-sm">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        {hasProposal
                          ? tDashboard("proposalSelector.edit")
                          : tDashboard("proposalSelector.select")}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}

            {(currentPage > 1 || hasMore) ? (
              <div className="mt-6 flex items-center justify-center gap-2 border-t pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <span className="px-4 text-sm text-muted-foreground">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}
