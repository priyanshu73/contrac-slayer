"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import Link from "next/link"

import { api } from "@/lib/api"
import type { PipelineResponse } from "@/lib/types/analytics"
import type { DashboardSummary } from "@/lib/types/dashboard"

const moneyShort = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

// Wireframe shows the active funnel only (no "Paid"/"Completed" history rows).
const STAGE_LABELS: Record<string, string> = {
  Leads: "New leads",
  Quoted: "Quoted · awaiting",
  Accepted: "Accepted",
  "In Progress": "In progress",
}

const STAGE_COLORS: Record<string, string> = {
  Leads: "#0f172a",
  Quoted: "#0284c7",
  Accepted: "#059669",
  "In Progress": "#d97706",
}

export function PipelineCard({
  summary,
  bare = false,
}: {
  summary: DashboardSummary | null
  bare?: boolean
}) {
  const locale = useLocale()
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - 89 * 24 * 3600 * 1000)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    api
      .getAnalyticsPipeline({ from: iso(from), to: iso(to) })
      .then((res) => {
        if (!cancelled) setPipeline(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const stages = (pipeline?.stages || []).filter((s) => STAGE_LABELS[s.stage])
  const maxCount = Math.max(...stages.map((s) => s.count), 1)
  const totalAmount = stages.reduce((sum, s) => sum + (s.amount || 0), 0)
  const noProject = summary?.quotes.accepted_no_project_count ?? 0

  return (
    <div className={bare ? "px-5 pb-5 pt-4" : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Pipeline</h2>
        {totalAmount > 0 && (
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-400">
            {moneyShort(totalAmount)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {stages.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-1.5 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))
          : stages.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-700">{STAGE_LABELS[s.stage]}</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {s.count}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: STAGE_COLORS[s.stage],
                      width: `${Math.max((s.count / maxCount) * 100, s.count > 0 ? 6 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
      </div>

      {noProject > 0 && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-[12.5px] text-slate-500">
          {noProject} accepted quote{noProject === 1 ? " has" : "s have"} no project attached.{" "}
          <Link href={`/${locale}/quotes?status=ACCEPTED`} className="text-sky-700 hover:underline">
            Review
          </Link>
        </p>
      )}
    </div>
  )
}
