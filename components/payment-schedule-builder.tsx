"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, AlertTriangle, GripVertical, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  PaymentScheduleLineInput,
  PaymentTriggerType,
  PaymentAmountType,
} from "@/lib/types"

// ─── Bill-when options ───────────────────────────────────────────────────────
// Only two triggers are authored from the builder. Legacy values
// (ON_ACCEPTANCE / ON_PHASE) are normalised to ON_COMPLETION on load.
type BuilderTrigger = "ON_COMPLETION" | "ON_DATE"

const TRIGGER_LABELS: Record<BuilderTrigger, string> = {
  ON_COMPLETION: "On completion",
  ON_DATE: "On a date",
}

export function normalizeTrigger(t: PaymentTriggerType): BuilderTrigger {
  return t === "ON_DATE" ? "ON_DATE" : "ON_COMPLETION"
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" })

const draw = (
  label: string,
  trigger: BuilderTrigger,
  amount: number,
  order: number,
): PaymentScheduleLineInput => ({
  label,
  trigger_type: trigger,
  amount_type: "PERCENT",
  amount_value: amount,
  order_index: order,
})

// ─── Presets (the "Billing" dropdown) ────────────────────────────────────────

export const PAYMENT_PRESETS: {
  key: string
  label: string
  build: () => PaymentScheduleLineInput[]
}[] = [
  {
    key: "single",
    label: "Single payment",
    build: () => [],
  },
  {
    key: "50-50",
    label: "50 / 50",
    build: () => [
      draw("Payment 1", "ON_COMPLETION", 50, 0),
      draw("Payment 2", "ON_COMPLETION", 50, 1),
    ],
  },
  {
    key: "30-40-30",
    label: "30 / 40 / 30",
    build: () => [
      draw("Payment 1", "ON_COMPLETION", 30, 0),
      draw("Payment 2", "ON_COMPLETION", 40, 1),
      draw("Payment 3", "ON_COMPLETION", 30, 2),
    ],
  },
  {
    key: "deposit-balance",
    label: "Deposit + balance",
    build: () => [
      draw("Deposit", "ON_COMPLETION", 30, 0),
      draw("Balance on completion", "ON_COMPLETION", 70, 1),
    ],
  },
]

/** Which preset (if any) the current draws match — drives the Billing dropdown. */
export function matchPresetKey(lines: PaymentScheduleLineInput[]): string {
  for (const p of PAYMENT_PRESETS) {
    const built = p.build()
    if (built.length !== lines.length) continue
    const same = built.every(
      (b, i) =>
        lines[i].amount_type === b.amount_type &&
        (lines[i].amount_value || 0) === b.amount_value &&
        normalizeTrigger(lines[i].trigger_type) === b.trigger_type,
    )
    if (same) return p.key
  }
  return "custom"
}

// ─── Draw math (industry-standard) ───────────────────────────────────────────
// Each percentage draw is a share of the FULL contract total (so 30/40/30 sums
// to 100%), and fixed draws bill their flat amount. `remainingAfter` is just the
// contract total minus everything billed top-to-bottom, for the running display.
// Mirror of the backend's `_compute_draw_amounts` so the preview matches what
// the server stores.
export interface DrawComputation {
  amount: number
  remainingAfter: number
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function computeDraws(
  lines: PaymentScheduleLineInput[],
  total: number,
): DrawComputation[] {
  let remaining = total
  return lines.map((line) => {
    const value = line.amount_value || 0
    const amount = round2(line.amount_type === "PERCENT" ? (total * value) / 100 : value)
    remaining = round2(remaining - amount)
    return { amount, remainingAfter: remaining }
  })
}

// Shared column template for the header row and each draw row, so they line up:
// handle · name · split · flexible gap · amount · trigger · remove.
// Every column except name + gap is a fixed width — each row is its own grid,
// so fixed widths are what keep the columns aligned across rows.
const GRID =
  "grid grid-cols-[18px_minmax(0,1.4fr)_180px_1fr_100px_244px_32px] items-center gap-x-3"

interface PaymentScheduleBuilderProps {
  /** Contract grand total (markup + tax), used to preview each draw's dollar amount. */
  total: number
  lines: PaymentScheduleLineInput[]
  onLinesChange: (lines: PaymentScheduleLineInput[]) => void
}

export function PaymentScheduleBuilder({
  total,
  lines,
  onLinesChange,
}: PaymentScheduleBuilderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Already-billed draws are read-only. They keep their place at the front of
  // the schedule (billed first), so the boundary between locked and editable is
  // the count of locked lines.
  const lockedCount = lines.filter((l) => l.locked).length

  const reindex = (next: PaymentScheduleLineInput[]) =>
    next.map((l, i) => ({ ...l, order_index: i }))

  const updateLine = (idx: number, patch: Partial<PaymentScheduleLineInput>) => {
    if (lines[idx]?.locked) return
    onLinesChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const addLine = () =>
    onLinesChange(
      reindex([
        ...lines,
        draw(`Payment ${lines.length + 1}`, "ON_COMPLETION", 0, lines.length),
      ]),
    )

  const removeLine = (idx: number) => {
    if (lines[idx]?.locked) return
    onLinesChange(reindex(lines.filter((_, i) => i !== idx)))
  }

  const moveLine = (from: number, to: number) => {
    if (from === to) return
    // Never reorder a billed draw, and never move an editable one ahead of them.
    if (lines[from]?.locked) return
    const target = Math.max(to, lockedCount)
    if (from === target) return
    const next = [...lines]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    onLinesChange(reindex(next))
  }

  const computed = computeDraws(lines, total)
  const scheduledTotal = computed.reduce((s, c) => s + c.amount, 0)
  const scheduledPct = total > 0 ? Math.round((scheduledTotal / total) * 100) : 0
  const overContract = scheduledTotal > total + 0.01

  // How much of the contract is already locked up in billed draws, and how much
  // is still free to schedule. Drives the "remaining" budget shown to the user.
  const billedTotal = computed.reduce((s, c, i) => (lines[i].locked ? s + c.amount : s), 0)
  const remainingBudget = round2(total - billedTotal)
  const hasLocked = lockedCount > 0

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Billed as a single payment. Pick a billing schedule above or add a draw below.
        <div className="mt-3">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={addLine}>
            <Plus className="mr-1 h-4 w-4" /> Add draw
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className={cn(GRID, "px-1 pb-1 text-xs font-medium text-muted-foreground")}>
        <span />
        <span>Draw name</span>
        <span>Split</span>
        <span />
        <span className="text-right">Amount</span>
        <span>Trigger</span>
        <span />
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          const { amount, remainingAfter } = computed[idx]
          const trigger = normalizeTrigger(line.trigger_type)

          // ── Billed draw: read-only. Shown so the contractor sees the full
          // schedule, but it can't be edited, reordered, or removed. ──
          if (line.locked) {
            const split =
              line.amount_type === "PERCENT"
                ? `${line.amount_value || 0}%`
                : fmt(line.amount_value || 0)
            return (
              <div key={idx} className={cn(GRID, "rounded-lg bg-muted/40 px-1 py-1")}>
                <span className="flex h-9 w-[18px] items-center justify-center text-muted-foreground/50">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-sm font-medium text-foreground" title={line.label}>
                  {line.label}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{split}</span>
                <span />
                <div className="flex flex-col items-end justify-center text-right">
                  <span className="text-sm font-semibold tabular-nums">{fmt(amount)}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      line.lockedStatus === "PAID" ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {line.lockedStatus === "PAID" ? "Paid" : "Invoiced"}
                  </span>
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {TRIGGER_LABELS[trigger]}
                </span>
                <span />
              </div>
            )
          }

          return (
            <div
              key={idx}
              onDragOver={(e) => {
                if (dragIndex === null) return
                e.preventDefault()
                setOverIndex(idx)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null) moveLine(dragIndex, idx)
                setDragIndex(null)
                setOverIndex(null)
              }}
              className={cn(
                GRID,
                "rounded-lg px-1 py-1 transition-colors",
                dragIndex === idx && "opacity-50",
                overIndex === idx && dragIndex !== idx && "bg-muted/60",
              )}
            >
              {/* Drag handle */}
              <span
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move"
                  setDragIndex(idx)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                className="flex h-9 w-[18px] cursor-grab items-center justify-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              {/* Draw name */}
              <Input
                value={line.label}
                placeholder="Draw name"
                onChange={(e) => updateLine(idx, { label: e.target.value })}
                className="h-9"
              />

              {/* Split = amount value + unit */}
              <div className="flex">
                <Input
                  type="number"
                  min={0}
                  max={line.amount_type === "PERCENT" ? 100 : 999999999}
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  value={line.amount_value === 0 ? "" : line.amount_value}
                  onChange={(e) =>
                    updateLine(idx, {
                      amount_value: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 w-[112px] rounded-r-none text-center"
                />
                <Select
                  value={line.amount_type}
                  onValueChange={(v) => updateLine(idx, { amount_type: v as PaymentAmountType })}
                >
                  <SelectTrigger className="h-9 w-[68px] gap-1 rounded-l-none border-l-0 px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">%</SelectItem>
                    <SelectItem value="FIXED">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Flexible gap */}
              <span />

              {/* Computed amount + remaining balance */}
              <div className="flex flex-col items-end justify-center text-right">
                <span className="text-sm font-semibold tabular-nums">{fmt(amount)}</span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums text-muted-foreground",
                    remainingAfter < -0.01 && "text-destructive",
                  )}
                >
                  {fmt(remainingAfter)} left
                </span>
              </div>

              {/* Trigger — one box; the date lives inside it when "On a date" */}
              <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <Select
                  value={trigger}
                  onValueChange={(v) =>
                    updateLine(idx, {
                      trigger_type: v as PaymentTriggerType,
                      trigger_date: v === "ON_DATE" ? (line.trigger_date ?? "") : null,
                    })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-full rounded-none border-0 bg-transparent shadow-none focus:ring-0 focus-visible:ring-0",
                      trigger === "ON_DATE" ? "w-auto shrink-0 gap-1 px-2.5" : "w-full px-3",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TRIGGER_LABELS) as BuilderTrigger[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TRIGGER_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {trigger === "ON_DATE" && (
                  <>
                    <span className="h-5 w-px shrink-0 bg-border" />
                    <input
                      type="date"
                      value={line.trigger_date ?? ""}
                      onChange={(e) => updateLine(idx, { trigger_date: e.target.value || null })}
                      className="h-full min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                    />
                  </>
                )}
              </div>

              {/* Remove */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeLine(idx)}
                aria-label="Remove draw"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-1 h-8" onClick={addLine}>
        <Plus className="mr-1 h-4 w-4" /> Add draw
      </Button>

      {/* Footer / totals */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
        <span className="text-muted-foreground">
          Contract total: <strong className="text-foreground">{fmt(total)}</strong>
          {hasLocked && (
            <>
              {" · "}
              Billed: <strong className="text-foreground tabular-nums">{fmt(billedTotal)}</strong>
              {" · "}
              Remaining:{" "}
              <strong className="text-foreground tabular-nums">{fmt(remainingBudget)}</strong>
            </>
          )}
        </span>
        <span className="text-muted-foreground">
          Scheduled:{" "}
          <strong className={cn("text-foreground tabular-nums", overContract && "text-destructive")}>
            {fmt(scheduledTotal)}
          </strong>{" "}
          ({scheduledPct}%)
        </span>
      </div>

      {overContract && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Draws exceed the contract total ({fmt(scheduledTotal)} of {fmt(total)}). Reduce them before saving.
        </div>
      )}
    </div>
  )
}
