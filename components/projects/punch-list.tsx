"use client"

import { useMemo } from "react"
import type { Project, ProjectTask } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"

interface PunchListProps {
  project: Project
  onTasksUpdated: (tasks: ProjectTask[]) => void
}

export function PunchList({ project, onTasksUpdated }: PunchListProps) {
  const t = useTranslations("projects.punchList")
  const { toast } = useToast()

  const punchTasks = useMemo(
    () => (project.tasks || []).filter((t) => t.task_type === "PUNCH_LIST").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [project.tasks],
  )

  const completedCount = punchTasks.filter((t) => t.status === "COMPLETED").length

  const toggleCompleted = async (task: ProjectTask) => {
    if (!project.id) return
    const nextStatus = task.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED"
    try {
      const updated = await api.updateProjectTask(project.id, task.id, {
        status: nextStatus,
      })
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

  if (!punchTasks.length) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("empty")}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>{t("progressLabel")}</span>
          <Badge variant="outline" className="text-[11px]">
            {completedCount}/{punchTasks.length}
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        {punchTasks.map((task) => (
          <Card
            key={task.id}
            className="border-slate-200 shadow-sm px-3 py-2 flex items-start gap-3"
          >
            <Checkbox
              className="mt-1"
              checked={task.status === "COMPLETED"}
              onCheckedChange={() => toggleCompleted(task)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900 truncate">{task.title}</p>
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] ${
                      task.priority === "HIGH"
                        ? "border-rose-200 text-rose-700 bg-rose-50"
                        : task.priority === "MEDIUM"
                        ? "border-amber-200 text-amber-700 bg-amber-50"
                        : "border-emerald-200 text-emerald-700 bg-emerald-50"
                    }`}
                  >
                    {t(`priority.${task.priority.toLowerCase()}` as any)}
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-3">
                  {task.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                {task.category && (
                  <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 border border-slate-200">
                    {task.category}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 border border-slate-200">
                  {t("attachmentsLabel", {
                    photos: task.photo_count ?? 0,
                    docs: task.document_count ?? 0,
                  })}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

