"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import { Plus, ChevronRight, FolderPlus } from "lucide-react"
import type { ProjectListItem } from "@/lib/types"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"

export function DashboardProjects() {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('navigation')
  const tProj = useTranslations('projects')
  const locale = useLocale()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects({ limit: 4, skip: 0 })
      setProjects(Array.isArray(data) ? data.slice(0, 4) : [])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectCreated = (projectId: number) => {
    window.location.href = `/${locale}/projects/${projectId}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED": return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "IN_PROGRESS": return "bg-sky-50 text-sky-700 border-sky-200"
      case "ON_HOLD": return "bg-amber-50 text-amber-700 border-amber-200"
      case "CANCELLED": return "bg-rose-50 text-rose-700 border-rose-200"
      case "PLANNING": return "bg-indigo-50 text-indigo-700 border-indigo-200"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  return (
    <Card className="flex h-full flex-col p-3 shadow-sm border-slate-200">
      {/* PROJECTS SECTION */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{tNav('projects') || "Projects"}</h2>
        <Link
          href={`/${locale}/projects`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 hover:border-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 transition-colors"
        >
          {t('viewAll') || "View All"}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-1.5 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded border border-slate-100 p-2.5">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-12" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed mt-2 bg-slate-50">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
            <FolderPlus className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">No projects yet</p>
          <p className="text-xs text-slate-500 mb-4 max-w-[200px] mx-auto">
            Create a project to track tasks, timelines, and trades.
          </p>
          <Button size="sm" className="h-8 text-xs bg-sky-600 text-white hover:bg-sky-700" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5 mt-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/${locale}/projects/${project.id}`}
              className="block rounded border border-slate-100 p-2.5 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[15px] font-medium text-slate-900 group-hover:text-primary transition-colors truncate">
                      {project.title || tProj('untitledProject') || "Untitled Project"}
                    </span>
                    <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 border ${getStatusColor(project.status)}`}>
                      {tProj(`status.${project.status.toLowerCase()}` as any) || project.status}
                    </Badge>
                  </div>
                  {project.quote_id && (
                    <p className="text-[11px] text-slate-500 mb-1">
                      From Quote #{project.quote_id}
                    </p>
                  )}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 text-[11px] text-slate-500">
                    {project.scheduled_start_date && (
                      <span>
                        Starts: {formatDate(project.scheduled_start_date)}
                      </span>
                    )}
                    {project.scheduled_end_date && (
                      <span>
                        Ends: {formatDate(project.scheduled_end_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{tProj('tradesLabel') || "Trades"}</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {project.accepted_trades ?? 0}/{project.total_trades ?? 0}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          <Button
            size="sm"
            className="w-full h-9 mt-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Project
          </Button>
        </div>
      )}

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </Card>
  )
}
