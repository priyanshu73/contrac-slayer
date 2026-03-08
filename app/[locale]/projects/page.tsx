"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { ProjectListItem, ProjectStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronRight, Filter, Plus, Trash2, Loader2 } from "lucide-react"
import { useLocale } from "next-intl"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"

type StatusFilter = ProjectStatus | "ALL"

export default function ProjectsPage() {
  const t = useTranslations("projects")
  const locale = useLocale()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getProjects({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          skip: 0,
          limit: 100,
        })
        if (!cancelled) {
          setProjects(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error("Failed to load projects", err)
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [statusFilter])

  const stats = computeStats(projects)

  const handleProjectCreated = (projectId: number) => {
    window.location.href = `/${locale}/projects/${projectId}`
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteProject(deleteTarget.id)
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error("Failed to delete project", err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusFilterPills value={statusFilter} onChange={setStatusFilter} />
              <Button className="hidden sm:inline-flex" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("createProject")}
              </Button>
              <Button className="sm:hidden rounded-full px-3 py-2" size="icon" onClick={() => setDialogOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label={t("stats.totalTrades")} value={stats.totalTrades} />
            <SummaryCard label={t("stats.acceptedTrades")} value={stats.acceptedTrades} positive />
            <SummaryCard label={t("stats.pendingTrades")} value={stats.pendingTrades} />
          </div>

          {/* Projects list */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>{t("filterLabel")}</span>
              </div>
              <span className="text-xs text-slate-400">
                {t("projectCount", { count: projects.length })}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <ProjectsListSkeleton />
              ) : projects.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {t("emptyState")}
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="group w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    {/* Clickable area navigates to project */}
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                      onClick={() => {
                        window.location.href = `/${locale}/projects/${project.id}`
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">
                            {project.title || t("untitledProject")}
                          </p>
                          <ProjectStatusBadge status={project.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateRange(project.scheduled_start_date, project.scheduled_end_date, t)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{t("tradesLabel")}</p>
                          <p className="text-sm font-medium text-slate-900">
                            {project.accepted_trades ?? 0}/{project.total_trades ?? 0}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>

                    {/* Delete button – always visible on mobile, visible on hover on desktop */}
                    <button
                      type="button"
                      aria-label="Delete project"
                      className="shrink-0 ml-1 p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(project)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProjectCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{deleteTarget?.title || "this project"}&rdquo;
              </span>
              ? This will permanently remove the project along with all its tasks, trades, and media. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Project"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <Card className="border-slate-200 shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-xl font-semibold ${positive ? "text-emerald-600" : "text-slate-900"}`}>{value}</span>
    </Card>
  )
}

function computeStats(projects: ProjectListItem[]) {
  let totalTrades = 0
  let acceptedTrades = 0
  let pendingTrades = 0

  for (const p of projects) {
    totalTrades += p.total_trades ?? 0
    acceptedTrades += p.accepted_trades ?? 0
    pendingTrades += p.pending_trades ?? 0
  }

  return { totalTrades, acceptedTrades, pendingTrades }
}

function ProjectsListSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="w-20 space-y-2">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("projects.status")
  const label = t(status.toLowerCase() as any)

  const color =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "IN_PROGRESS"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : status === "ON_HOLD"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : status === "CANCELLED"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-slate-50 text-slate-700 border-slate-200"

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${color}`}
    >
      {label}
    </Badge>
  )
}

function StatusFilterPills({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
}) {
  const t = useTranslations("projects.filters")
  const options: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: t("all") },
    { value: "PLANNING", label: t("planning") },
    { value: "IN_PROGRESS", label: t("inProgress") },
    { value: "COMPLETED", label: t("completed") },
  ]

  return (
    <div className="inline-flex items-center rounded-full bg-white border border-slate-200 p-0.5 text-xs shadow-sm">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 rounded-full transition-colors min-h-[32px] ${active
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function formatDateRange(
  start?: string,
  end?: string,
  t?: ReturnType<typeof useTranslations>
) {
  if (!start && !end) return t ? t("dates.unscheduled") : ""
  if (start && !end) return start
  if (!start && end) return end
  return `${start} – ${end}`
}
