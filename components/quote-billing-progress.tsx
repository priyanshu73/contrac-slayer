"use client"

import { useCallback, useEffect, useState } from "react"
import { Wallet } from "lucide-react"
import { api } from "@/lib/api"
import type { PaymentSchedule } from "@/lib/types"
import { QuoteSidebarSection } from "@/components/quote-sidebar-section"

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)

// Statuses where the quote is a live contract and billing progress is meaningful.
const BILLABLE = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"])

interface QuoteBillingProgressProps {
  jobId: number
  status?: string
  /** Bump this to force a refetch after a draw is billed / payment recorded. */
  refreshKey?: number
}

/**
 * Sidebar "Billing" block for the contractor's quote view: a segmented progress
 * bar (collected / invoiced-not-collected / remaining) plus dollar stat rows.
 *
 * Reuses the SAME data the invoices section already reads —
 * ``GET /jobs/{id}/payment-schedule`` returns ``contract_total`` and
 * ``summary {billed, paid, outstanding}`` for both lump-sum and scheduled quotes
 * — so it needs no backend work and can't disagree with the draw list.
 *
 * Self-hides when there's nothing to show yet (no contract total, or a
 * not-yet-accepted quote that has never been invoiced).
 */
export function QuoteBillingProgress({ jobId, status, refreshKey }: QuoteBillingProgressProps) {
  const [open, setOpen] = useState(true)
  const [sched, setSched] = useState<PaymentSchedule | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      setSched(await api.getPaymentSchedule(jobId))
    } catch {
      setSched(null)
    } finally {
      setLoaded(true)
    }
  }, [jobId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (!loaded || !sched) return null

  const contract = sched.contract_total || 0
  const billed = sched.summary?.billed || 0
  const paid = sched.summary?.paid || 0
  const billable = BILLABLE.has((status || "").toUpperCase())
  // Nothing to bill yet → don't clutter the sidebar.
  if (contract <= 0 || (billed <= 0 && !billable)) return null

  const pct = (part: number) => (contract > 0 ? Math.min(100, Math.round((part / contract) * 100)) : 0)
  const invoicedPct = pct(billed)
  const collectedPct = pct(paid)
  const remaining = Math.max(0, contract - billed)

  // Segmented bar widths: green = collected, amber = invoiced-but-not-collected.
  const collectedW = contract > 0 ? Math.min(100, (paid / contract) * 100) : 0
  const invoicedOnlyW = contract > 0 ? Math.max(0, Math.min(100 - collectedW, ((billed - paid) / contract) * 100)) : 0

  return (
    <QuoteSidebarSection
      icon={<Wallet className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
      title="Billing"
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      <div className="space-y-2.5 px-3 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Contract</span>
          <span className="font-semibold tabular-nums text-slate-800">{money(contract)}</span>
        </div>

        {/* Segmented progress bar (matches the financials tab's colour language). */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500" style={{ width: `${collectedW}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${invoicedOnlyW}%` }} />
        </div>

        <div className="space-y-1 text-xs">
          <StatRow dot="bg-emerald-500" label="Collected" value={money(paid)} pct={collectedPct} />
          <StatRow dot="bg-amber-400" label="Invoiced" value={money(billed)} pct={invoicedPct} />
          <StatRow dot="bg-slate-200" label="Left to invoice" value={money(remaining)} />
        </div>
      </div>
    </QuoteSidebarSection>
  )
}

function StatRow({ dot, label, value, pct }: { dot: string; label: string; value: string; pct?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="tabular-nums text-slate-700">
        {value}
        {pct != null && <span className="ml-1 text-slate-400">{pct}%</span>}
      </span>
    </div>
  )
}
