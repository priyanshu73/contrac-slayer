"use client"

import { useCallback, useEffect, useState } from "react"

import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { TodayHeader } from "@/components/dashboard/today-header"
import { DashboardWeekStrip } from "@/components/dashboard-week-strip"
import { DashboardContractorOpsNumber } from "@/components/dashboard-contractor-ops-number"
import { DashboardWorkspaceDrawer } from "@/components/dashboard/dashboard-workspace-drawer"
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

        {/* 1. Header with Date and Quick Actions */}
        <TodayHeader summary={summary} queue={queue} />

        {/* Keep the assigned ContractorOps number immediately accessible from the dashboard. */}
        <div className="mt-5">
          <DashboardContractorOpsNumber />
        </div>

        {/* 2. Prominent Calendar / Week Strip at the Top */}
        <div className="mt-5">
          <DashboardWeekStrip />
        </div>

        {/* 3. Core 2-Column Layout */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Main column: Action Queue */}
          <div className="min-w-0 space-y-5">
            <NeedsYouCard queue={queue} loading={queueLoading} onRefresh={refreshAll} />
          </div>

          {/* Right rail: Search, Tabbed Workspace (Projects, Quotes, Invoices), & Compact Financials */}
          <div className="min-w-0 space-y-4 self-start">
            <DashboardWorkspaceDrawer summary={summary} onRefresh={refreshAll} />
          </div>
        </div>
      </main>
    </div>
  )
}
