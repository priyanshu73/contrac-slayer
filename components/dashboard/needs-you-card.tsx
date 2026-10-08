"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
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

function chipLabel(item: ActionQueueItem, t: (key: string, values?: Record<string, number>) => string): string {
  const age = item.age_days
  switch (item.type) {
    case "INVOICE_OVERDUE":
      return age ? t("chipOverdueDays", { days: age }) : t("chipOverdue")
    case "DRAW_READY":
      return t("chipDrawReady")
    case "QUOTE_VIEWED":
      return t("chipViewed")
    case "QUOTE_CHANGES_REQUESTED":
      return t("chipChanges")
    case "QUOTE_UNVIEWED":
      return age ? t("chipNoViewsDays", { days: age }) : t("chipNoViews")
    case "QUOTE_ACCEPTED_NO_PROJECT":
      return age && age >= 7 ? t("chipNoProjectWeeks", { weeks: Math.floor(age / 7) }) : t("chipNoProject")
    case "QUOTE_EXPIRING":
      return t("chipExpiring")
    case "TRADE_PENDING":
      return t("chipTrade")
    case "TASK_DUE":
      return t("chipTask")
    case "LEAD_UNCONTACTED":
      return t("chipLead")
    default:
      return item.type
  }
}

const PRIMARY_ACTION_LABEL: Record<string, string> = {
  send_reminder: "actionSendReminder",
  bill_draw: "actionBillDraw",
  start_project: "actionStartProject",
  mark_done: "actionMarkDone",
  open_lead: "actionOpenLead",
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
  const t = useTranslations("dashboardHome")
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
          markDone(item.key, t("reminderSent"))
        } catch (e) {
          toast({
            title: t("reminderFailed"),
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
          toast({ title: t("taskCompleted") })
          markDone(item.key, t("taskCompleted"))
        } catch (e) {
          toast({
            title: t("taskFailed"),
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
      toast({ title: t("snoozedForWeek", { count: res.snoozed }) })
      onRefresh()
    } catch (e) {
      toast({
        title: t("snoozeFailed"),
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
          {t("needsYou")}{" "}
          {queue ? <span className="font-normal text-slate-400">{items.length}</span> : null}
        </h2>
        <div className="flex items-center gap-3 text-[12.5px]">
          {queue && queue.counts.snoozed > 0 && (
            <span className="text-slate-400">{t("snoozedCount", { count: queue.counts.snoozed })}</span>
          )}
          <button
            onClick={snoozeAll}
            disabled={snoozingAll || !items.length}
            className="font-medium text-sky-700 hover:underline disabled:opacity-40"
          >
            {t("snoozeAll")}
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
              <p className="text-sm font-medium text-slate-900">{t("allCaughtUp")}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("nothingNeedsAction")}
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
                        {chipLabel(item, t)}
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
                      {busyKey === item.key ? "…" : t(PRIMARY_ACTION_LABEL[item.primary_action])}
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
