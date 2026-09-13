"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import {
  FolderKanban,
  FileText,
  Receipt,
  Plus,
} from "lucide-react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/dashboard/global-search"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import type { DashboardSummary } from "@/lib/types/dashboard"
import type { Invoice, ProjectListItem } from "@/lib/types"

interface QuoteItem {
  id: number
  client?: { id: number; name: string } | null
  status: string
  total_amount: number
  title?: string | null
  project_type?: string | null
  created_at?: string
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function getProjectStatusBadge(status?: string) {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "IN_PROGRESS":
      return { label: "In Progress", className: "bg-sky-50 text-sky-700 border-sky-200" }
    case "ON_HOLD":
      return { label: "On Hold", className: "bg-amber-50 text-amber-700 border-amber-200" }
    case "PLANNING":
      return { label: "Planning", className: "bg-indigo-50 text-indigo-700 border-indigo-200" }
    default:
      return { label: status || "Active", className: "bg-slate-50 text-slate-700 border-slate-200" }
  }
}

function getQuoteStatusBadge(status?: string) {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return { label: "Draft", className: "bg-amber-50 text-amber-700 border-amber-200" }
    case "SENT":
      return { label: "Sent", className: "bg-sky-50 text-sky-700 border-sky-200" }
    case "VIEWED":
      return { label: "Viewed", className: "bg-violet-50 text-violet-700 border-violet-200" }
    case "ACCEPTED":
      return { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "REJECTED":
      return { label: "Declined", className: "bg-rose-50 text-rose-700 border-rose-200" }
    default:
      return { label: status || "Quote", className: "bg-slate-50 text-slate-700 border-slate-200" }
  }
}

