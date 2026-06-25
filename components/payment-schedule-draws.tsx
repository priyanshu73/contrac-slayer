"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CheckCircle2, Lock, Loader2, FileText, ChevronDown, Receipt } from "lucide-react"
import type { PaymentSchedule, PaymentScheduleLine } from "@/lib/types"

interface PaymentScheduleDrawsProps {
  jobId: number
  /** Called after a draw is billed (e.g. to refresh the parent quote/job). */
  onDrawBilled?: () => void
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" })

const TRIGGER_HINT: Record<string, string> = {
  ON_ACCEPTANCE: "on acceptance",
  ON_PHASE: "on phase",
  ON_DATE: "on date",
  ON_COMPLETION: "on completion",
}

function StateLabel({ line }: { line: PaymentScheduleLine }) {
  const base = "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
  switch (line.state) {
    case "PAID":
      return (
        <span className={cn(base, "text-emerald-600")}>
          <CheckCircle2 className="h-3 w-3" /> Paid
        </span>
      )
    case "INVOICED":
      return (
        <span className={cn(base, "text-amber-600")}>
          <FileText className="h-3 w-3" /> Invoiced
        </span>
      )
    case "READY":
      return <span className={cn(base, "text-sky-600")}>Ready</span>
    default:
      return (
        <span className={cn(base, "text-slate-400")}>
          <Lock className="h-3 w-3" /> Locked
        </span>
      )
  }
}

export function PaymentScheduleDraws({ jobId, onDrawBilled }: PaymentScheduleDrawsProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingId, setBillingId] = useState<number | null>(null)
  const [open, setOpen] = useState(true)

  const load = useCallback(async () => {
    try {
      const sched = await api.getPaymentSchedule(jobId)
      setSchedule(sched)
    } catch (err) {
      console.error("Failed to load payment schedule:", err)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    load()
  }, [load])

  const handleBill = async (line: PaymentScheduleLine) => {
    setBillingId(line.id)
    try {
      const invoice = await api.billDraw(jobId, line.id)
      toast({
        title: "Draw billed",
        description: `${line.label} — invoice ${invoice?.invoice_number ?? ""} for ${fmt(line.computed_amount)}.`,
      })
      await load()
      onDrawBilled?.()
    } catch (err: any) {
      toast({
        title: "Couldn't bill this draw",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setBillingId(null)
    }
  }

  // Only render for quotes that actually use a draw schedule.
  if (loading || !schedule || schedule.billing_mode !== "SCHEDULED" || schedule.lines.length === 0) {
    return null
  }

  const { summary, contract_total, lines } = schedule

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-1 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Receipt className="h-3 w-3" />
          Payment schedule
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1.5 space-y-3 pl-1">
          {/* Summary */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Collected <span className="font-semibold text-slate-700 tabular-nums">{fmt(summary.paid)}</span>
            </span>
            <span className="text-slate-400 tabular-nums">of {fmt(contract_total)}</span>
          </div>

          {/* Draws */}
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="border-t border-slate-100 pt-2 first:border-0 first:pt-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-medium text-slate-700">{line.label}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-700 tabular-nums">
                    {fmt(line.computed_amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <StateLabel line={line} />
                    {line.invoice_id && (
                      <Link
                        href={`/${locale}/invoices/${line.invoice_id}`}
                        className="text-[10px] text-sky-600 hover:text-sky-800 hover:underline"
                      >
                        {line.invoice_number ?? "View"}
                      </Link>
                    )}
                  </span>
                  {line.state === "READY" ? (
                    <button
                      onClick={() => handleBill(line)}
                      disabled={billingId === line.id}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
                    >
                      {billingId === line.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Bill"}
                    </button>
                  ) : line.state === "LOCKED" ? (
                    <span className="text-[10px] text-slate-400">{TRIGGER_HINT[line.trigger_type] ?? ""}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {summary.outstanding > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-semibold text-slate-700 tabular-nums">{fmt(summary.outstanding)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
