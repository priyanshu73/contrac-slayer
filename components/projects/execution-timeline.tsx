"use client"

import { useMemo } from "react"
import type { Project, ProjectTask, TaskStatus, TaskType } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"

interface ExecutionTimelineProps {
  project: Project
  onTasksUpdated: (tasks: ProjectTask[]) => void
}

export function ExecutionTimeline({ project, onTasksUpdated }: ExecutionTimelineProps) {
  const t = useTranslations("projects.timeline")
  const { toast } = useToast()

  const timelineTasks = useMemo(
    () => (project.tasks || []).filter((t) => t.task_type === "TIMELINE").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [project.tasks],
  )

  const toggleStatus = async (task: ProjectTask) => {
    if (!project.id) return
    const nextStatus: TaskStatus = task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED"
    try {
      const updated = await api.updateProjectTask(project.id, task.id, { status: nextStatus })
      const tasks = (project.tasks || []).map((t) => (t.id === task.id ? { ...t, ...updated } : t))
      onTasksUpdated(tasks)
    } catch (err: any) {
      toast({
        title: t("updateErrorTitle"),
        description: err?.message || t("updateErrorDesc"),
        variant: "destructive",
      })
    }
  }

  const tasksByStatus: Record<TaskStatus, ProjectTask[]> = {
    NOT_STARTED: [],
    IN_PROGRESS: [],
    COMPLETED: [],
    BLOCKED: [],
  }
  for (const tsk of timelineTasks) {
    tasksByStatus[tsk.status].push(tsk)
  }

  const columns: { key: TaskStatus; label: string }[] = [
    { key: "NOT_STARTED", label: t("columns.notStarted") },
    { key: "IN_PROGRESS", label: t("columns.inProgress") },
    { key: "COMPLETED", label: t("columns.completed") },
  ]

  if (!timelineTasks.length) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("empty")}
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <Card key={col.key} className="border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{col.label}</h3>
            <Badge variant="outline" className="text-[11px]">
              {tasksByStatus[col.key].length}
            </Badge>
          </div>
          <div className="space-y-2">
            {tasksByStatus[col.key].map((task) => (
              <button
                key={task.id}
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-300 hover:bg-slate-50 flex items-start gap-2"
                onClick={() => toggleStatus(task)}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={task.status === "COMPLETED"}
                  onCheckedChange={() => toggleStatus(task)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                  )}
                  {task.scheduled_start_date && task.scheduled_end_date && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {task.scheduled_start_date} – {task.scheduled_end_date}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {!tasksByStatus[col.key].length && (
              <p className="text-xs text-slate-400">{t("noTasksColumn")}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

