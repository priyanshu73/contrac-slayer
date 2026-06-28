"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CalendarPlusIcon, Loader2Icon, Settings2Icon } from "lucide-react"
import { FollowupSettings } from "@/components/followup-settings"
import {
  ScheduledFollowupsList,
  type FollowupStats,
} from "@/components/scheduled-followups-list"
import { ScheduleFollowupDialog, type EditFollowup } from "@/components/schedule-followup-dialog"
import { api } from "@/lib/api"
import { ContractorProfile } from "@/lib/types"
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

export function FollowupsManager() {
  const t = useTranslations("scheduling")
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [editFollowup, setEditFollowup] = useState<EditFollowup | null>(null)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setEditFollowup(null)
            setShowScheduleDialog(true)
          }}
        >
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

      {/* Activity leads; automations is set-once config tucked into a tab */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">{t("activity")}</TabsTrigger>
          <TabsTrigger value="automations">
            <Settings2Icon className="mr-1.5 h-4 w-4" />
            {t("automations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <ScheduledFollowupsList
            contractorId={profile?.contractor_ai_sp_id}
            refreshKey={refreshKey}
            onStatsChange={handleStatsChange}
            onSchedule={() => {
              setEditFollowup(null)
              setShowScheduleDialog(true)
            }}
            onEdit={(f) => {
              setEditFollowup({
                id: f.id,
                customer_number: f.customer_number,
                customer_name: f.customer_name,
                message_text: f.message_text,
                scheduled_for: f.scheduled_for,
              })
              setShowScheduleDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="automations">
          <div className="max-w-2xl">
            <FollowupSettings contractorId={profile?.contractor_ai_sp_id} />
          </div>
        </TabsContent>
      </Tabs>

      <ScheduleFollowupDialog
        contractorId={profile?.contractor_ai_sp_id}
        open={showScheduleDialog}
        onOpenChange={(o) => {
          setShowScheduleDialog(o)
          if (!o) setEditFollowup(null)
        }}
        editFollowup={editFollowup}
        onScheduled={() => setRefreshKey((k) => k + 1)}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
