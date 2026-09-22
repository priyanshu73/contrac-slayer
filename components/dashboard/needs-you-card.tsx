"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Check } from "lucide-react"

import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import type { ActionQueueItem, ActionQueueResponse, ActionSeverity } from "@/lib/types/dashboard"

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const RAIL: Record<ActionSeverity, string> = {
  money: "bg-emerald-500",
  hot: "bg-rose-500",
  warn: "bg-amber-400",
  info: "bg-sky-400",
}

const CHIP: Record<ActionSeverity, string> = {
  money: "bg-emerald-50 text-emerald-700",
  hot: "bg-rose-50 text-rose-700",
  warn: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
}

function chipLabel(item: ActionQueueItem): string {
  const age = item.age_days
  switch (item.type) {
    case "INVOICE_OVERDUE":
      return age ? `OVERDUE ${age}D` : "OVERDUE"
    case "DRAW_READY":
      return "DRAW READY"
    case "QUOTE_VIEWED":
      return "VIEWED"
    case "QUOTE_CHANGES_REQUESTED":
      return "CHANGES"
    case "QUOTE_UNVIEWED":
      return age ? `NO VIEWS ${age}D` : "NO VIEWS"
    case "QUOTE_ACCEPTED_NO_PROJECT":
      return age && age >= 7 ? `NO PROJECT ${Math.floor(age / 7)}W` : "NO PROJECT"
    case "QUOTE_EXPIRING":
      return "EXPIRING"
    case "TRADE_PENDING":
      return "TRADE"
    case "TASK_DUE":
      return "TASK"
    case "LEAD_UNCONTACTED":
      return "LEAD"
    default:
      return item.type
  }
}

const PRIMARY_ACTION_LABEL: Record<string, string> = {
  send_reminder: "Send reminder",
  bill_draw: "Bill draw",
  start_project: "Start project",
  mark_done: "Mark done",
  open_lead: "Open lead",
}

export function NeedsYouCard({
  queue,
  loading,
  onRefresh,
}: {
  queue: ActionQueueResponse | null
  loading: boolean
  onRefresh: () => void
}) {
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [snoozingAll, setSnoozingAll] = useState(false)
  const [projectFromQuote, setProjectFromQuote] = useState<{ jobId: number; title?: string } | null>(null)
  // key → completion label. A row lingers in its "done" state briefly so the
  // user sees the action land before the refresh removes it from the queue.
  const [doneKeys, setDoneKeys] = useState<Record<string, string>>({})

  const items = queue?.items ?? []

  const markDone = (key: string, label: string) => {
    setDoneKeys((prev) => ({ ...prev, [key]: label }))
    setTimeout(onRefresh, 1200)
  }

  const runPrimary = async (item: ActionQueueItem) => {
    const go = (path: string) => router.push(`/${locale}${path}`)
    switch (item.primary_action) {
      case "send_reminder":
        setBusyKey(item.key)
        try {
          const res = await api.sendReminder("INVOICE", item.entity.id)
          toast({ title: res.message })
          markDone(item.key, "Reminder sent")
        } catch (e) {
          toast({
            title: "Couldn't send reminder",
            description: e instanceof Error ? e.message : undefined,
            variant: "destructive",
          })
        } finally {
          setBusyKey(null)
        }
        return
      case "start_project":
        setProjectFromQuote({ jobId: item.entity.id, title: item.title })
        return
      case "mark_done": {
        // Task items link to their project page; the id in the href is the
        // project id the PATCH needs (the entity id is the task id).
        const projectId = Number(item.href.match(/\/projects\/(\d+)/)?.[1])
        if (!projectId) return go(item.href)
        setBusyKey(item.key)
        try {
          await api.updateProjectTask(projectId, item.entity.id, { status: "COMPLETED" })
          toast({ title: "Task completed" })
          markDone(item.key, "Task completed")
        } catch (e) {
          toast({
            title: "Couldn't complete task",
            description: e instanceof Error ? e.message : undefined,
            variant: "destructive",
          })
        } finally {
          setBusyKey(null)
        }
        return
      }
      default:
        go(item.href)
    }
  }

  const snoozeAll = async () => {
    if (!items.length) return
    setSnoozingAll(true)
    try {
      const until = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      const res = await api.snoozeActionItems(items.map((i) => i.key), until)
      toast({ title: `Snoozed ${res.snoozed} item${res.snoozed === 1 ? "" : "s"} for a week` })
      onRefresh()
    } catch (e) {
      toast({
        title: "Couldn't snooze",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSnoozingAll(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-[15px] font-semibold text-slate-900">
          Needs you{" "}
          {queue ? <span className="font-normal text-slate-400">{items.length}</span> : null}
        </h2>
        <div className="flex items-center gap-3 text-[12.5px]">
          {queue && queue.counts.snoozed > 0 && (
            <span className="text-slate-400">{queue.counts.snoozed} snoozed</span>
          )}
          <button
            onClick={snoozeAll}
            disabled={snoozingAll || !items.length}
            className="font-medium text-sky-700 hover:underline disabled:opacity-40"
          >
            Snooze all
          </button>
        </div>
      </div>

      <div className="max-h-[380px] space-y-1.5 overflow-y-auto p-3">
          {loading && !queue ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">You&apos;re all caught up</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Nothing needs action right now.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const doneLabel = doneKeys[item.key]
              if (doneLabel) {
                return (
                  <div
                    key={item.key}
                    className="relative flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 py-2.5 pl-4 pr-3 transition-all"
                  >
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-emerald-500" />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-emerald-800">{doneLabel}</p>
                      <p className="truncate text-[12.5px] text-emerald-700/70">{item.title}</p>
                    </div>
                  </div>
                )
              }
              return (
                <div
                  key={item.key}
                  onClick={() => router.push(`/${locale}${item.href}`)}
                  className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-transparent py-2.5 pl-4 pr-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full ${RAIL[item.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.08em] ${CHIP[item.severity]}`}
                      >
                        {chipLabel(item)}
                      </span>
                      <p className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{item.subtitle}</p>
                  </div>
                  {item.amount != null && item.amount > 0 && (
                    <span className="shrink-0 font-mono text-[14px] font-bold tabular-nums text-slate-900">
                      {money(item.amount)}
                    </span>
                  )}
                  {item.primary_action && PRIMARY_ACTION_LABEL[item.primary_action] && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        runPrimary(item)
                      }}
                      disabled={busyKey === item.key}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                        item.severity === "hot" || item.severity === "money"
                          ? "bg-slate-900 text-white hover:bg-slate-700"
                          : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {busyKey === item.key ? "…" : PRIMARY_ACTION_LABEL[item.primary_action]}
                    </button>
                  )}
                </div>
              )
            })
          )}
      </div>

      <NewProjectDialog
        open={projectFromQuote !== null}
        onOpenChange={(open) => !open && setProjectFromQuote(null)}
        onProjectCreated={(projectId) => {
          setProjectFromQuote(null)
          onRefresh()
          router.push(`/${locale}/projects/${projectId}`)
        }}
        fromQuote={projectFromQuote ?? undefined}
      />
    </div>
  )
}
