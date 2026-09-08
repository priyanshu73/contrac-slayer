"use client"

import type { DashboardSummary } from "@/lib/types/dashboard"

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

function Cell({
  label,
  value,
  unit,
  tone = "ink",
}: {
  label: string
  value: string
  unit?: string
  tone?: "ink" | "alert"
}) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 truncate font-mono text-[22px] font-bold tabular-nums leading-none ${
          tone === "alert" ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
        {unit ? (
          <span className="ml-1.5 font-sans text-[13px] font-medium normal-case tracking-normal text-slate-500">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  )
}

export function KpiStrip({ summary }: { summary: DashboardSummary | null }) {
  if (!summary) {
    return (
      <div className="flex divide-x divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 px-5 py-4">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }
  const { money: m, quotes, leads, schedule } = summary
  return (
    <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm sm:flex-row sm:divide-x sm:divide-y-0">
      <Cell label="Unpaid" value={money(m.unpaid_total)} />
      <Cell label="Past due" value={money(m.past_due_total)} tone={m.past_due_total > 0 ? "alert" : "ink"} />
      <Cell label="Awaiting reply" value={String(quotes.awaiting_reply_count)} unit="quotes" />
      <Cell label="New leads · 7d" value={String(leads.new_last_7d)} />
      <Cell label="Booked this week" value={String(schedule.booked_this_week)} unit="jobs" />
    </div>
  )
}
