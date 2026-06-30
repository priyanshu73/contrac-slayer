"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Check, ChevronRight, CircleAlert, ClipboardList, Loader2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ContractorTask } from "@/lib/types"

// Open work first; BLOCKED and IN_PROGRESS bubble to the top.
const STATUS_RANK: Record<string, number> = {
  BLOCKED: 0,
  IN_PROGRESS: 1,
  NOT_STARTED: 2,
  COMPLETED: 9,
}

function dueMeta(dateStr?: string): { label: string; overdue: boolean } | null {
  if (!dateStr) return null
  const due = new Date(dateStr)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
  const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (days < 0) return { label: `Overdue · ${label}`, overdue: true }
  if (days === 0) return { label: "Due today", overdue: true }
  if (days === 1) return { label: "Due tomorrow", overdue: false }
  return { label: `Due ${label}`, overdue: false }
}

export function DashboardTasks() {
  const locale = useLocale()
  const [tasks, setTasks] = useState<ContractorTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // Server returns only open tasks, most-actionable first, capped to a small
    // page — no more pulling every task across every project.
    api
      .getAllProjectTasks({ openOnly: true, limit: 8 })
      .then((data: any) => {
        if (cancelled) return
        const list: ContractorTask[] = Array.isArray(data) ? data : data?.tasks ?? []
        setTasks(list)
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") console.error("dashboard tasks load failed", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = [...tasks].sort((a, b) => {
    const rank = (STATUS_RANK[a.status] ?? 5) - (STATUS_RANK[b.status] ?? 5)
    if (rank !== 0) return rank
    const aDue = a.scheduled_end_date ? new Date(a.scheduled_end_date).getTime() : Infinity
    const bDue = b.scheduled_end_date ? new Date(b.scheduled_end_date).getTime() : Infinity
    return aDue - bDue
  })

  const handleComplete = async (task: ContractorTask, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompleting(task.id)
    try {
      await api.updateProjectTask(task.project_id, task.id, { status: "COMPLETED" })
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("complete task failed", err)
    } finally {
      setCompleting(null)
    }
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            Tasks
            {!loading && sorted.length > 0 ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {sorted.length}
              </span>
            ) : null}
          </h2>
          <p className="text-xs text-muted-foreground">Open work across your projects</p>
        </div>
        <Link
          href={`/${locale}/tasks`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900">No open tasks</p>
          <p className="text-xs text-muted-foreground">Tasks from your projects will show up here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.slice(0, 6).map((task) => {
            const due = dueMeta(task.scheduled_end_date)
            const isBlocked = task.status === "BLOCKED"
            const isInProgress = task.status === "IN_PROGRESS"
            const isCompleting = completing === task.id
            return (
              <Link
                key={task.id}
                href={`/${locale}/projects/${task.project_id}`}
                className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white py-2 pl-2.5 pr-3 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <button
                  onClick={(e) => handleComplete(task, e)}
                  disabled={isCompleting}
                  aria-label="Mark complete"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
                >
                  {isCompleting ? (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                    {isBlocked ? (
                      <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] text-rose-700">
                        <CircleAlert className="mr-0.5 h-2.5 w-2.5" /> Blocked
                      </Badge>
                    ) : isInProgress ? (
                      <Badge variant="outline" className="shrink-0 border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-700">
                        In progress
                      </Badge>
                    ) : null}
                    {task.priority === "HIGH" ? (
                      <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">
                        High
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {task.project_title || "Project"}
                    {due ? (
                      <span className={cn(due.overdue ? "font-medium text-rose-600" : "text-slate-400")}> · {due.label}</span>
                    ) : null}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
