"use client"

import { useEffect, useState } from "react"
import type { Job, Project } from "@/lib/types"
import { JobStatus } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LinkQuoteDialog } from "./link-quote-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Unlink, FileText, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectQuotesProps {
  project: Project
}

type StatusVisual = {
  border: string
  rowBg: string
  iconWrap: string
  badge: string
}

function quoteStatusVisual(status: string | undefined): StatusVisual {
  const s = String(status ?? "")
    .toUpperCase()
    .split(".")
    .pop() as string

  const map: Record<string, StatusVisual> = {
    [JobStatus.PAID]: {
      border: "border-l-emerald-500",
      rowBg: "bg-gradient-to-r from-emerald-50/90 to-white hover:from-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200/60",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200/80 shadow-none",
    },
    [JobStatus.ACCEPTED]: {
      border: "border-l-sky-500",
      rowBg: "bg-gradient-to-r from-sky-50/90 to-white hover:from-sky-50",
      iconWrap: "bg-sky-100 text-sky-700 ring-sky-200/60",
      badge: "bg-sky-100 text-sky-800 border-sky-200/80 shadow-none",
    },
    [JobStatus.INVOICED]: {
      border: "border-l-violet-500",
      rowBg: "bg-gradient-to-r from-violet-50/90 to-white hover:from-violet-50",
      iconWrap: "bg-violet-100 text-violet-700 ring-violet-200/60",
      badge: "bg-violet-100 text-violet-800 border-violet-200/80 shadow-none",
    },
    [JobStatus.IN_PROGRESS]: {
      border: "border-l-blue-500",
      rowBg: "bg-gradient-to-r from-blue-50/80 to-white hover:from-blue-50",
      iconWrap: "bg-blue-100 text-blue-700 ring-blue-200/60",
      badge: "bg-blue-100 text-blue-800 border-blue-200/80 shadow-none",
    },
    [JobStatus.COMPLETED]: {
      border: "border-l-teal-500",
      rowBg: "bg-gradient-to-r from-teal-50/80 to-white hover:from-teal-50",
      iconWrap: "bg-teal-100 text-teal-700 ring-teal-200/60",
      badge: "bg-teal-100 text-teal-800 border-teal-200/80 shadow-none",
    },
    [JobStatus.SENT]: {
      border: "border-l-amber-500",
      rowBg: "bg-gradient-to-r from-amber-50/80 to-white hover:from-amber-50",
      iconWrap: "bg-amber-100 text-amber-800 ring-amber-200/60",
      badge: "bg-amber-100 text-amber-900 border-amber-200/80 shadow-none",
    },
    [JobStatus.VIEWED]: {
      border: "border-l-orange-400",
      rowBg: "bg-gradient-to-r from-orange-50/70 to-white hover:from-orange-50",
      iconWrap: "bg-orange-100 text-orange-800 ring-orange-200/60",
      badge: "bg-orange-100 text-orange-900 border-orange-200/80 shadow-none",
    },
    [JobStatus.CUSTOMER_MODIFIED]: {
      border: "border-l-fuchsia-500",
      rowBg: "bg-gradient-to-r from-fuchsia-50/70 to-white hover:from-fuchsia-50",
      iconWrap: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200/60",
      badge: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200/80 shadow-none",
    },
    [JobStatus.REJECTED]: {
      border: "border-l-rose-500",
      rowBg: "bg-gradient-to-r from-rose-50/80 to-white hover:from-rose-50",
      iconWrap: "bg-rose-100 text-rose-700 ring-rose-200/60",
      badge: "bg-rose-100 text-rose-800 border-rose-200/80 shadow-none",
    },
    [JobStatus.CANCELLED]: {
      border: "border-l-slate-400",
      rowBg: "bg-gradient-to-r from-slate-100/90 to-white hover:from-slate-100",
      iconWrap: "bg-slate-200 text-slate-600 ring-slate-300/60",
      badge: "bg-slate-200 text-slate-700 border-slate-300/80 shadow-none",
    },
    [JobStatus.DRAFT]: {
      border: "border-l-slate-400",
      rowBg: "bg-gradient-to-r from-slate-50 to-white hover:from-slate-100/80",
      iconWrap: "bg-slate-100 text-slate-600 ring-slate-200/80",
      badge: "bg-slate-100 text-slate-700 border-slate-200 shadow-none",
    },
  }

  return (
    map[s] ?? {
      border: "border-l-indigo-400",
      rowBg: "bg-gradient-to-r from-indigo-50/60 to-white hover:from-indigo-50/90",
      iconWrap: "bg-indigo-100 text-indigo-700 ring-indigo-200/60",
      badge: "bg-indigo-50 text-indigo-800 border-indigo-200/80 shadow-none",
    }
  )
}

