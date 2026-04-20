"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import type { ContractorTask, Project, ProjectListItem, TaskStatus } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddTaskDialog, EditTaskDialog } from "@/components/projects/project-tasks"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AssigneeOption = {
  id: string
  label: string
}

const STATUS_OPTIONS: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED"]

export default function TaskBoardPage() {
  const t = useTranslations("taskBoard")
  const taskT = useTranslations("projects.tasks")
  const locale = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()

  const myAssigneeLabel =
    user?.contractor_profile?.company_name?.trim() || user?.email?.trim() || "Me"

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<ContractorTask[]>([])
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({})
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createProjectId, setCreateProjectId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<ContractorTask | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContractorTask | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        const [tasksData, projectsData, subcontractors] = await Promise.all([
          api.getAllProjectTasks(),
          api.getProjects({ skip: 0, limit: 100 }),
          api.getAllSubcontractors(),
        ])

        if (cancelled) return

        const projectList = Array.isArray(projectsData) ? (projectsData as ProjectListItem[]) : []
        const taskList = Array.isArray(tasksData) ? (tasksData as ContractorTask[]) : []
        const subcontractorNames = Array.isArray(subcontractors)
          ? subcontractors
              .map((item: any) => item?.subcontractor_name?.trim())
              .filter((value: string | undefined): value is string => !!value)
          : []

        setProjects(projectList)
        setTasks(taskList)
        setAssigneeOptions(
          [myAssigneeLabel, ...subcontractorNames, ...taskList.map((task) => task.assigned_to?.trim())]
            .filter((value, index, values): value is string => !!value && values.indexOf(value) === index)
            .map((value) => ({ id: value, label: value }))
        )
      } catch (error: any) {
        if (!cancelled) {
          toast({
            title: t("loadError"),
            description: error?.message,
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [myAssigneeLabel, t, toast])

  useEffect(() => {
    if (selectedProjectId === "ALL" || projectDetails[selectedProjectId]) return

    let cancelled = false

    const loadProject = async () => {
      try {
        const data = (await api.getProject(selectedProjectId)) as Project
        if (!cancelled) {
          setProjectDetails((prev) => ({ ...prev, [selectedProjectId]: data }))
        }
      } catch (error) {
        console.error("Failed to load selected project", error)
      }
    }

    loadProject()

    return () => {
      cancelled = true
    }
  }, [projectDetails, selectedProjectId])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tasks.filter((task) => {
      if (selectedProjectId !== "ALL" && task.project_id !== selectedProjectId) return false
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false
      if (assigneeFilter !== "ALL" && (task.assigned_to?.trim() || "") !== assigneeFilter) return false

      if (!query) return true

      const haystack = [
        task.title,
        task.description,
        task.project_title,
        task.assigned_to,
        task.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [assigneeFilter, search, selectedProjectId, statusFilter, tasks])

  const stats = useMemo(() => {
    const total = tasks.length
    const mine = tasks.filter((task) => (task.assigned_to || "").trim() === myAssigneeLabel).length
    const completed = tasks.filter((task) => task.status === "COMPLETED").length
    const subcontracted = tasks.filter(
      (task) => !!task.assigned_to && (task.assigned_to || "").trim() !== myAssigneeLabel
    ).length

    return { total, mine, subcontracted, completed }
  }, [myAssigneeLabel, tasks])

  const ensureProjectLoaded = async (projectId: number) => {
    if (projectDetails[projectId]) return projectDetails[projectId]
    const data = (await api.getProject(projectId)) as Project
    setProjectDetails((prev) => ({ ...prev, [projectId]: data }))
    return data
  }

  const selectedCreateProject =
    createProjectId == null ? null : projectDetails[createProjectId] || null

  const updateTask = async (taskId: number, patch: Partial<ContractorTask>) => {
    const current = tasks.find((task) => task.id === taskId)
    if (!current) return

    setSavingTaskId(taskId)
    try {
      const updated = (await api.updateProjectTask(current.project_id, current.id, patch)) as ContractorTask
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updated,
                project_title: task.project_title,
                project_status: task.project_status,
              }
            : task
        )
      )
      toast({ title: t("updateSuccess") })
    } catch (error: any) {
      toast({
        title: t("updateError"),
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setSavingTaskId(null)
    }
  }

  const handleTaskCreated = (task: ContractorTask) => {
    const selectedProjectSummary =
      createProjectId == null ? null : projects.find((project) => project.id === createProjectId)

    setTasks((prev) => [
      {
        ...task,
        project_title: selectedProjectSummary?.title || selectedCreateProject?.title || task.project_title,
        project_status: selectedCreateProject?.status || task.project_status,
      },
      ...prev,
    ])
    setCreateOpen(false)
    setCreateProjectId(null)
    toast({ title: taskT("taskCreated") })
  }

  const handleOpenCreate = async () => {
    if (projects.length === 0) return
    setCreateProjectId(null)
    setCreateOpen(true)
  }

  const handleProjectChange = async (newId: number) => {
    setCreateProjectId(newId)
    try {
      await ensureProjectLoaded(newId)
    } catch (error) {
      console.error("Failed to load project details for task creation", error)
    }
  }

  const handleOpenEdit = async (task: ContractorTask) => {
    try {
      await ensureProjectLoaded(task.project_id)
      setEditingTask(task)
      setEditOpen(true)
    } catch (error: any) {
      toast({
        title: t("loadError"),
        description: error?.message,
        variant: "destructive",
      })
    }
  }

  const handleTaskUpdated = (updatedTask: ContractorTask) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === updatedTask.id
          ? {
              ...task,
              ...updatedTask,
              project_title: task.project_title,
              project_status: task.project_status,
            }
          : task
      )
    )
  }

  const handleDeleteTask = async () => {
    if (!deleteTarget) return

    setDeletingTaskId(deleteTarget.id)
    try {
      await api.deleteProjectTask(deleteTarget.project_id, deleteTarget.id)
      setTasks((prev) => prev.filter((task) => task.id !== deleteTarget.id))
      toast({ title: taskT("taskDeleted") })
      setDeleteTarget(null)
    } catch (error: any) {
      toast({
        title: taskT("deleteErrorTitle"),
        description: error?.message || taskT("deleteErrorDesc"),
        variant: "destructive",
      })
    } finally {
      setDeletingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-md md:sticky md:top-0 md:z-10">
        <div className="px-4 py-3 sm:px-8 md:px-12 md:py-4 lg:px-16">
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="hidden text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight md:block">
                  {t("title")}
                </h1>
                <p className="text-sm text-slate-500 md:mt-1">{t("subtitle")}</p>
              </div>
              <Button className="h-11 rounded-lg sm:w-fit" onClick={handleOpenCreate} disabled={projects.length === 0}>
                {t("newTask")}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <StatCard icon={ClipboardList} label={t("stats.total")} value={stats.total} />
              <StatCard icon={UserRound} label={t("stats.mine")} value={stats.mine} />
              <StatCard icon={Wrench} label={t("stats.subcontracted")} value={stats.subcontracted} />
              <StatCard icon={CheckCircle2} label={t("stats.completed")} value={stats.completed} />
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="h-12 rounded-xl bg-slate-50 md:h-10 md:rounded-md md:bg-white"
              />
              <select
                value={selectedProjectId}
                onChange={(e) =>
                  setSelectedProjectId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                }
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 md:h-10 md:rounded-md md:bg-white"
              >
                <option value="ALL">{t("allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 md:h-10 md:rounded-md md:bg-white"
              >
                <option value="ALL">{t("allAssignees")}</option>
                {assigneeOptions.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "ALL")}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 md:h-10 md:rounded-md md:bg-white"
              >
                <option value="ALL">{t("allStatuses")}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status.toLowerCase()}` as never)}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="h-11 rounded-xl md:h-9 md:rounded-md"
                onClick={() => {
                  setSearch("")
                  setSelectedProjectId("ALL")
                  setAssigneeFilter("ALL")
                  setStatusFilter("ALL")
                }}
              >
                {t("clearFilters")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-3 py-4 pb-24 sm:px-8 sm:py-6 md:px-12 md:pb-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {filteredTasks.length === 0 ? (
            <Card className="border-slate-200 shadow-sm p-8 text-center text-sm text-slate-500">
              {t("empty")}
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-2.5">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="gap-0 rounded-2xl border-slate-200 px-4 py-4 shadow-sm md:rounded-lg md:py-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[15px] font-semibold leading-6 text-slate-900">{task.title}</h2>
                          <StatusBadge status={task.status} label={t(`status.${task.status.toLowerCase()}` as never)} />
                          {task.priority && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-slate-600">
                              {taskT(`priority.${task.priority.toLowerCase()}` as never)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            {t("projectLabel")}: {task.project_title || `#${task.project_id}`}
                          </span>
                          <span>
                            {t("assigneeLabel")}: {task.assigned_to || t("unassigned")}
                          </span>
                          <span>
                            {t("dueLabel")}: {task.scheduled_end_date || "—"}
                          </span>
                        </div>
                      </div>

                      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                        <select
                          value={task.status}
                          onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                          disabled={savingTaskId === task.id || deletingTaskId === task.id}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 md:h-8 md:min-w-[150px] md:rounded-md"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {t(`status.${status.toLowerCase()}` as never)}
                            </option>
                          ))}
                        </select>

                        <select
                          value={task.assigned_to?.trim() || ""}
                          onChange={(e) =>
                            updateTask(task.id, {
                              assigned_to: e.target.value || undefined,
                              assigned_trade_id: undefined,
                            })
                          }
                          disabled={savingTaskId === task.id || deletingTaskId === task.id}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 md:h-8 md:min-w-[190px] md:rounded-md"
                        >
                          <option value="">{t("unassigned")}</option>
                          <option value={myAssigneeLabel}>{t("assignToMe")}</option>
                          {assigneeOptions
                            .filter((option) => option.id !== myAssigneeLabel)
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(task)}
                          disabled={deletingTaskId === task.id}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors active:bg-slate-100 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 md:h-7 md:w-7 md:rounded-md md:border-0"
                          aria-label={taskT("editTask")}
                          title={taskT("editTask")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(task)}
                          disabled={deletingTaskId === task.id}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors active:bg-rose-50 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 md:h-7 md:w-7 md:rounded-md md:border-0"
                          aria-label={t("delete")}
                          title={t("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{task.description}</p>
                    )}

                    <div className="flex justify-start md:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/${locale}/projects/${task.project_id}`
                        }}
                        className="w-full justify-start rounded-xl px-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:w-auto md:rounded-md md:px-2"
                      >
                        {t("openProject")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={createProjectId}
        trades={selectedCreateProject ? selectedCreateProject.trades : undefined}
        onTaskCreated={handleTaskCreated}
        initialAssignedTo={myAssigneeLabel}
        projects={projects}
        onProjectChange={handleProjectChange}
      />

      {editingTask && projectDetails[editingTask.project_id] && (
        <EditTaskDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingTask(null)
          }}
          projectId={editingTask.project_id}
          task={editingTask}
          trades={projectDetails[editingTask.project_id].trades}
          onTaskUpdated={(task) => handleTaskUpdated(task as ContractorTask)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", { task: deleteTarget?.title || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTaskId != null}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteTask()
              }}
              disabled={deletingTaskId != null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTaskId != null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <Card className="border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function StatusBadge({ status, label }: { status: TaskStatus; label: string }) {
  const classes =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "IN_PROGRESS"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : status === "BLOCKED"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-slate-50 text-slate-700 border-slate-200"

  return (
    <Badge variant="outline" className={`text-[11px] ${classes}`}>
      {label}
    </Badge>
  )
}
