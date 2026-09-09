"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { ChevronRight, ListChecks, RefreshCw } from "lucide-react"

import { api } from "@/lib/api"
import type { WorkflowRun } from "@/lib/types/workflow"
import { WORKFLOW_KIND_LABEL } from "@/lib/types/workflow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { RunStatusBadge, formatWhen } from "@/components/workflows/shared"

const SECTIONS: { title: string; hint: string; statuses: WorkflowRun["status"][] }[] = [
  { title: "Waiting for you", hint: "Drafted packets. Open one, check it, approve or reject.", statuses: ["AWAITING_REVIEW"] },
  { title: "In progress", hint: "Drafting or applying in the background.", statuses: ["DRAFTING", "APPLYING"] },
  { title: "Needs attention", hint: "Something failed. Open the run to retry.", statuses: ["FAILED"] },
  { title: "Recent", hint: "", statuses: ["COMPLETED", "REJECTED", "CANCELLED"] },
]

function RunRow({ run, locale }: { run: WorkflowRun; locale: string }) {
  const progress = run.job_progress ?? {}
  const live = run.status === "DRAFTING" || run.status === "APPLYING"
  return (
    <Link
      href={`/${locale}/workflows/${run.uuid}`}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{WORKFLOW_KIND_LABEL[run.kind] ?? run.kind}</span>
          <RunStatusBadge status={run.status} />
          <span className="text-xs text-muted-foreground">{formatWhen(run.drafted_at ?? run.created_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {live
            ? progress.message ?? "Working…"
            : run.status === "FAILED"
              ? run.error ?? "Failed"
              : run.summary ?? `${run.trigger_ref_kind} ${run.trigger_ref_id}`}
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
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRuns(null)
    try {
      const data = await api.getWorkflowRuns({ limit: 100 })
      setRuns(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load workflows")
      setRuns((prev) => prev ?? [])
    }
  }, [])

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
            <h1 className="text-2xl font-semibold">Workflows</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Packets the assistant drafted for you. Nothing is created or sent until you approve it.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(false)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
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
              <EmptyTitle>No workflow runs yet</EmptyTitle>
              <EmptyDescription>
                Open a lead and choose “Draft quote packet”, or ask the assistant to draft a quote for a lead.
                Turn on auto-start in Settings to draft one for every new lead.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href={`/${locale}/leads`}>Go to leads</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-8">
            {SECTIONS.map((section) => {
              const rows = runs.filter((r) => section.statuses.includes(r.status))
              if (!rows.length) return null
              return (
                <Card key={section.title} className="border-0 shadow-none">
                  <CardHeader className="px-0 pb-3">
                    <CardTitle className="text-base">
                      {section.title} <span className="ml-1 text-sm font-normal text-muted-foreground">{rows.length}</span>
                    </CardTitle>
                    {section.hint && <CardDescription>{section.hint}</CardDescription>}
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
    </div>
  )
}
