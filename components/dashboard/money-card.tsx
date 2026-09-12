"use client"

import { useLocale } from "next-intl"
import Link from "next/link"
import type { DashboardMoney } from "@/lib/types/dashboard"

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)

const moneyShort = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

const SEGMENTS = [
  { key: "past_due_total", label: "Past due", color: "#e11d48" },
  { key: "due_this_month_total", label: "Due this month", color: "#d97706" },
  { key: "later", label: "Later", color: "#e2e8f0" },
] as const

export function MoneyCard({
  money: m,
  bare = false,
}: {
  money: DashboardMoney | null
  bare?: boolean
}) {
  const locale = useLocale()
  const shell = bare
    ? "px-5 pb-4 pt-5"
    : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
  if (!m) {
    return (
      <div className={shell}>
        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-2 w-full animate-pulse rounded bg-slate-100" />
      </div>
    )
  }
  const later = m.due_later_total
  const values: Record<string, number> = {
    past_due_total: m.past_due_total,
    due_this_month_total: m.due_this_month_total,
    later,
  }
  const total = Math.max(m.unpaid_total, 0.01)

  return (
    <div className={shell}>
      <h2 className="text-[15px] font-semibold text-slate-900">Money</h2>
      <p className="mt-2 font-mono text-[26px] font-bold tabular-nums leading-none text-slate-900">
        {money(m.unpaid_total)}
      </p>
      <p className="mt-1 text-[12.5px] text-slate-500">
        outstanding across {m.unpaid_count} invoice{m.unpaid_count === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex h-2 w-full gap-px overflow-hidden rounded-full bg-slate-100">
        {SEGMENTS.map((s) =>
          values[s.key] > 0 ? (
            <div
              key={s.key}
              className="h-full"
              style={{
                background: s.color,
                width: `${Math.max((values[s.key] / total) * 100, 2)}%`,
              }}
            />
          ) : null
        )}
      </div>

      <div className="mt-3 space-y-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {moneyShort(values[s.key])}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[13px]">
        <span className="text-slate-600">Paid · last 30d</span>
        <Link
          href={`/${locale}/invoices`}
          className="font-mono font-semibold tabular-nums text-emerald-600 hover:underline"
        >
          {moneyShort(m.paid_last_30d)}
        </Link>
      </div>
    </div>
  )
}
