"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalendarPlusIcon, Loader2Icon } from "lucide-react"
import { FollowupSettings } from "@/components/followup-settings"
import {
  ScheduledFollowupsList,
  type FollowupStats,
} from "@/components/scheduled-followups-list"
import { ScheduleFollowupDialog } from "@/components/schedule-followup-dialog"
import { api } from "@/lib/api"
import { ContractorProfile } from "@/lib/types"
import { AuthGuard } from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

const EMPTY_STATS: FollowupStats = { total: 0, pending: 0, sent: 0, failed: 0 }

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: number
  valueClassName?: string
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", valueClassName)}>{value}</div>
    </Card>
  )
}

export default function SchedulingPage() {
  const t = useTranslations("scheduling")
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [stats, setStats] = useState<FollowupStats>(EMPTY_STATS)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMyProfile()
        setProfile(data)
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleStatsChange = useCallback((next: FollowupStats) => setStats(next), [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <main className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
                  <p className="text-sm text-muted-foreground md:text-base">{t("subtitle")}</p>
                </div>
                <Button onClick={() => setShowScheduleDialog(true)}>
                  <CalendarPlusIcon className="mr-2 h-4 w-4" />
                  {t("scheduleShort")}
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label={t("list.total")} value={stats.total} />
                <StatCard label={t("list.pending")} value={stats.pending} valueClassName="text-blue-500" />
                <StatCard label={t("list.sent")} value={stats.sent} valueClassName="text-green-500" />
                <StatCard label={t("list.failed")} value={stats.failed} valueClassName="text-red-500" />
              </div>

              {/* Automations + Activity */}
              <div className="grid gap-6 lg:grid-cols-5">
                <section className="space-y-3 lg:col-span-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("automations")}
                  </h2>
                  <FollowupSettings contractorId={profile?.contractor_ai_sp_id} />
                </section>

                <section className="space-y-3 lg:col-span-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("activity")}
                  </h2>
                  <ScheduledFollowupsList
                    contractorId={profile?.contractor_ai_sp_id}
                    refreshKey={refreshKey}
                    onStatsChange={handleStatsChange}
                  />
                </section>
              </div>
            </div>
          )}

          <ScheduleFollowupDialog
            contractorId={profile?.contractor_ai_sp_id}
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            onScheduled={() => setRefreshKey((k) => k + 1)}
          />
        </main>
      </div>
    </AuthGuard>
  )
}
