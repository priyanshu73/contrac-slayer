"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { ProjectListItem, ProjectStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ChevronRight, Plus, Trash2, Loader2, Search, LayoutList, GanttChartSquare } from "lucide-react"
import { useLocale } from "next-intl"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { PortfolioTimeline } from "@/components/timeline/portfolio-timeline"

type StatusFilter = ProjectStatus | "ALL"

export default function ProjectsPage() {
  const t = useTranslations("projects")
  const locale = useLocale()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [view, setView] = useState<"list" | "timeline">("list")

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

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredProjects = normalizedSearch
    ? projects.filter((p) => {
        const title = (p.title || "").toLowerCase()
        const client = (p.client_name || "").toLowerCase()
        return title.includes(normalizedSearch) || client.includes(normalizedSearch)
      })
    : projects

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
      <div className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-md md:sticky md:top-0 md:z-10">
        <div className="px-4 py-3 sm:px-8 md:px-12 md:py-4 lg:px-16">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="hidden text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight md:block">
                {t("title")}
              </h1>
              <p className="text-sm text-slate-500 md:mt-1">{t("subtitle")}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ViewToggle value={view} onChange={setView} />
              <Button className="hidden sm:inline-flex" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("createProject")}
              </Button>
              <Button className="h-11 rounded-lg sm:hidden" onClick={() => setDialogOpen(true)}>
                <Plus className="h-5 w-5" />
                {t("createProject")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-3 py-4 pb-24 sm:px-8 sm:py-6 md:px-12 md:pb-8 lg:px-16">
        <div className="max-w-7xl mx-auto space-y-6">
          {view === "timeline" ? (
            <PortfolioTimeline />
          ) : (
          <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <SummaryCard label={t("stats.totalTrades")} value={stats.totalTrades} />
            <SummaryCard label={t("stats.acceptedTrades")} value={stats.acceptedTrades} positive />
            <SummaryCard label={t("stats.pendingTrades")} value={stats.pendingTrades} />
          </div>

          {/* Projects list */}
          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm sm:rounded-xl">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by project or client name"
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <StatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
              </div>
              <span className="text-xs text-slate-400 sm:ml-3 sm:shrink-0">
                {t("projectCount", { count: filteredProjects.length })}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <ProjectsListSkeleton />
              ) : filteredProjects.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {projects.length === 0
                    ? t("emptyState")
                    : "No projects match your search."}
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group w-full px-4 py-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors active:bg-slate-50 hover:bg-slate-50"
                  >
                    {/* Clickable area navigates to project */}
                    <button
                      type="button"
                      className="min-h-[76px] flex-1 flex w-full items-start sm:items-center gap-3 text-left min-w-0 touch-manipulation sm:min-h-0"
                      onClick={() => {
                        window.location.href = `/${locale}/projects/${project.id}`
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 truncate sm:font-medium">
                            {project.title || t("untitledProject")}
                          </p>
                          <ProjectStatusBadge status={project.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {project.client_name ? (
                            <>
                              <span className="text-slate-600">{project.client_name}</span>
                              <span className="mx-1.5 text-slate-300">·</span>
                            </>
                          ) : null}
                          {formatDateRange(project.scheduled_start_date, project.scheduled_end_date, t)}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-3 shrink-0">
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-right sm:rounded-lg sm:bg-transparent sm:p-0">
                          <p className="text-[11px] text-slate-500">{t("tradesLabel")}</p>
                          <p className="text-sm font-semibold text-slate-900">{project.accepted_trades ?? 0}/{project.total_trades ?? 0}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>

                    {/* Delete button – always visible on mobile, visible on hover on desktop */}
                    <button
                      type="button"
                      aria-label="Delete project"
                      className="flex h-11 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 text-rose-600 transition-colors active:bg-rose-50 hover:bg-rose-50 sm:ml-1 sm:h-auto sm:w-auto sm:rounded-lg sm:border-0 sm:p-2 sm:text-slate-400 sm:opacity-0 sm:group-hover:opacity-100 sm:hover:text-rose-600"
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
          </>
          )}
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

function ViewToggle({
  value,
  onChange,
}: {
  value: "list" | "timeline"
  onChange: (v: "list" | "timeline") => void
}) {
  const options = [
    { key: "list" as const, label: "List", icon: LayoutList },
    { key: "timeline" as const, label: "Timeline", icon: GanttChartSquare },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <Card className="flex flex-col gap-1 rounded-2xl border-slate-200 p-3 shadow-sm sm:rounded-xl sm:p-4">
      <span className="line-clamp-2 text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">{label}</span>
      <span className={`text-lg font-semibold sm:text-xl ${positive ? "text-emerald-600" : "text-slate-900"}`}>{value}</span>
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

function StatusFilterSelect({
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
    <Select value={value} onValueChange={(v) => onChange(v as StatusFilter)}>
      <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
        <SelectValue placeholder={t("all")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
