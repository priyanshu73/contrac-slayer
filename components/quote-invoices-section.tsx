"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { QuoteSidebarSection } from "@/components/quote-sidebar-section"
import { CheckCircle2, Loader2, FileText, Receipt, Plus, X, Pencil } from "lucide-react"
import type {
  PaymentSchedule,
  PaymentScheduleLine,
  PaymentScheduleLineInput,
  PaymentAmountType,
  PaymentTriggerType,
} from "@/lib/types"

interface QuoteInvoicesSectionProps {
  jobId: number
  /** Called after the schedule changes (a draw billed, added, or edited) so the
   * parent can refresh the quote/job. */
  onDrawBilled?: () => void
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" })
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** A draw that hasn't been billed is locked from editing only once it has an
 * invoice — PAID/INVOICED are locked, READY/SCHEDULED are still editable. */
const isBilled = (line: PaymentScheduleLine) =>
  line.state === "PAID" || line.state === "INVOICED"

/** Dollar value of one draft row: a percentage is a share of the FULL contract
 * total (mirrors the backend), a fixed draw bills its flat amount. */
function draftAmount(d: DraftDraw, contractTotal: number): number {
  const v = d.amount_value || 0
  return round2(d.amount_type === "PERCENT" ? (contractTotal * v) / 100 : v)
}

interface DraftDraw {
  id?: number
  label: string
  amount_type: PaymentAmountType
  amount_value: number
  trigger_type: PaymentTriggerType
  trigger_date: string | null
}

const toDraft = (line: PaymentScheduleLine): DraftDraw => ({
  id: line.id,
  label: line.label,
  amount_type: line.amount_type,
  amount_value: line.amount_value,
  trigger_type: line.trigger_type,
  trigger_date: line.trigger_date ?? null,
})

const blankDraft = (): DraftDraw => ({
  label: "",
  amount_type: "PERCENT",
  amount_value: 0,
  trigger_type: "ON_COMPLETION",
  trigger_date: null,
})

/** When a scheduled draw is *planned* to bill — purely a hint; it never blocks
 * billing. ON_DATE shows the actual date, everything else a plain-English cue. */
function triggerHint(line: PaymentScheduleLine): string {
  if (line.trigger_type === "ON_DATE" && line.trigger_date) {
    const d = new Date(line.trigger_date)
    if (!Number.isNaN(d.getTime())) {
      return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    }
  }
  switch (line.trigger_type) {
    case "ON_DATE":
      return "On date"
    case "ON_ACCEPTANCE":
      return "On acceptance"
    case "ON_PHASE":
      return "On phase"
    default:
      return "On completion"
  }
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
      // SCHEDULED — not yet triggered, but still billable. Show when it's
      // planned to bill instead of a lock.
      return <span className={cn(base, "text-slate-400")}>{triggerHint(line)}</span>
  }
}

