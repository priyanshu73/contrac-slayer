"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronRight, ListChecks, Plus, RefreshCw } from "lucide-react"

import { api } from "@/lib/api"
import type { WorkflowRun } from "@/lib/types/workflow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { NewPacketDialog } from "@/components/workflows/new-packet-dialog"
import { RunStatusBadge, formatWhen, useWorkflowLabels } from "@/components/workflows/shared"

const SECTIONS: { id: string; title: string; hint: string | null; statuses: WorkflowRun["status"][] }[] = [
  { id: "waiting", title: "inbox.sectionWaiting", hint: "inbox.sectionWaitingHint", statuses: ["AWAITING_REVIEW"] },
  { id: "progress", title: "inbox.sectionProgress", hint: "inbox.sectionProgressHint", statuses: ["DRAFTING", "APPLYING"] },
  { id: "attention", title: "inbox.sectionAttention", hint: "inbox.sectionAttentionHint", statuses: ["FAILED"] },
  { id: "recent", title: "inbox.sectionRecent", hint: null, statuses: ["COMPLETED", "REJECTED", "CANCELLED"] },
]

function RunRow({ run, locale }: { run: WorkflowRun; locale: string }) {
  const t = useTranslations("leads.workflows")
  const labels = useWorkflowLabels()
  const progress = run.job_progress ?? {}
  const live = run.status === "DRAFTING" || run.status === "APPLYING"
  return (
    <Link
      href={`/${locale}/workflows/${run.uuid}`}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{labels.kind(run.kind)}</span>
          <RunStatusBadge status={run.status} />
          <span className="text-xs text-muted-foreground">{formatWhen(run.drafted_at ?? run.created_at, locale)}</span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {live
            ? progress.message ?? t("inbox.working")
            : run.status === "FAILED"
              ? run.error ?? t("inbox.failed")
              : run.summary ?? `${labels.refKind(run.trigger_ref_kind)} ${run.trigger_ref_id}`}
        </p>
        {live && progress.steps_total ? (
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(((progress.steps_done ?? 0) / progress.steps_total) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function WorkflowInboxPage() {
  const locale = useLocale()
  const t = useTranslations("leads.workflows")
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRuns(null)
    try {
      const data = await api.getWorkflowRuns({ limit: 100 })
      setRuns(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("inbox.loadFailed"))
      setRuns((prev) => prev ?? [])
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  // Poll only while something is moving in the background.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    const live = (runs ?? []).some((r) => r.status === "DRAFTING" || r.status === "APPLYING")
    if (live) pollRef.current = setInterval(() => load(false), 10_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [runs, load])

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("inbox.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inbox.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => load(false)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("inbox.refresh")}
            </Button>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("inbox.newPacket")}
            </Button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        {runs === null ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : runs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t("inbox.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("inbox.emptyDesc")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("inbox.newPacket")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-8">
            {SECTIONS.map((section) => {
              const rows = runs.filter((r) => section.statuses.includes(r.status))
              if (!rows.length) return null
              return (
                <Card key={section.id} className="border-0 shadow-none">
                  <CardHeader className="px-0 pb-3">
                    <CardTitle className="text-base">
                      {t(section.title)} <span className="ml-1 text-sm font-normal text-muted-foreground">{rows.length}</span>
                    </CardTitle>
                    {section.hint && <CardDescription>{t(section.hint)}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2 px-0">
                    {rows.map((run) => (
                      <RunRow key={run.uuid} run={run} locale={locale} />
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <NewPacketDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  )
}
