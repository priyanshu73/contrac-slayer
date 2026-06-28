"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  PaymentScheduleBuilder,
  PAYMENT_PRESETS,
  matchPresetKey,
} from "@/components/payment-schedule-builder"
import type { PaymentScheduleLineInput } from "@/lib/types"

const billingInputSurfaceClass =
  "border-slate-300/80 bg-slate-50/80 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20 disabled:bg-slate-100/70"

interface BillingSectionProps {
  /** Contract grand total, used to preview each draw's dollar amount. */
  total: number
  lines: PaymentScheduleLineInput[]
  onLinesChange: (lines: PaymentScheduleLineInput[]) => void
  /** Whether the user has explicitly picked a billing type. Until they do, the
   * Billing select shows a "Select Payment Schedule" placeholder instead of
   * defaulting to "Single payment" (what an empty schedule would match). */
  billingChosen: boolean
  onBillingChosenChange: (chosen: boolean) => void
  title?: string
  className?: string
}

/**
 * Billing controls shared by the quote editor and the Create Invoice flow:
 * a payment-schedule preset dropdown plus the per-draw builder. Same logic in
 * both places so they never drift apart.
 */
export function BillingSection({
  total,
  lines,
  onLinesChange,
  billingChosen,
  onBillingChosenChange,
  title = "Billing",
  className,
}: BillingSectionProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="w-[220px]">
          <Select
            // Once any draw is billed, the schedule is partly locked —
            // changing presets would wipe billed draws, so disable it.
            disabled={lines.some((l) => l.locked)}
            value={billingChosen ? matchPresetKey(lines) : undefined}
            onValueChange={(key) => {
              onBillingChosenChange(true)
              if (key === "custom") {
                if (lines.length === 0) {
                  onLinesChange([
                    {
                      label: "Deposit",
                      trigger_type: "ON_COMPLETION",
                      trigger_phase: null,
                      trigger_date: null,
                      amount_type: "PERCENT",
                      amount_value: 0,
                      order_index: 0,
                    },
                  ])
                }
                return
              }
              const preset = PAYMENT_PRESETS.find((p) => p.key === key)
              if (preset) onLinesChange(preset.build())
            }}
          >
            <SelectTrigger id="billing" className={billingInputSurfaceClass}>
              <SelectValue placeholder="Select Payment Schedule" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Draw schedule builder */}
      <div className={cn("mt-3 border-t border-border/60 pt-3")}>
        <PaymentScheduleBuilder
          total={total}
          lines={lines}
          onLinesChange={onLinesChange}
        />
      </div>
    </div>
  )
}