export function QuoteInvoicesSection({ jobId, onDrawBilled }: QuoteInvoicesSectionProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingId, setBillingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  // Inline editing of the unbilled draws.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DraftDraw[]>([])
  const [saving, setSaving] = useState(false)

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
  const billedLines = lines.filter(isBilled)
  // Amount already locked up in billed draws — the editable draws can only fill
  // the rest of the contract.
  const billedTotal = round2(billedLines.reduce((s, l) => s + l.computed_amount, 0))

  // ── Edit-mode helpers ──────────────────────────────────────────────
  const startEditing = (withNewRow: boolean) => {
    const seed = lines.filter((l) => !isBilled(l)).map(toDraft)
    setDraft(withNewRow ? [...seed, blankDraft()] : seed)
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setDraft([])
  }

  const updateDraft = (idx: number, patch: Partial<DraftDraw>) =>
    setDraft((d) => d.map((row, i) => (i === idx ? { ...row, ...patch } : row)))

  const removeDraft = (idx: number) => setDraft((d) => d.filter((_, i) => i !== idx))

  const draftTotal = round2(draft.reduce((s, d) => s + draftAmount(d, contract_total), 0))
  const remaining = round2(contract_total - billedTotal - draftTotal)
  const overContract = billedTotal + draftTotal > contract_total + 0.01

  const handleSave = async () => {
    // Drop fully-empty rows (an untouched "Add draw"); the rest must be valid.
    const cleaned = draft.filter((d) => d.label.trim() || (d.amount_value || 0) > 0)
    if (cleaned.some((d) => !d.label.trim())) {
      toast({ title: "Every draw needs a name.", variant: "destructive" })
      return
    }
    if (cleaned.some((d) => d.trigger_type === "ON_DATE" && !d.trigger_date)) {
      toast({ title: "Pick a date for every draw billed on a date.", variant: "destructive" })
      return
    }
    if (overContract) {
      toast({
        title: "Draws exceed the contract total",
        description: `${fmt(billedTotal + draftTotal)} of ${fmt(contract_total)}. Reduce them before saving.`,
        variant: "destructive",
      })
      return
    }

    // Send only the unbilled draws — the backend keeps billed lines and appends
    // these after them (order_index continues past the billed count).
    const payload: PaymentScheduleLineInput[] = cleaned.map((d, i) => ({
      id: d.id,
      label: d.label.trim(),
      trigger_type: d.trigger_type,
      trigger_phase: null,
      trigger_date: d.trigger_date,
      amount_type: d.amount_type,
      amount_value: d.amount_value,
      order_index: billedLines.length + i,
    }))

    setSaving(true)
    try {
      await api.savePaymentSchedule(jobId, payload)
      toast({ title: "Payment schedule updated" })
      setEditing(false)
      setDraft([])
      await load()
      onDrawBilled?.()
    } catch (err: any) {
      toast({
        title: "Couldn't save the schedule",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const count = lines.length

  return (
    <Popover
      open={editing}
      onOpenChange={(open) => {
        if (!open && !saving) cancelEditing()
      }}
    >
      <PopoverAnchor asChild>
        <QuoteSidebarSection
          icon={<Receipt className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
          title="Invoices"
          count={count}
          open={open}
          onToggle={() => setOpen((o) => !o)}
          action={
            !editing ? (
              <button
                onClick={() => startEditing(false)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-sky-700 transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            ) : null
          }
        >
      {/* ── Invoice list (edits happen in the popover) ── */}
      <ul className="divide-y divide-sky-100/60">
            {lines.map((line) => (
              <li key={line.id} className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold leading-tight text-slate-900" title={line.label}>
                        {line.label}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-slate-900 tabular-nums">
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
                      {line.state === "READY" || line.state === "SCHEDULED" ? (
                        <Button
                          size="sm"
                          onClick={() => handleBill(line)}
                          disabled={billingId === line.id}
                          className="h-6 gap-1 rounded-md bg-sky-600 px-2 text-[11px] font-semibold text-white hover:bg-sky-700"
                        >
                          {billingId === line.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Bill"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Add a draw for the remaining contract amount */}
          <button
            onClick={() => startEditing(true)}
            disabled={remaining <= 0.01 || editing}
            className="flex w-full items-center justify-center gap-1 border-t border-sky-100 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-50/60 disabled:cursor-not-allowed disabled:text-slate-300 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add draw
          </button>
        </QuoteSidebarSection>
      </PopoverAnchor>

      {/* ── Edit mode (popover anchored beside the invoice box) ──────── */}
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        collisionPadding={16}
        className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-sky-200/70 p-0 shadow-lg"
      >
        <div className="border-b border-sky-100 bg-sky-50/60 px-3 py-2.5 text-sm font-semibold text-slate-800">
          Edit draws
        </div>
        <div>
          {/* Billed draws stay read-only */}
          {billedLines.length > 0 && (
            <ul className="divide-y divide-sky-100/60">
              {billedLines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    <span className="truncate text-[13px] font-medium text-slate-500" title={line.label}>
                      {line.label}
                    </span>
                    <StateLabel line={line} />
                  </span>
                  <span className="shrink-0 text-[13px] font-medium text-slate-400 tabular-nums">
                    {fmt(line.computed_amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Editable (unbilled) draws */}
          <ul className="divide-y divide-sky-100/60 border-t border-sky-100">
            {draft.map((d, i) => (
              <li key={i} className="flex items-center gap-1.5 px-3 py-2">
                <Input
                  value={d.label}
                  placeholder="Draw name"
                  onChange={(e) => updateDraft(i, { label: e.target.value })}
                  className="h-8 flex-1 text-[13px]"
                />
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  value={d.amount_value === 0 ? "" : d.amount_value}
                  onChange={(e) =>
                    updateDraft(i, {
                      amount_value: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-8 w-20 shrink-0 text-center text-[13px] tabular-nums"
                />
                <button
                  onClick={() =>
                    updateDraft(i, { amount_type: d.amount_type === "PERCENT" ? "FIXED" : "PERCENT" })
                  }
                  className="h-8 w-8 shrink-0 rounded-md border border-input text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                  aria-label="Toggle percent or dollar"
                >
                  {d.amount_type === "PERCENT" ? "%" : "$"}
                </button>
                <span className="w-24 shrink-0 text-right text-[13px] tabular-nums text-slate-400">
                  {fmt(draftAmount(d, contract_total))}
                </span>
                <button
                  onClick={() => removeDraft(i)}
                  className="flex h-8 w-7 shrink-0 items-center justify-center text-slate-300 hover:text-rose-500"
                  aria-label="Remove draw"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setDraft((d) => [...d, blankDraft()])}
            className="flex w-full items-center justify-center gap-1 border-t border-sky-100 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-50/60 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add draw
          </button>

          {/* Totals + actions */}
          <div className="border-t border-sky-100 bg-sky-50/40 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                {billedTotal > 0 && (
                  <>
                    Billed <span className="font-semibold tabular-nums">{fmt(billedTotal)}</span> ·{" "}
                  </>
                )}
                Scheduled{" "}
                <span className={cn("font-semibold tabular-nums", overContract && "text-rose-600")}>
                  {fmt(billedTotal + draftTotal)}
                </span>{" "}
                of {fmt(contract_total)}
              </span>
              <span className={cn("tabular-nums", remaining < -0.01 ? "text-rose-600" : "text-slate-400")}>
                {fmt(remaining)} left
              </span>
            </div>

            {overContract && (
              <p className="mt-1 text-[11px] text-rose-600">
                Draws can’t exceed the contract total.
              </p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
                disabled={saving}
                className="h-7 px-2.5 text-[11px] text-slate-500"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || overContract}
                className="h-7 gap-1 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-700"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
