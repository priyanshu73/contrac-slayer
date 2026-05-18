"use client"

import { useEffect, useState } from "react"
import type { Job, Project } from "@/lib/types"
import { JobStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LinkQuoteDialog } from "./link-quote-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Unlink, FileText, Cloud, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectQuotesProps {
  project: Project
}

type StatusVisual = { dot: string; badge: string }

function quoteStatusVisual(status: string | undefined): StatusVisual {
  const s = String(status ?? "").toUpperCase().split(".").pop() as string
  const map: Record<string, StatusVisual> = {
    [JobStatus.PAID]:              { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    [JobStatus.ACCEPTED]:          { dot: "bg-sky-500",     badge: "bg-sky-50 text-sky-700 border-sky-200" },
    [JobStatus.INVOICED]:          { dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
    [JobStatus.IN_PROGRESS]:       { dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
    [JobStatus.COMPLETED]:         { dot: "bg-teal-500",    badge: "bg-teal-50 text-teal-700 border-teal-200" },
    [JobStatus.SENT]:              { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
    [JobStatus.VIEWED]:            { dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
    [JobStatus.CUSTOMER_MODIFIED]: { dot: "bg-fuchsia-500", badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
    [JobStatus.REJECTED]:          { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
    [JobStatus.CANCELLED]:         { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500 border-slate-200" },
    [JobStatus.DRAFT]:             { dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200" },
  }
  return map[s] ?? { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" }
}

export function ProjectQuotes({ project }: ProjectQuotesProps) {
  const t = useTranslations("projects.quotes")
  const locale = useLocale()
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [unlinking, setUnlinking] = useState<number | null>(null)
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<number | null>(null)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)

  const fetchQuotes = async () => {
    if (!project.id) return
    try {
      setLoading(true)
      const data = await api.getProjectQuotes(project.id)
      setQuotes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuotes() }, [project.id])

  const handleUnlink = async (quoteId: number) => {
    if (!project.id) return
    setUnlinking(quoteId)
    setUnlinkConfirmId(null)
    try {
      await api.unlinkProjectQuote(project.id, quoteId)
      toast({ title: "Quote unlinked." })
      fetchQuotes()
    } catch (err: any) {
      toast({ title: "Failed to unlink quote", description: err.message, variant: "destructive" })
    } finally {
      setUnlinking(null)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  if (!project.id) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Quotes</span>
          {quotes.length > 0 && (
            <span className="rounded-full bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {quotes.length}
            </span>
          )}
          <span className="text-xs text-slate-400 hidden sm:inline">
            — linked to this project
          </span>
        </div>
        <button
          onClick={() => setIsLinkDialogOpen(true)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-all shadow-sm"
        >
          <Plus className="w-3 h-3" />
          Link Quote
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-slate-400">No quotes linked yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {quotes.map((quote) => {
            const vis = quoteStatusVisual(quote.status as string)
            const hasQbo = Boolean(
              (quote.qbo_invoice_id && String(quote.qbo_invoice_id).trim()) ||
              (quote.qbo_invoice_url && String(quote.qbo_invoice_url).trim())
            )
            const displayTitle = quote.title || quote.job_number || `Quote #${quote.id}`

            return (
              <li key={quote.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/${locale}/quotes/${quote.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(`/${locale}/quotes/${quote.id}`)
                    }
                  }}
                  className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Status dot + icon */}
                  <div className="relative shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white", vis.dot)} />
                  </div>

                  {/* Title + client + badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-950">
                        {displayTitle}
                      </span>
                      {quote.client?.name && (
                        <span className="text-xs text-slate-400 truncate">{quote.client.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {quote.status && (
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", vis.badge)}>
                          {String(quote.status).replace(/_/g, " ")}
                        </span>
                      )}
                      {hasQbo && (
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border border-cyan-200 bg-cyan-50 text-cyan-700">
                          <Cloud className="h-2.5 w-2.5" />
                          QuickBooks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + unlink */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {quote.total_amount != null ? fmt(quote.total_amount) : "—"}
                    </span>
                    {unlinking === quote.id ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Unlinking…</span>
                      </span>
                    ) : (
                      <Popover
                        open={unlinkConfirmId === quote.id}
                        onOpenChange={(open) => {
                          if (!open) setUnlinkConfirmId(null)
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnlinkConfirmId(quote.id)
                            }}
                            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
                            title="Unlink"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Unlink</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="end"
                          className="w-auto p-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs text-slate-600 mb-2 font-medium">Unlink this quote?</p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={(e) => { e.stopPropagation(); setUnlinkConfirmId(null) }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2.5 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleUnlink(quote.id) }}
                            >
                              Unlink
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <LinkQuoteDialog
        projectId={project.id}
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onLinked={() => fetchQuotes()}
      />
    </div>
  )
}
