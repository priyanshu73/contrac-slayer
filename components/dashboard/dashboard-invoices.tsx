"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ChevronRight, FileText, Receipt } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Invoice } from "@/lib/types"

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

function isOverdue(inv: Invoice): boolean {
  if ((inv.balance_due ?? 0) <= 0) return false
  if (inv.status === "OVERDUE") return true
  if (!inv.due_date) return false
  const due = new Date(inv.due_date)
  if (Number.isNaN(due.getTime())) return false
  due.setHours(23, 59, 59, 999)
  return due.getTime() < Date.now()
}

function dueLabel(inv: Invoice): { text: string; overdue: boolean } | null {
  if (!inv.due_date) return null
  const due = new Date(inv.due_date)
  if (Number.isNaN(due.getTime())) return null
  const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return isOverdue(inv) ? { text: `Overdue · ${label}`, overdue: true } : { text: `Due ${label}`, overdue: false }
}

function statusBadge(inv: Invoice) {
  if (isOverdue(inv)) return { label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" }
  if ((inv.amount_paid ?? 0) > 0 && (inv.balance_due ?? 0) > 0)
    return { label: "Partial", className: "border-amber-200 bg-amber-50 text-amber-700" }
  switch (inv.status) {
    case "SENT":
    case "VIEWED":
      return { label: "Sent", className: "border-sky-200 bg-sky-50 text-sky-700" }
    case "DRAFT":
      return { label: "Draft", className: "border-slate-200 bg-slate-50 text-slate-600" }
    default:
      return { label: inv.status, className: "border-slate-200 bg-slate-50 text-slate-600" }
  }
}

export function DashboardInvoices() {
  const locale = useLocale()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Server filters to outstanding balances and sorts soonest-due first, so we
    // only pull the few rows we actually show.
    api
      .getInvoices(undefined, 0, 6, undefined, true)
      .then((res: any) => {
        if (cancelled) return
        const items: Invoice[] = res?.items ?? (Array.isArray(res) ? res : [])
        setInvoices(items)
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") console.error("dashboard invoices load failed", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Overdue first, then by soonest due date.
  const sorted = [...invoices].sort((a, b) => {
    const ao = isOverdue(a) ? 0 : 1
    const bo = isOverdue(b) ? 0 : 1
    if (ao !== bo) return ao - bo
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return ad - bd
  })

  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.balance_due ?? 0), 0)

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            Invoices
            {!loading && sorted.length > 0 ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {sorted.length}
              </span>
            ) : null}
          </h2>
          {!loading && totalOutstanding > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-semibold text-rose-600">{currency(totalOutstanding)}</span> outstanding
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Unpaid balances</p>
          )}
        </div>
        <Link
          href={`/${locale}/invoices`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Receipt className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">Nothing outstanding</p>
          <p className="text-xs text-muted-foreground">Unpaid invoices will show up here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.slice(0, 5).map((inv) => {
            const due = dueLabel(inv)
            const badge = statusBadge(inv)
            return (
              <Link
                key={inv.id}
                href={`/${locale}/invoices`}
                className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white py-2 pl-2.5 pr-3 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{inv.invoice_number}</p>
                    <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", badge.className)}>
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {(inv as any).client_name || inv.client?.name || "Client"}
                    {due ? (
                      <span className={cn(due.overdue ? "font-medium text-rose-600" : "text-slate-400")}> · {due.text}</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {currency(inv.balance_due)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
