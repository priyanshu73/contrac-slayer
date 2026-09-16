"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CalendarPlusIcon, Loader2Icon, Settings2Icon } from "lucide-react"
import { FollowupSettings } from "@/components/followup-settings"
import { ScheduledFollowupsList } from "@/components/scheduled-followups-list"
import { ScheduleFollowupDialog, type EditFollowup } from "@/components/schedule-followup-dialog"
import { api } from "@/lib/api"
import type { ContractorProfile } from "@/lib/types"
import type { FollowupSummary } from "@/lib/types/followup"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

function StatCard({ label, value, hint, valueClassName }: { label: string; value: number | string; hint?: string; valueClassName?: string }) {
  return (
    <Card className="gap-0 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", valueClassName)}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  )
}

export function FollowupsManager() {
  const t = useTranslations("scheduling")
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [editFollowup, setEditFollowup] = useState<EditFollowup | null>(null)
  const [summary, setSummary] = useState<FollowupSummary | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setProfile(await api.getMyProfile())
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.getFollowupSummary(30))
    } catch {
      setSummary(null)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary, refreshKey])

  const bump = () => setRefreshKey((k) => k + 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sent = summary?.by_status.sent ?? 0
  const delivered = summary?.by_delivery.delivered ?? 0

  return (
    <div className="space-y-6">
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

      {/* Server-side stats (last 30 days) */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("list.pending")} value={summary?.by_status.pending ?? 0} valueClassName="text-blue-500" />
        <StatCard
          label={t("stats.sent30")}
          value={sent}
          hint={sent ? t("stats.deliveredOf", { delivered, sent }) : undefined}
          valueClassName="text-green-500"
        />
        <StatCard label={t("stats.replies30")} value={summary?.replies ?? 0} hint={t("stats.repliesHint")} />
      </div>

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
            onSchedule={() => {
              setEditFollowup(null)
              setShowScheduleDialog(true)
            }}
            onEdit={(f) => {
              setEditFollowup({
                id: f.id,
                customer_number: f.customer_number,
                customer_name: f.customer_name ?? undefined,
                message_text: f.message_text,
                scheduled_for: f.scheduled_for,
              })
              setShowScheduleDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="automations">
          <div className="max-w-4xl">
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
        onScheduled={bump}
        onUpdated={bump}
      />
    </div>
  )
}