function getInvoiceStatusBadge(inv: Invoice) {
  if (inv.status === "OVERDUE" || ((inv.balance_due ?? 0) > 0 && inv.due_date && new Date(inv.due_date).getTime() < Date.now())) {
    return { label: "Overdue", className: "bg-rose-50 text-rose-700 border-rose-200" }
  }
  if ((inv.amount_paid ?? 0) > 0 && (inv.balance_due ?? 0) > 0) {
    return { label: "Partial", className: "bg-amber-50 text-amber-700 border-amber-200" }
  }
  switch (inv.status) {
    case "SENT":
    case "VIEWED":
      return { label: "Sent", className: "bg-sky-50 text-sky-700 border-sky-200" }
    case "PAID":
      return { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "DRAFT":
      return { label: "Draft", className: "bg-slate-50 text-slate-600 border-slate-200" }
    default:
      return { label: inv.status || "Invoice", className: "bg-slate-50 text-slate-600 border-slate-200" }
  }
}

export function DashboardWorkspaceDrawer({
  summary,
  onRefresh,
}: {
  summary: DashboardSummary | null
  onRefresh?: () => void
}) {
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<"projects" | "quotes" | "invoices">("projects")
  
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  // Fetch Projects
  useEffect(() => {
    let cancelled = false
    setLoadingProjects(true)
    api
      .getProjects({ limit: 4, skip: 0 })
      .then((data) => {
        if (!cancelled) setProjects(Array.isArray(data) ? data.slice(0, 4) : [])
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch Quotes
  useEffect(() => {
    let cancelled = false
    setLoadingQuotes(true)
    api
      .getMyJobs(undefined, 0, 4)
      .then((res: any) => {
        if (cancelled) return
        const items = Array.isArray(res) ? res : res?.items || res?.jobs || []
        setQuotes(items.slice(0, 4))
      })
      .catch(() => {
        if (!cancelled) setQuotes([])
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch Invoices
  useEffect(() => {
    let cancelled = false
    setLoadingInvoices(true)
    api
      .getInvoices(undefined, 0, 10)
      .then((res: any) => {
        if (cancelled) return
        const items: Invoice[] = res?.items ?? (Array.isArray(res) ? res : [])
        const sorted = [...items].sort((a, b) => {
          const aLate =
            a.status === "OVERDUE" ||
            ((a.balance_due ?? 0) > 0 && a.due_date && new Date(a.due_date).getTime() < Date.now())
          const bLate =
            b.status === "OVERDUE" ||
            ((b.balance_due ?? 0) > 0 && b.due_date && new Date(b.due_date).getTime() < Date.now())
          if (aLate && !bLate) return -1
          if (!aLate && bLate) return 1

          const aUnpaid = (a.balance_due ?? 0) > 0
          const bUnpaid = (b.balance_due ?? 0) > 0
          if (aUnpaid && !bUnpaid) return -1
          if (!aUnpaid && bUnpaid) return 1

          return 0
        })
        setInvoices(sorted.slice(0, 4))
      })
      .catch(() => {
        if (!cancelled) setInvoices([])
      })
      .finally(() => {
        if (!cancelled) setLoadingInvoices(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const money = summary?.money
  const pastDue = money?.past_due_total ?? 0
  const unpaid = money?.unpaid_total ?? 0
  const awaitingReply = summary?.quotes.awaiting_reply_count ?? 0

  return (
    <div className="space-y-4">
      {/* 1. Global Search Bar in context */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <GlobalSearch className="w-full" />
      </div>

      {/* 2. Workspace Drawer Card: Projects / Quotes / Invoices */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 pt-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
              activeTab === "projects"
                ? "border-sky-600 font-bold text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Projects</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quotes")}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
              activeTab === "quotes"
                ? "border-sky-600 font-bold text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Quotes</span>
            {awaitingReply > 0 && (
              <span className="rounded-full bg-sky-100 px-1.5 py-0.2 font-mono text-[10px] text-sky-700">
                {awaitingReply}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
              activeTab === "invoices"
                ? "border-sky-600 font-bold text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Invoices</span>
            {pastDue > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-rose-700">
                late
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Projects Content */}
        {activeTab === "projects" && (
          <div className="p-3.5">
            <div className="space-y-2">
              {loadingProjects ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))
              ) : projects.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>No active projects found.</p>
                  <button
                    onClick={() => setNewProjectOpen(true)}
                    className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
                  >
                    + Create a project
                  </button>
                </div>
              ) : (
                projects.map((project) => {
                  const badge = getProjectStatusBadge(project.status)
                  const title = project.title || `Project #${project.id}`
                  return (
                    <Link
                      key={project.id}
                      href={`/${locale}/projects/${project.id}`}
                      className="block rounded-lg border border-slate-100 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-900">{title}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">#PRJ-{project.id}</span>
                        {project.total_trades != null ? (
                          <span className="font-medium text-slate-600">
                            {project.accepted_trades ?? 0}/{project.total_trades} trades
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <Link
                href={`/${locale}/projects`}
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                View all projects →
              </Link>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Quotes Content */}
        {activeTab === "quotes" && (
          <div className="p-3.5">
            <div className="space-y-2">
              {loadingQuotes ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))
              ) : quotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>No quotes found.</p>
                  <Link
                    href={`/${locale}/quotes/new`}
                    className="mt-2 inline-block text-xs font-semibold text-sky-600 hover:underline"
                  >
                    + Create a quote
                  </Link>
                </div>
              ) : (
                quotes.map((quote) => {
                  const badge = getQuoteStatusBadge(quote.status)
                  const title = quote.title || `Quote #${quote.id}`
                  return (
                    <Link
                      key={quote.id}
                      href={`/${locale}/quotes/${quote.id}`}
                      className="block rounded-lg border border-slate-100 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-900">{title}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{(quote as any).client_name || quote.client?.name || "No client"}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {currency(quote.total_amount)}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <Link
                href={`/${locale}/quotes`}
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                View all quotes →
              </Link>
              <Link
                href={`/${locale}/quotes/new`}
                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Invoices Content */}
        {activeTab === "invoices" && (
          <div className="p-3.5">
            <div className="space-y-2">
              {loadingInvoices ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))
              ) : invoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>No invoices found.</p>
                </div>
              ) : (
                invoices.map((inv) => {
                  const badge = getInvoiceStatusBadge(inv)
                  const number = inv.invoice_number || `INV-${inv.id}`
                  const clientName =
                    inv.client_name?.trim() ||
                    inv.client?.name?.trim() ||
                    (inv.title && inv.title !== number ? inv.title.trim() : "") ||
                    (inv.client_id ? `Client #${inv.client_id}` : "Client")

                  const isPaid = badge.label === "Paid"
                  const isOverdue = badge.label === "Overdue"

                  // Show the full invoice amount for paid invoices, or the balance due if unpaid
                  const amount = isPaid
                    ? (inv.total_amount || inv.amount_paid || 0)
                    : (inv.balance_due && inv.balance_due > 0 ? inv.balance_due : (inv.total_amount || 0))

                  let subtitle = inv.title && inv.title !== clientName ? inv.title : ""
                  if (isOverdue && inv.due_date) {
                    const d = new Date(inv.due_date)
                    const dueStr = !Number.isNaN(d.getTime())
                      ? `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""
                    subtitle = subtitle ? `${subtitle} · ${dueStr}` : dueStr
                  } else if (isPaid && inv.issue_date) {
                    const d = new Date(inv.issue_date)
                    const dateStr = !Number.isNaN(d.getTime())
                      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : ""
                    subtitle = subtitle ? `${subtitle} · ${dateStr}` : `Paid · ${dateStr}`
                  } else if (inv.due_date) {
                    const d = new Date(inv.due_date)
                    const dueStr = !Number.isNaN(d.getTime())
                      ? `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""
                    subtitle = subtitle ? `${subtitle} · ${dueStr}` : dueStr
                  }
                  if (!subtitle) {
                    subtitle = isPaid ? "Paid in full" : "Invoice"
                  }

                  return (
                    <Link
                      key={inv.id}
                      href={`/${locale}/invoices/${inv.id}`}
                      className="block rounded-lg border border-slate-100 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-xs font-bold text-slate-900">
                            {clientName}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-slate-400">
                            {number}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{subtitle}</span>
                        <span
                          className={cn(
                            "font-mono font-bold",
                            isOverdue ? "text-rose-600" : isPaid ? "text-slate-800" : "text-slate-900"
                          )}
                        >
                          {currency(amount)}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <Link
                href={`/${locale}/invoices`}
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                View all invoices →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact Financial Snapshot (Non-intrusive) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Financial Snapshot</span>
          <span className="font-mono text-xs font-bold text-slate-900">
            {currency(unpaid)} unpaid
          </span>
        </div>

        {/* Compact Segmented Progress Bar */}
        <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-rose-500 transition-all"
            style={{ width: unpaid > 0 ? `${Math.min((pastDue / unpaid) * 100, 100)}%` : "0%" }}
            title={`Past Due: ${currency(pastDue)}`}
          />
          <div
            className="h-full bg-sky-400 transition-all"
            style={{
              width:
                unpaid > 0
                  ? `${Math.max(100 - Math.min((pastDue / unpaid) * 100, 100), 0)}%`
                  : "100%",
            }}
            title="Current Unpaid"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px]">
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Past Due</span>
            <span
              className={cn(
                "font-mono font-bold",
                pastDue > 0 ? "text-rose-600" : "text-slate-700"
              )}
            >
              {currency(pastDue)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Awaiting</span>
            <span className="font-mono font-bold text-sky-700">{awaitingReply} quotes</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Total Unpaid</span>
            <span className="font-mono font-bold text-slate-800">{currency(unpaid)}</span>
          </div>
        </div>
      </div>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onProjectCreated={(projectId) => {
          setNewProjectOpen(false)
          window.location.href = `/${locale}/projects/${projectId}`
        }}
      />
    </div>
  )
}
