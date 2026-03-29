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
import { ProjectFinancials } from "@/components/projects/financials/project-financials"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { ChevronDown, Loader2 } from "lucide-react"

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

  const refreshProject = async () => {
    if (!projectId) return
    const data = await api.getProject(projectId)
    setProject(data as Project)
  }

  const handleTasksUpdated = (tasks: ProjectTask[]) => {
    setProject((prev) => (prev ? { ...prev, tasks } : prev))
  }

  const handleTradesUpdated = (trades: ProjectTrade[]) => {
    setProject((prev) => (prev ? { ...prev, trades } : prev))
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return
    const prevStatus = project.status
    setProject({ ...project, status: newStatus as Project["status"] })
    try {
      await api.updateProject(project.id, { status: newStatus })
    } catch (err) {
      console.error("Failed to update status", err)
      setProject({ ...project, status: prevStatus }) // Revert on failure
    }
  }

  if (!project || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Tabs defaultValue="tasks" className="w-full flex-1 flex flex-col">
        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4">
          <div className="w-full max-w-none flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-0.5 lg:flex-1 min-w-0">
              <AppBreadcrumb
                items={[
                  { label: "Projects", href: `/${locale}/projects` },
                  { label: project.title },
                ]}
              />
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-tight truncate">
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1 font-medium text-slate-700">
                  <span className="text-slate-500">From:</span>
                  <span>{project.scheduled_start_date || "–"}</span>
                  <span className="text-slate-500 ml-1">To:</span>
                  <span>{project.scheduled_end_date || "–"}</span>
                </div>

                {project.objective && (
                  <span className="line-clamp-1 text-slate-500">
                    • {project.objective}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-start lg:justify-center overflow-x-auto sm:my-2 lg:my-0 lg:mx-4 shrink-0">
              <TabsList className="bg-slate-100/80 flex flex-nowrap w-max mb-1 lg:mb-0">
                <TabsTrigger value="tasks">{t("tabs.tasks") || "Tasks"}</TabsTrigger>
                <TabsTrigger value="financials">{t("tabs.financials") || "Financials"}</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="trades">{t("tabs.trades") || "Team & scopes"}</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col lg:items-end gap-2 lg:flex-1 shrink-0 mt-1 lg:mt-0">
              <div className="flex items-center gap-3">
                <StatusDropdown status={project.status} onChange={handleStatusChange} />
                {project.contract_value != null && (
                  <p className="text-sm font-semibold text-slate-900 border-l border-slate-200 pl-3">
                    {t("contractValue", { amount: project.contract_value })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-10">
        <div className="w-full max-w-none space-y-4">

          <TabsContent value="tasks" className="mt-0">
            <ProjectTasks project={project} onTasksUpdated={handleTasksUpdated} />
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <ProjectFinancials project={project} onProjectUpdated={refreshProject} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0 space-y-6">
            <ProjectQuotes project={project} />
            <ProjectDocuments project={project} />
          </TabsContent>

          <TabsContent value="trades" className="mt-0">
            <TradesScopes project={project} onTradesUpdated={handleTradesUpdated} />
          </TabsContent>
        </div>
      </main>
      </Tabs>
    </div>
  )
}

function StatusDropdown({ status, onChange }: { status: Project["status"], onChange: (newStatus: string) => void }) {
  const t = useTranslations("projects.status")
  let color = "bg-slate-50 text-slate-700 border-slate-200"
  if (status === "COMPLETED") color = "bg-emerald-50 text-emerald-700 border-emerald-200"
  else if (status === "IN_PROGRESS") color = "bg-sky-50 text-sky-700 border-sky-200"
  else if (status === "ON_HOLD") color = "bg-amber-50 text-amber-700 border-amber-200"
  else if (status === "CANCELLED") color = "bg-rose-50 text-rose-700 border-rose-200"

  const STATUS_OPTIONS = ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]

  return (
    <div className="relative inline-flex items-center group">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10`}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt} value={opt}>{t(opt.toLowerCase() as any)}</option>
        ))}
      </select>
      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide border shadow-sm transition-all group-hover:shadow-md ${color}`}>
        <span>{t(status.toLowerCase() as any)}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </div>
    </div>
  )
}