export function ProjectQuotes({ project }: ProjectQuotesProps) {
  const t = useTranslations("projects.quotes")
  const locale = useLocale()
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
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

  useEffect(() => {
    fetchQuotes()
  }, [project.id])

  const handleUnlink = async (quoteId: number) => {
    if (!project.id) return
    const confirmed = window.confirm("Are you sure you want to unlink the quote from this project?")
    if (!confirmed) return

    setUnlinking(true)
    try {
      await api.unlinkProjectQuote(project.id, quoteId)
      toast({ title: "Quote unlinked successfully." })
      fetchQuotes()
    } catch (err: any) {
      toast({
        title: "Failed to unlink quote",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setUnlinking(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  if (!project.id) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        Project ID is required.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-md shadow-slate-200/40">
      <div className="relative border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-sky-50/40 px-4 py-3.5 sm:px-5">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-indigo-500" aria-hidden />
        <div className="pl-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 text-sky-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  {t("title") || "Associated Quotes"}
                </h3>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-0 border-0"
                >
                  {quotes.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quotes linked to this project — open to edit or view the contract.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            onClick={() => setIsLinkDialogOpen(true)}
          >
            {t("linkQuote") || "Link Quote"}
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <p className="text-sm">{t("loading") || "Loading quotes..."}</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">{t("empty") || "No quotes are linked to this project yet."}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Link an existing quote to track contracts and documents here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
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
                    className={cn(
                      "group relative flex flex-col gap-3 rounded-xl border border-slate-200/90 pl-1 pr-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:pr-3 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:border-slate-300/90",
                      "border-l-4",
                      vis.border,
                      vis.rowBg
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 pl-2 sm:pl-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
                          vis.iconWrap
                        )}
                      >
                        <FileText className="h-5 w-5 opacity-90" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-950">
                          {displayTitle}
                        </p>
                        {quote.client?.name && (
                          <p className="text-xs font-medium text-sky-700/90 truncate mt-0.5">{quote.client.name}</p>
                        )}
                        {quote.job_description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {quote.job_description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {quote.status && (
                            <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wide", vis.badge)}>
                              {String(quote.status).replace(/_/g, " ")}
                            </Badge>
                          )}
                          {hasQbo && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/90 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-800">
                              <Cloud className="h-3 w-3" />
                              QuickBooks
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200/60 pt-2 pl-[3.25rem] sm:border-t-0 sm:pt-0 sm:pl-0">
                      <p className="text-base font-bold tabular-nums text-slate-900 sm:text-right sm:min-w-[7rem]">
                        {quote.total_amount != null ? fmt(quote.total_amount) : "—"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnlink(quote.id)
                        }}
                        disabled={unlinking}
                        className="text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold h-9 px-2.5"
                        title="Unlink Quote"
                      >
                        {unlinking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Unlink className="w-3.5 h-3.5 mr-1" />
                            Unlink
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <LinkQuoteDialog
        projectId={project.id}
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onLinked={() => fetchQuotes()}
      />
    </Card>
  )
}
