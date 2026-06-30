"use client"

import { useEffect, useMemo, useState } from "react"
import type { Job, Proposal, Project } from "@/lib/types"
import { JobStatus } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LinkQuoteDialog } from "./link-quote-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, FileText, ReceiptText, Cloud, Plus, Pencil, Trash2, Unlink,
  MoreHorizontal, Link2, Eye, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectRecordsProps {
  project: Project
}

type DocKind = "quote" | "proposal" | "invoice"

interface DocItem {
  kind: DocKind
  id: number
  title: string
  subtitle?: string
  status?: string
  amount?: number | null
  balanceDue?: number
  dateIso?: string | null
  hasQbo?: boolean
  raw: any
}

const KIND_LABEL: Record<DocKind, string> = {
  quote: "Quote",
  proposal: "Proposal",
  invoice: "Invoice",
}

function statusBadge(kind: DocKind, status: string | undefined): string {
  const s = String(status ?? "").toUpperCase().split(".").pop() as string
  const map: Record<string, string> = {
    // shared
    DRAFT:             "bg-slate-50 text-slate-500 border-slate-200",
    SENT:              "bg-amber-50 text-amber-700 border-amber-200",
    PENDING:           "bg-amber-50 text-amber-700 border-amber-200",
    VIEWED:            "bg-sky-50 text-sky-700 border-sky-200",
    PAID:              "bg-emerald-50 text-emerald-700 border-emerald-200",
    PARTIALLY_PAID:    "bg-sky-50 text-sky-700 border-sky-200",
    OVERDUE:           "bg-rose-50 text-rose-700 border-rose-200",
    ACCEPTED:          "bg-emerald-50 text-emerald-600 border-emerald-200",
    INVOICED:          "bg-violet-50 text-violet-700 border-violet-200",
    IN_PROGRESS:       "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED:         "bg-teal-50 text-teal-700 border-teal-200",
    CUSTOMER_MODIFIED: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    REJECTED:          "bg-rose-50 text-rose-700 border-rose-200",
    CANCELLED:         "bg-slate-100 text-slate-500 border-slate-200",
  }
  return map[s] ?? "bg-indigo-50 text-indigo-700 border-indigo-200"
}

const FILTERS: { key: "all" | DocKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quote", label: "Quotes" },
  { key: "proposal", label: "Proposals" },
  { key: "invoice", label: "Invoices" },
]

