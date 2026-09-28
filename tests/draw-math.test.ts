import assert from "node:assert/strict"
import { test } from "node:test"
import { computeDraws, drawsOverContract, isFullAllocation } from "../lib/draw-math"
import type { PaymentScheduleLineInput } from "../lib/types"

const pct = (value: number, extra: Partial<PaymentScheduleLineInput> = {}): PaymentScheduleLineInput => ({
  label: "draw",
  trigger_type: "ON_COMPLETION",
  amount_type: "PERCENT",
  amount_value: value,
  order_index: 0,
  ...extra,
})

const fixed = (value: number, extra: Partial<PaymentScheduleLineInput> = {}): PaymentScheduleLineInput => ({
  label: "draw",
  trigger_type: "ON_COMPLETION",
  amount_type: "FIXED",
  amount_value: value,
  order_index: 0,
  ...extra,
})

const amounts = (lines: PaymentScheduleLineInput[], total: number) =>
  computeDraws(lines, total).map((c) => c.amount)

test("quote #250 case: $1,082.51 at 30/40/30 reconciles the final draw to the cent", () => {
  const lines = [pct(30), pct(40), pct(30)]
  assert.deepEqual(amounts(lines, 1082.51), [324.75, 433.0, 324.76])
  const computed = computeDraws(lines, 1082.51)
  assert.equal(computed[2].remainingAfter, 0)
  assert.equal(isFullAllocation(lines, 1082.51), true)
  assert.equal(drawsOverContract(lines, 1082.51), false)
})

test("half-cent residual: $10.01 at 50/50 does not round up twice", () => {
  assert.deepEqual(amounts([pct(50), pct(50)], 10.01), [5.01, 5.0])
})

test("multi-cent residual: $99.99 in thirds stays at $99.99, not $100.00", () => {
  assert.deepEqual(amounts([pct(33.33), pct(33.33), pct(33.34)], 99.99), [33.33, 33.33, 33.33])
})

test("a deliberately partial 30/40 schedule is never topped up", () => {
  const lines = [pct(30), pct(40)]
  assert.equal(isFullAllocation(lines, 1082.51), false)
  const computed = computeDraws(lines, 1082.51)
  assert.deepEqual(computed.map((c) => c.amount), [324.75, 433.0])
  assert.equal(computed[1].remainingAfter, 324.76)
})

test("mixed fixed + percent plan that exactly covers the total reconciles", () => {
  const lines = [fixed(500), pct(50)]
  assert.equal(isFullAllocation(lines, 1000), true)
  assert.deepEqual(amounts(lines, 1000), [500, 500])
})

test("mixed plan whose exact sum misses the total is left partial", () => {
  const lines = [fixed(541.25), pct(50)]
  assert.equal(isFullAllocation(lines, 1082.51), false)
  assert.deepEqual(amounts(lines, 1082.51), [541.25, 541.26])
})

test("over-allocation (50/60) is flagged, not rebalanced away", () => {
  const lines = [pct(50), pct(60)]
  assert.equal(isFullAllocation(lines, 1000), false)
  assert.equal(drawsOverContract(lines, 1000), true)
})

test("a billed draw is frozen at its invoice amount; the last unbilled draw reconciles", () => {
  const lines = [pct(30, { locked: true, lockedAmount: 324.75 }), pct(40), pct(30)]
  assert.deepEqual(amounts(lines, 1082.51), [324.75, 433.0, 324.76])
})

test("draws billed out of order get the same amounts the preview showed", () => {
  const before = computeDraws([pct(30), pct(40), pct(30)], 1082.51)
  assert.equal(before[2].amount, 324.76)
  const lines = [pct(30), pct(40), pct(30, { locked: true, lockedAmount: before[2].amount })]
  assert.deepEqual(amounts(lines, 1082.51), [324.75, 433.0, 324.76])
})

test("a cancelled draw is unbilled again and reconciles from the remaining frozen invoices", () => {
  const lines = [pct(30, { locked: true, lockedAmount: 324.75 }), pct(40), pct(30)]
  assert.deepEqual(amounts(lines, 1082.51), [324.75, 433.0, 324.76])
})

test("all draws billed with a historic shortfall: frozen amounts are never rewritten", () => {
  const lines = [
    pct(30, { locked: true, lockedAmount: 324.75 }),
    pct(40, { locked: true, lockedAmount: 433.0 }),
    pct(30, { locked: true, lockedAmount: 324.75 }),
  ]
  assert.deepEqual(amounts(lines, 1082.51), [324.75, 433.0, 324.75])
})

test("a negative balancing draw is flagged as over-contract", () => {
  const lines = [
    pct(30, { locked: true, lockedAmount: 600 }),
    pct(40, { locked: true, lockedAmount: 500 }),
    pct(30),
  ]
  const computed = computeDraws(lines, 1082.51)
  assert.equal(computed[2].amount, -17.49)
  assert.equal(drawsOverContract(lines, 1082.51), true)
})
