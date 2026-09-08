"use client"

import { useCallback, useEffect, useState } from "react"

import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { MoneyCard } from "@/components/dashboard/money-card"
import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { PipelineCard } from "@/components/dashboard/pipeline-card"
import { TodayHeader } from "@/components/dashboard/today-header"
import { DashboardFrontline } from "@/components/dashboard/dashboard-frontline"
import { DashboardWeekStrip } from "@/components/dashboard-week-strip"
import { OpsAiNumberSetupPrompt } from "@/components/ops-ai-number-setup-prompt"
import { api } from "@/lib/api"
import type { ActionQueueResponse, DashboardSummary } from "@/lib/types/dashboard"

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [queue, setQueue] = useState<ActionQueueResponse | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)

  const loadQueue = useCallback(() => {
    setQueueLoading(true)
    api
      .getActionQueue()
      .then(setQueue)
      .catch(() => {})
      .finally(() => setQueueLoading(false))
  }, [])

  const loadSummary = useCallback(() => {
    api
      .getDashboardSummary()
      .then(setSummary)
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadSummary()
    loadQueue()
  }, [loadSummary, loadQueue])

  // Queue actions (reminder sent, task done, snooze) change summary numbers too.
  const refreshAll = useCallback(() => {
    loadQueue()
    loadSummary()
  }, [loadQueue, loadSummary])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-sky-50/40 pb-24 md:pb-10">
      <main className="mx-auto max-w-[1200px] px-4 pt-6 lg:px-6">
        <OpsAiNumberSetupPrompt />

        <TodayHeader summary={summary} queue={queue} />

        <div className="mt-5">
          <KpiStrip summary={summary} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main column */}
          <div className="min-w-0 space-y-5">
            <NeedsYouCard queue={queue} loading={queueLoading} onRefresh={refreshAll} />
            <DashboardWeekStrip />
          </div>

          {/* Right rail — self-sized cards; don't stretch to the left column's height */}
          <div className="min-w-0 space-y-4 self-start">
            {/* Money + Pipeline share one card to cut vertical scroll */}
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <MoneyCard money={summary?.money ?? null} bare />
              <PipelineCard summary={summary} bare />
            </div>
            <DashboardFrontline />
          </div>
        </div>
      </main>
    </div>
  )
}
