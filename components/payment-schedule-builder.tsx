"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  JobBillingMode,
  PaymentScheduleLineInput,
  PaymentTriggerType,
  PaymentAmountType,
} from "@/lib/types"

interface PaymentScheduleBuilderProps {
  /** Contract grand total (markup + tax), used to preview each draw's dollar amount. */
  total: number
  billingMode: JobBillingMode
  lines: PaymentScheduleLineInput[]
  onBillingModeChange: (mode: JobBillingMode) => void
  onLinesChange: (lines: PaymentScheduleLineInput[]) => void
}

const TRIGGER_LABELS: Record<PaymentTriggerType, string> = {
  ON_ACCEPTANCE: "On acceptance (deposit)",
  ON_PHASE: "On phase completion",
  ON_DATE: "On a date",
  ON_COMPLETION: "On completion",
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" })

const draw = (
  label: string,
  trigger: PaymentTriggerType,
  amount: number,
  order: number,
): PaymentScheduleLineInput => ({
  label,
  trigger_type: trigger,
  amount_type: "PERCENT",
  amount_value: amount,
  order_index: order,
})

const PRESETS: { key: string; label: string; build: () => PaymentScheduleLineInput[] }[] = [
  {
    key: "50-50",
    label: "50 / 50",
    build: () => [
      draw("Deposit", "ON_ACCEPTANCE", 50, 0),
      draw("Final payment", "ON_COMPLETION", 50, 1),
    ],
  },
  {
    key: "30-40-30",
    label: "30 / 40 / 30",
    build: () => [
      draw("Deposit", "ON_ACCEPTANCE", 30, 0),
      draw("Progress draw", "ON_PHASE", 40, 1),
      draw("Final payment", "ON_COMPLETION", 30, 2),
    ],
  },
  {
    key: "deposit-balance",
    label: "Deposit + balance",
    build: () => [
      draw("Deposit", "ON_ACCEPTANCE", 30, 0),
      draw("Balance on completion", "ON_COMPLETION", 70, 1),
    ],
  },
]

function lineAmount(line: PaymentScheduleLineInput, total: number): number {
  if (line.amount_type === "PERCENT") return (total * (line.amount_value || 0)) / 100
  return line.amount_value || 0
}

export function PaymentScheduleBuilder({
  total,
  billingMode,
  lines,
  onBillingModeChange,
  onLinesChange,
}: PaymentScheduleBuilderProps) {
  const scheduled = billingMode === "SCHEDULED"

  const reindex = (next: PaymentScheduleLineInput[]) =>
    next.map((l, i) => ({ ...l, order_index: i }))

  const updateLine = (idx: number, patch: Partial<PaymentScheduleLineInput>) =>
    onLinesChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const addLine = () =>
    onLinesChange(
      reindex([
        ...lines,
        draw(lines.length === 0 ? "Deposit" : "Payment", lines.length === 0 ? "ON_ACCEPTANCE" : "ON_COMPLETION", 0, lines.length),
      ]),
    )

  const removeLine = (idx: number) =>
    onLinesChange(reindex(lines.filter((_, i) => i !== idx)))

  const applyPreset = (build: () => PaymentScheduleLineInput[]) => onLinesChange(build())

  const pctSum = lines
    .filter((l) => l.amount_type === "PERCENT")
    .reduce((s, l) => s + (l.amount_value || 0), 0)
  const scheduledTotal = lines.reduce((s, l) => s + lineAmount(l, total), 0)
  const hasFixed = lines.some((l) => l.amount_type === "FIXED")
  const pctOver = pctSum > 100.01
  const pctUnder = !hasFixed && lines.length > 0 && Math.abs(pctSum - 100) > 0.01

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="space-y-2">
        <Label>Billing</Label>
        <div className="inline-flex rounded-lg border border-border/70 p-1">
          <button
            type="button"
            onClick={() => onBillingModeChange("LUMP_SUM")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !scheduled ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Lump sum
          </button>
          <button
            type="button"
            onClick={() => onBillingModeChange("SCHEDULED")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              scheduled ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Payment schedule (draws)
          </button>
        </div>
      </div>

      {scheduled && (
        <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-background/70 p-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Quick start:</span>
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => applyPreset(p.build)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No draws yet. Pick a preset above or add one below.
              </p>
            )}
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 p-2 sm:flex-nowrap"
              >
                {/* Label */}
                <div className="min-w-[140px] flex-1 space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Draw</Label>}
                  <Input
                    value={line.label}
                    placeholder="Deposit"
                    onChange={(e) => updateLine(idx, { label: e.target.value })}
                    className="h-9"
                  />
                </div>

                {/* Amount + type */}
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Amount</Label>}
                  <div className="flex">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.amount_value === 0 ? "" : line.amount_value}
                      onChange={(e) =>
                        updateLine(idx, {
                          amount_value: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-9 w-20 rounded-r-none"
                    />
                    <Select
                      value={line.amount_type}
                      onValueChange={(v) => updateLine(idx, { amount_type: v as PaymentAmountType })}
                    >
                      <SelectTrigger className="h-9 w-14 rounded-l-none border-l-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">%</SelectItem>
                        <SelectItem value="FIXED">$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trigger */}
                <div className="min-w-[160px] space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Bill when</Label>}
                  <Select
                    value={line.trigger_type}
                    onValueChange={(v) => updateLine(idx, { trigger_type: v as PaymentTriggerType })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIGGER_LABELS) as PaymentTriggerType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRIGGER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trigger detail (phase / date) */}
                {line.trigger_type === "ON_PHASE" && (
                  <div className="min-w-[120px] space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Phase</Label>}
                    <Input
                      value={line.trigger_phase ?? ""}
                      placeholder="Rough-in"
                      onChange={(e) => updateLine(idx, { trigger_phase: e.target.value || null })}
                      className="h-9"
                    />
                  </div>
                )}
                {line.trigger_type === "ON_DATE" && (
                  <div className="min-w-[140px] space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Date</Label>}
                    <Input
                      type="date"
                      value={line.trigger_date ?? ""}
                      onChange={(e) => updateLine(idx, { trigger_date: e.target.value || null })}
                      className="h-9"
                    />
                  </div>
                )}

                {/* Computed $ */}
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">≈ Amount</Label>}
                  <div className="flex h-9 items-center px-1 text-sm font-medium tabular-nums">
                    {fmt(lineAmount(line, total))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLine(idx)}
                  aria-label="Remove draw"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="h-8" onClick={addLine}>
            <Plus className="mr-1 h-4 w-4" /> Add draw
          </Button>

          {/* Footer / totals */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
            <span className="text-muted-foreground">
              Contract total: <strong className="text-foreground">{fmt(total)}</strong>
            </span>
            <span className="text-muted-foreground">
              Scheduled:{" "}
              <strong className={cn("text-foreground tabular-nums", pctOver && "text-destructive")}>
                {fmt(scheduledTotal)}
              </strong>{" "}
              {!hasFixed && `(${pctSum.toFixed(0)}%)`}
            </span>
          </div>

          {(pctOver || pctUnder) && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                pctOver ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {pctOver
                ? `Draws exceed 100% of the contract (${pctSum.toFixed(0)}%). Reduce them before saving.`
                : `Draws add up to ${pctSum.toFixed(0)}% — they don't cover the full contract yet.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
