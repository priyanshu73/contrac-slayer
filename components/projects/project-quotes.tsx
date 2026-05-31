"use client"

import { useEffect, useState } from "react"
import type { Job, Project } from "@/lib/types"
import { JobStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LinkQuoteDialog } from "./link-quote-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, FileText, Cloud, Plus, Pencil, Trash2, Unlink, MoreHorizontal, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectQuotesProps {
  project: Project
}

type StatusVisual = { dot: string; badge: string }

function quoteStatusVisual(status: string | undefined): StatusVisual {
  const s = String(status ?? "").toUpperCase().split(".").pop() as string
  const map: Record<string, StatusVisual> = {
    [JobStatus.PAID]:              { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    [JobStatus.ACCEPTED]:          { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" },
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
  const [deleting, setDeleting] = useState<number | null>(null)
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

  useEffect(() => { fetchQuotes() }, [project.id, project.client_id])

  const handleUnlink = async (quoteId: number) => {
    if (!project.id) return
    setUnlinking(quoteId)
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

  const handleDelete = async (quoteId: number) => {
    setDeleting(quoteId)
    try {
      await api.deleteJob(quoteId)
      toast({ title: `Quote #${quoteId} deleted.` })
      fetchQuotes()
    } catch (err: any) {
      toast({ title: "Failed to delete quote", description: err.message, variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  if (!project.id) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Quotes</span>
          {quotes.length > 0 && (
            <span className="rounded-md bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 leading-none">
              {quotes.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLinkDialogOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Link Existing
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams()
              params.set("projectId", String(project.id))
              if (project.client_id != null) {
                params.set("clientId", String(project.client_id))
              }
              router.push(`/${locale}/quotes/new?${params.toString()}`)
            }}
            className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">No quotes yet</p>
          <p className="text-xs text-slate-400">Create or link a quote to this project</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-3 pb-3">
          {quotes.map((quote) => {
            const vis = quoteStatusVisual(quote.status as string)
            const hasQbo = Boolean(
              (quote.qbo_invoice_id && String(quote.qbo_invoice_id).trim()) ||
              (quote.qbo_invoice_url && String(quote.qbo_invoice_url).trim())
            )
            const quoteNumber = quote.job_number ? `Quote #${quote.job_number}` : `Quote #${quote.id}`
            const description = quote.title && quote.title !== quoteNumber ? quote.title : ""

            const isBusy = deleting === quote.id || unlinking === quote.id

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
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>

                  {/* Title + description + badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{quoteNumber}</span>
                      {description && (
                        <span className="text-xs text-slate-400 truncate">{description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {quote.status && (
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", vis.badge)}>
                          {String(quote.status).split(".").pop()?.replace(/_/g, " ")}
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

                  {/* Amount */}
                  <span className="text-sm font-bold tabular-nums text-slate-900 shrink-0">
                    {quote.total_amount != null ? fmt(quote.total_amount) : "—"}
                  </span>

                  {/* Actions menu */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => router.push(`/${locale}/quotes/${quote.id}/edit`)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUnlink(quote.id)}
                            className="text-amber-600 focus:text-amber-700"
                          >
                            <Unlink className="w-3.5 h-3.5 mr-2" />
                            Unlink
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(quote.id)}
                            className="text-rose-600 focus:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