export function ProjectRecords({ project }: ProjectRecordsProps) {
  const locale = useLocale()
  const router = useRouter()
  const { toast } = useToast()

  const [quotes, setQuotes] = useState<Job[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | DocKind>("all")
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)

  const fetchAll = async () => {
    if (!project.id) return
    try {
      setLoading(true)
      const [q, p, i] = await Promise.all([
        api.getProjectQuotes(project.id).catch(() => []),
        api.getProjectProposals(project.id).catch(() => []),
        api.getProjectInvoices(project.id).catch(() => []),
      ])
      setQuotes(Array.isArray(q) ? q : [])
      setProposals(Array.isArray(p) ? p : [])
      setInvoices(Array.isArray(i) ? i : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [project.id, project.client_id])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  // ── Normalize all three into a single sortable list ──────────────────
  const items: DocItem[] = useMemo(() => {
    const quoteItems: DocItem[] = quotes.map((q) => {
      const label = q.job_number ? `Quote #${q.job_number}` : `Quote #${q.id}`
      return {
        kind: "quote",
        id: q.id,
        title: label,
        subtitle: q.title && q.title !== label ? q.title : undefined,
        status: q.status as string,
        amount: q.total_amount ?? null,
        dateIso: (q as any).updated_at || (q as any).created_at,
        hasQbo: Boolean(
          (q.qbo_invoice_id && String(q.qbo_invoice_id).trim()) ||
          (q.qbo_invoice_url && String(q.qbo_invoice_url).trim())
        ),
        raw: q,
      }
    })

    const proposalItems: DocItem[] = proposals.map((p) => ({
      kind: "proposal",
      id: p.id,
      title: p.title || `Proposal #${p.id}`,
      status: p.status,
      amount: null,
      dateIso: p.updated_at || p.created_at,
      raw: p,
    }))

    const invoiceItems: DocItem[] = invoices.map((inv) => {
      const label = `Invoice ${inv.invoice_number}`
      return {
        kind: "invoice",
        id: inv.id,
        title: label,
        subtitle: inv.title && inv.title !== label ? inv.title : undefined,
        status: inv.status,
        amount: inv.total_amount ?? null,
        balanceDue: inv.balance_due ?? 0,
        dateIso: inv.created_at,
        raw: inv,
      }
    })

    const all = [...quoteItems, ...proposalItems, ...invoiceItems]
    all.sort((a, b) => {
      const ta = a.dateIso ? new Date(a.dateIso).getTime() : 0
      const tb = b.dateIso ? new Date(b.dateIso).getTime() : 0
      return tb - ta
    })
    return all
  }, [quotes, proposals, invoices])

  const counts = useMemo(() => ({
    all: items.length,
    quote: quotes.length,
    proposal: proposals.length,
    invoice: invoices.length,
  }), [items.length, quotes.length, proposals.length, invoices.length])

  const visible = filter === "all" ? items : items.filter((d) => d.kind === filter)

  // ── Navigation ───────────────────────────────────────────────────────
  const openItem = (d: DocItem) => {
    if (d.kind === "quote") router.push(`/${locale}/quotes/${d.id}`)
    else if (d.kind === "proposal") router.push(`/${locale}/projects/${project.id}/proposals/${d.id}`)
    else router.push(`/${locale}/invoices/${d.id}`)
  }

  // ── Actions ──────────────────────────────────────────────────────────
  const newQuote = () => {
    const params = new URLSearchParams()
    params.set("projectId", String(project.id))
    if (project.client_id != null) params.set("clientId", String(project.client_id))
    router.push(`/${locale}/quotes/new?${params.toString()}`)
  }

  const newProposal = async () => {
    try {
      const created = await api.createProposal(project.id, {}) as Proposal
      router.push(`/${locale}/projects/${project.id}/proposals/${created.id}`)
    } catch (err: any) {
      toast({ title: "Failed to create proposal", description: err.message, variant: "destructive" })
    }
  }

  const unlinkQuote = async (quoteId: number) => {
    if (!project.id) return
    setBusyId(`quote-${quoteId}`)
    try {
      await api.unlinkProjectQuote(project.id, quoteId)
      toast({ title: "Quote unlinked." })
      fetchAll()
    } catch (err: any) {
      toast({ title: "Failed to unlink quote", description: err.message, variant: "destructive" })
    } finally { setBusyId(null) }
  }

  const deleteQuote = async (quoteId: number) => {
    setBusyId(`quote-${quoteId}`)
    try {
      await api.deleteJob(quoteId)
      toast({ title: `Quote #${quoteId} deleted.` })
      fetchAll()
    } catch (err: any) {
      toast({ title: "Failed to delete quote", description: err.message, variant: "destructive" })
    } finally { setBusyId(null) }
  }

  const deleteProposal = async (proposalId: number) => {
    setBusyId(`proposal-${proposalId}`)
    try {
      await api.deleteProposal(project.id, proposalId)
      toast({ title: `Proposal #${proposalId} deleted.` })
      fetchAll()
    } catch (err: any) {
      toast({ title: "Failed to delete proposal", description: err.message, variant: "destructive" })
    } finally { setBusyId(null) }
  }

  if (!project.id) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header: title + actions */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <span className="text-base font-bold text-slate-900">Documents</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLinkDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-3 pr-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900 hover:shadow-md active:scale-[0.97] transition-all"
          >
            <Link2 className="w-4 h-4" />
            Link existing
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-indigo-600 pl-3 pr-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 ring-1 ring-indigo-600/20 hover:bg-indigo-500 hover:shadow-md active:scale-[0.97] transition-all">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                New
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={newQuote}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                New quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={newProposal}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                New proposal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-5 pb-3 overflow-x-auto">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key
          const count = counts[key]
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {label}
              <span className={cn(
                "rounded-md px-1.5 text-[10px] leading-none py-0.5 font-bold",
                active ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">
            {filter === "all" ? "Nothing here yet" : `No ${filter}s yet`}
          </p>
          <p className="text-xs text-slate-400">Create a quote, proposal, or invoice to get started</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-3 pb-3">
          {visible.map((d) => {
            const Icon = d.kind === "invoice" ? ReceiptText : FileText
            const hasBalance =
              d.kind === "invoice" && (d.balanceDue ?? 0) > 0 &&
              String(d.status).toUpperCase() !== "CANCELLED"
            const busy = busyId === `${d.kind}-${d.id}`

            return (
              <li key={`${d.kind}-${d.id}`}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(d) }
                  }}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{d.title}</span>
                      {d.subtitle && (
                        <span className="text-xs text-slate-400 truncate">{d.subtitle}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {KIND_LABEL[d.kind]}
                      </span>
                      {d.status && (
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", statusBadge(d.kind, d.status))}>
                          {String(d.status).split(".").pop()?.replace(/_/g, " ")}
                        </span>
                      )}
                      {hasBalance && (
                        <span className="text-[10px] text-slate-400">{fmt(d.balanceDue!)} due</span>
                      )}
                      {d.hasQbo && (
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border border-cyan-200 bg-cyan-50 text-cyan-700">
                          <Cloud className="h-2.5 w-2.5" />
                          QuickBooks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount or date */}
                  {d.amount != null ? (
                    <span className="text-sm font-bold tabular-nums text-slate-900 shrink-0">
                      {fmt(d.amount)}
                    </span>
                  ) : d.dateIso ? (
                    <span className="text-xs tabular-nums text-slate-400 shrink-0">
                      {new Date(d.dateIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : null}

                  {/* Actions menu (quotes & proposals; invoices are view-only) */}
                  {d.kind !== "invoice" && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {d.kind === "quote" ? (
                              <>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/quotes/${d.id}/edit`)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => unlinkQuote(d.id)} className="text-amber-600 focus:text-amber-700">
                                  <Unlink className="w-3.5 h-3.5 mr-2" />
                                  Unlink
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteQuote(d.id)} className="text-rose-600 focus:text-rose-700">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/projects/${project.id}/proposals/${d.id}`)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${locale}/projects/${project.id}/proposals/${d.id}/preview`)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteProposal(d.id)} className="text-rose-600 focus:text-rose-700">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
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
        onLinked={() => fetchAll()}
      />
    </div>
  )
}
