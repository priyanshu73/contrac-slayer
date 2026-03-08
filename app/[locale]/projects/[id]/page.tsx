"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import type { Project, ProjectTask, ProjectTrade } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProjectTasks } from "@/components/projects/project-tasks"
import { ProjectDocuments } from "@/components/projects/project-documents"
import { TradesScopes } from "@/components/projects/trades-scopes"
import { ProjectQuotes } from "@/components/projects/project-quotes"
import { ChevronLeft } from "lucide-react"

export default function ProjectDetailPage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations("projects.detail")
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const projectId = Number(params.id)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getProject(projectId)
        if (!cancelled) setProject(data as Project)
      } catch (err) {
        console.error("Failed to load project", err)
        if (!cancelled) setProject(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleTasksUpdated = (tasks: ProjectTask[]) => {
    setProject((prev) => (prev ? { ...prev, tasks } : prev))
  }

  const handleTradesUpdated = (trades: ProjectTrade[]) => {
    setProject((prev) => (prev ? { ...prev, trades } : prev))
  }

  if (!project || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-slate-200 bg-white"
                onClick={() => {
                  window.location.href = `/${locale}/projects`
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                  {project.title}
                </h1>
                {project.objective && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                    {project.objective}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BadgeStatus status={project.status} />
              {project.contract_value != null && (
                <p className="text-sm font-semibold text-slate-900">
                  {t("contractValue", { amount: project.contract_value })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto space-y-4">
          <Card className="border-slate-200 shadow-sm p-4 text-xs text-slate-600">
            <p>
              {t("scheduleLabel")}{" "}
              <span className="font-medium text-slate-900">
                {project.scheduled_start_date || "–"} – {project.scheduled_end_date || "–"}
              </span>
            </p>
          </Card>

          <Tabs defaultValue="tasks" className="space-y-4">
            <TabsList className="bg-slate-100 flex flex-nowrap overflow-x-auto">
              <TabsTrigger value="tasks">{t("tabs.tasks") || "Tasks"}</TabsTrigger>
              <TabsTrigger value="quotes">{t("tabs.quotes") || "Quotes"}</TabsTrigger>
              <TabsTrigger value="documents">{t("tabs.documents") || "Documents & media"}</TabsTrigger>
              <TabsTrigger value="trades">{t("tabs.trades") || "Team & scopes"}</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
              <ProjectTasks project={project} onTasksUpdated={handleTasksUpdated} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <ProjectQuotes project={project} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <ProjectDocuments project={project} />
            </TabsContent>

            <TabsContent value="trades" className="mt-4">
              <TradesScopes project={project} onTradesUpdated={handleTradesUpdated} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function BadgeStatus({ status }: { status: Project["status"] }) {
  const t = useTranslations("projects.status")
  const label = t(status.toLowerCase() as any)
  let color =
    "bg-slate-50 text-slate-700 border-slate-200"
  if (status === "COMPLETED") {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200"
  } else if (status === "IN_PROGRESS") {
    color = "bg-sky-50 text-sky-700 border-sky-200"
  } else if (status === "ON_HOLD") {
    color = "bg-amber-50 text-amber-700 border-amber-200"
  } else if (status === "CANCELLED") {
    color = "bg-rose-50 text-rose-700 border-rose-200"
  }

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${color}`}
    >
      {label}
    </Badge>
  )
}

