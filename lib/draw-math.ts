import type { PaymentScheduleLineInput } from "@/lib/types"

// ─── Draw math (industry-standard) ───────────────────────────────────────────
// Each percentage draw is a share of the FULL contract total (so 30/40/30 sums
// to 100%), and fixed draws bill their flat amount. When the schedule allocates
// the whole contract (the exact, unrounded sum of its shares equals the total),
// the LAST unbilled draw absorbs the rounding remainder, so a 100% schedule
// bills the contract to the cent instead of leaving an unbillable penny.
// Deliberately partial schedules are never topped up.
//
// All math is in integer cents, mirroring the backend's Decimal arithmetic in
// `compute_draw_amounts` (app/services/payment_schedule_logic.py), so previews,
// creation/edit validation, and the API agree exactly. `remainingAfter` is just
// the contract total minus everything billed top-to-bottom, for display.

export interface DrawComputation {
  amount: number
  /** The independently rounded share, before any rounding reconciliation. */
  plannedAmount: number
  remainingAfter: number
}

const toCents = (n: number) => Math.round(n * 100)

/** Tolerance for the exact-sum test, in cents: float dust only, never a real
 * cent. The backend decides authoritatively with exact Decimal arithmetic. */
const EXACT_EPSILON_CENTS = 1e-4

const exactShareCents = (line: PaymentScheduleLineInput, totalCents: number) =>
  line.amount_type === "PERCENT"
    ? (totalCents * (line.amount_value || 0)) / 100
    : toCents(line.amount_value || 0)

/** True when the schedule is meant to bill exactly the whole contract: the
 * exact (unrounded) sum of its percentage shares and fixed amounts equals the
 * total. A 30/40/30 plan qualifies; a deliberate 30/40 partial does not. */
export function isFullAllocation(lines: PaymentScheduleLineInput[], total: number): boolean {
  const totalCents = toCents(total)
  if (lines.length === 0 || totalCents <= 0) return false
  const exact = lines.reduce((s, l) => s + exactShareCents(l, totalCents), 0)
  return Math.abs(exact - totalCents) < EXACT_EPSILON_CENTS
}

export function computeDraws(
  lines: PaymentScheduleLineInput[],
  total: number,
): DrawComputation[] {
  const totalCents = toCents(total)
  const planned = lines.map((l) => Math.round(exactShareCents(l, totalCents)))
  // A billed draw is frozen at its invoice amount — never re-scaled. Without a
  // recorded amount, fall back to its planned share so it still counts as
  // billed.
  const frozen = lines.map((l, i) =>
    l.locked ? (l.lockedAmount != null ? toCents(l.lockedAmount) : planned[i]) : undefined,
  )

  // The last unbilled draw of a full-allocation schedule reconciles the
  // rounding remainder against the frozen and planned amounts of the others. A
  // cancelled invoice releases its draw, making it unbilled again.
  let balanceIdx = -1
  if (isFullAllocation(lines, total)) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (frozen[i] === undefined) {
        balanceIdx = i
        break
      }
    }
  }

  const effective = lines.map((_, i) => (frozen[i] !== undefined ? (frozen[i] as number) : planned[i]))
  if (balanceIdx >= 0) {
    effective[balanceIdx] =
      totalCents - effective.reduce((s, e, i) => (i === balanceIdx ? s : s + e), 0)
  }

  let remaining = totalCents
  return lines.map((_, i) => {
    remaining -= effective[i]
    return {
      amount: effective[i] / 100,
      plannedAmount: planned[i] / 100,
      remainingAfter: remaining / 100,
    }
  })
}

/** True when the draws allocate more than the contract total — either a plain
 * over-schedule or earlier draws that leave a negative balancing draw. Strict
 * integer-cent comparison: no one-cent overage loophole. */
export function drawsOverContract(lines: PaymentScheduleLineInput[], total: number): boolean {
  if (lines.length === 0 || total <= 0) return false
  const computed = computeDraws(lines, total)
  const totalCents = toCents(total)
  const sumCents = computed.reduce((s, c) => s + Math.round(c.amount * 100), 0)
  return sumCents > totalCents || computed.some((c) => c.amount < 0)
}
