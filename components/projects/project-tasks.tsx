"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import type { Project, ProjectTask, TaskStatus, TaskPriority } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    ImagePlus,
    Calendar,
    User,
    Loader2,
    X,
    Image as ImageIcon,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

interface ProjectTasksProps {
    project: Project
    onTasksUpdated: (tasks: ProjectTask[]) => void
}

const STATUS_OPTIONS: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED"]
const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"]

export function ProjectTasks({ project, onTasksUpdated }: ProjectTasksProps) {
    const t = useTranslations("projects.tasks")
    const { toast } = useToast()

    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)
    const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)

    const allTasks = useMemo(
        () =>
            (project.tasks || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [project.tasks]
    )

    const completedCount = allTasks.filter((t) => t.status === "COMPLETED").length
    const progress = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0

    const toggleStatus = async (task: ProjectTask) => {
        if (!project.id) return
        const nextStatus: TaskStatus =
            task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED"
        try {
            const updated = (await api.updateProjectTask(project.id, task.id, {
                status: nextStatus,
            })) as Partial<ProjectTask>
            const tasks = (project.tasks || []).map((t) =>
                t.id === task.id ? { ...t, ...updated } : t
            )
            onTasksUpdated(tasks)
        } catch (err: any) {
            toast({
                title: t("updateErrorTitle"),
                description: err?.message || t("updateErrorDesc"),
                variant: "destructive",
            })
        }
    }

    const deleteTask = async (taskId: number) => {
        if (!project.id) return
        setDeletingTaskId(taskId)
        try {
            await api.deleteProjectTask(project.id, taskId)
            const tasks = (project.tasks || []).filter((t) => t.id !== taskId)
            onTasksUpdated(tasks)
            toast({ title: t("taskDeleted") })
        } catch (err: any) {
            toast({
                title: t("deleteErrorTitle"),
                description: err?.message || t("deleteErrorDesc"),
                variant: "destructive",
            })
        } finally {
            setDeletingTaskId(null)
        }
    }

    const handleTaskCreated = (newTask: ProjectTask) => {
        onTasksUpdated([...(project.tasks || []), newTask])
        setAddDialogOpen(false)
    }

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case "COMPLETED":
                return "bg-emerald-50 text-emerald-700 border-emerald-200"
            case "IN_PROGRESS":
                return "bg-sky-50 text-sky-700 border-sky-200"
            case "BLOCKED":
                return "bg-rose-50 text-rose-700 border-rose-200"
            default:
                return "bg-slate-50 text-slate-600 border-slate-200"
        }
    }

    const getPriorityColor = (priority?: TaskPriority) => {
        switch (priority) {
            case "HIGH":
                return "border-rose-200 text-rose-700 bg-rose-50"
            case "MEDIUM":
                return "border-amber-200 text-amber-700 bg-amber-50"
            case "LOW":
                return "border-emerald-200 text-emerald-700 bg-emerald-50"
            default:
                return "border-slate-200 text-slate-700 bg-slate-50"
        }
    }

    return (
        <div className="space-y-4">
            {/* Header with progress bar and add button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>{t("progressLabel")}</span>
                        <Badge variant="outline" className="text-[11px]">
                            {completedCount}/{allTasks.length}
                        </Badge>
                    </div>
                    {allTasks.length > 0 && (
                        <div className="flex-1 max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
                <Button
                    size="sm"
                    onClick={() => setAddDialogOpen(true)}
                    className="shrink-0"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t("addTask")}
                </Button>
            </div>

            {/* Tasks list */}
            {allTasks.length === 0 ? (
                <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500 text-center">
                    {t("empty")}
                </Card>
            ) : (
                <div className="space-y-2">
                    {allTasks.map((task) => {
                        const isExpanded = expandedTaskId === task.id
                        return (
                            <Card
                                key={task.id}
                                className="border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                            >
                                {/* Task header */}
                                <div className="px-4 py-3 flex items-start gap-3">
                                    <Checkbox
                                        className="mt-0.5"
                                        checked={task.status === "COMPLETED"}
                                        onCheckedChange={() => toggleStatus(task)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p
                                                className={`font-medium text-sm truncate ${task.status === "COMPLETED"
                                                    ? "line-through text-slate-400"
                                                    : "text-slate-900"
                                                    }`}
                                            >
                                                {task.title}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] rounded-full px-1.5 py-0 ${getStatusColor(
                                                    task.status
                                                )}`}
                                            >
                                                {t(`status.${task.status.toLowerCase()}`)}
                                            </Badge>
                                            {task.priority && (
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] rounded-full px-1.5 py-0 ${getPriorityColor(
                                                        task.priority
                                                    )}`}
                                                >
                                                    {t(`priority.${task.priority.toLowerCase()}`)}
                                                </Badge>
                                            )}
                                            {task.task_type === "PUNCH_LIST" && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] rounded-full px-1.5 py-0 border-violet-200 text-violet-700 bg-violet-50"
                                                >
                                                    {t("punchListBadge")}
                                                </Badge>
                                            )}
                                        </div>
                                        {task.description && !isExpanded && (
                                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                                {task.description}
                                            </p>
                                        )}
                                        {/* Row of metadata */}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                            {task.category && (
                                                <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 border border-slate-200">
                                                    {task.category}
                                                </span>
                                            )}
                                            {(task.photo_count > 0 || task.document_count > 0) && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 border border-slate-200">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {task.photo_count} · {task.document_count}
                                                </span>
                                            )}
                                            {task.scheduled_start_date && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {task.scheduled_start_date}
                                                    {task.scheduled_end_date &&
                                                        ` – ${task.scheduled_end_date}`}
                                                </span>
                                            )}
                                            {task.assigned_to && (
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {task.assigned_to}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedTaskId(isExpanded ? null : task.id)
                                            }
                                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteTask(task.id)}
                                            disabled={deletingTaskId === task.id}
                                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                        >
                                            {deletingTaskId === task.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-3">
                                        {task.description && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-0.5">
                                                    {t("descriptionLabel")}
                                                </p>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                    {task.description}
                                                </p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                            {task.scheduled_start_date && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {t("startDateLabel")}
                                                    </p>
                                                    <p className="text-slate-700">
                                                        {task.scheduled_start_date}
                                                    </p>
                                                </div>
                                            )}
                                            {task.scheduled_end_date && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {t("endDateLabel")}
                                                    </p>
                                                    <p className="text-slate-700">
                                                        {task.scheduled_end_date}
                                                    </p>
                                                </div>
                                            )}
                                            {task.assigned_to && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {t("assignedToLabel")}
                                                    </p>
                                                    <p className="text-slate-700">{task.assigned_to}</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Attached images (photos) */}
                                        {task.photos && task.photos.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1.5">
                                                    {t("attachedImages")}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {task.photos.map((photo) => (
                                                        <a
                                                            key={photo.id}
                                                            href={photo.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
                                                        >
                                                            <img
                                                                src={photo.file_url}
                                                                alt={photo.file_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Add task dialog */}
            <AddTaskDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                projectId={project.id}
                trades={project.trades}
                onTaskCreated={handleTaskCreated}
            />
        </div>
    )
}

/* ─────────────────────────────────────────────────────────
 * Add Task Dialog
 * ───────────────────────────────────────────────────────── */

interface AddTaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: number
    trades?: { id: number; trade_type: string; subcontractor_name: string }[]
    onTaskCreated: (task: ProjectTask) => void
}

function AddTaskDialog({
    open,
    onOpenChange,
    projectId,
    trades,
    onTaskCreated,
}: AddTaskDialogProps) {
    const t = useTranslations("projects.tasks")
    const { toast } = useToast()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
    const [status, setStatus] = useState<TaskStatus>("NOT_STARTED")
    const [category, setCategory] = useState("")
    const [assignedTo, setAssignedTo] = useState("")
    const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false)
    const assignedToContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assignedToContainerRef.current && !assignedToContainerRef.current.contains(event.target as Node)) {
                setShowAssignedToDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Image upload via Cloudinary widget
    const [uploadedImages, setUploadedImages] = useState<
        { url: string; name: string; size: number }[]
    >([])
    const [uploading, setUploading] = useState(false)

    // Reset form when dialog closes
    const resetForm = useCallback(() => {
        setTitle("")
        setDescription("")
        setPriority("MEDIUM")
        setStatus("NOT_STARTED")
        setCategory("")
        setAssignedTo("")
        setStartDate("")
        setEndDate("")
        setUploadedImages([])
    }, [])

    const handleOpenChange = (o: boolean) => {
        if (!o) resetForm()
        onOpenChange(o)
    }

    const openCloudinaryWidget = () => {
        if (typeof window === "undefined") return
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        if (!cloudName) {
            toast({
                title: t("imageUpload.notConfigured"),
                variant: "destructive",
            })
            return
        }

        setUploading(true)
        // @ts-ignore — Cloudinary widget loaded via script
        if (window.cloudinary) {
            // @ts-ignore
            const widget = window.cloudinary.createUploadWidget(
                {
                    cloudName,
                    uploadPreset:
                        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default",
                    sources: ["local", "camera"],
                    multiple: true,
                    maxFiles: 10,
                    resourceType: "image",
                    folder: `projects/${projectId}/tasks`,
                },
                (error: any, result: any) => {
                    if (result?.event === "success") {
                        setUploadedImages((prev) => [
                            ...prev,
                            {
                                url: result.info.secure_url,
                                name: result.info.original_filename + "." + result.info.format,
                                size: result.info.bytes,
                            },
                        ])
                    }
                    if (
                        result?.event === "close" ||
                        result?.event === "abort" ||
                        error
                    ) {
                        setUploading(false)
                    }
                }
            )
            widget.open()
        } else {
            // Fallback: prompt for file URL manually
            const url = prompt("Enter image URL:")
            if (url) {
                setUploadedImages((prev) => [
                    ...prev,
                    { url, name: "uploaded-image", size: 0 },
                ])
            }
            setUploading(false)
        }
    }

    const removeImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({
                title: t("addForm.validation.titleRequired"),
                variant: "destructive",
            })
            return
        }

        setSubmitting(true)
        try {
            const payload: Record<string, any> = {
                title: title.trim(),
                task_type: "TIMELINE",
                status,
                priority,
                project_id: projectId,
            }
            if (description.trim()) payload.description = description.trim()
            if (category.trim()) payload.category = category.trim()
            if (assignedTo.trim()) {
                payload.assigned_to = assignedTo.trim()
                const matchingTrade = trades?.find(t => t.subcontractor_name === assignedTo.trim())
                if (matchingTrade) {
                    payload.assigned_trade_id = matchingTrade.id
                }
            }
            if (startDate) payload.scheduled_start_date = startDate
            if (endDate) payload.scheduled_end_date = endDate

            const created = (await api.createProjectTask(
                projectId,
                payload
            )) as ProjectTask

            // Attach images if any
            for (const img of uploadedImages) {
                try {
                    await api.attachProjectMedia(projectId, {
                        task_id: created.id,
                        file_url: img.url,
                        file_name: img.name,
                        file_size: img.size,
                        media_type: "PHOTO",
                        context: "TASK_PHOTO",
                    })
                } catch {
                    // non-critical; task already created
                }
            }

            toast({ title: t("taskCreated") })
            onTaskCreated(created)
            resetForm()
        } catch (err: any) {
            toast({
                title: t("createErrorTitle"),
                description: err?.message || t("createErrorDesc"),
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                        {t("addFormTitle")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                            {t("addForm.title")} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            placeholder={t("addForm.titlePlaceholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-slate-200"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                            {t("addForm.description")}
                        </Label>
                        <textarea
                            rows={2}
                            placeholder={t("addForm.descriptionPlaceholder")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                        />
                    </div>



                    {/* Priority & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.priority")}
                            </Label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            >
                                {PRIORITY_OPTIONS.map((p) => (
                                    <option key={p} value={p}>
                                        {t(`priority.${p.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.status")}
                            </Label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {t(`status.${s.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category & Assigned to */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.category")}
                            </Label>
                            <Input
                                placeholder={t("addForm.categoryPlaceholder")}
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                        <div className="space-y-1.5 relative" ref={assignedToContainerRef}>
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.assignedTo")}
                            </Label>
                            <Input
                                placeholder={t("addForm.assignedToPlaceholder")}
                                value={assignedTo}
                                onChange={(e) => {
                                    setAssignedTo(e.target.value)
                                    setShowAssignedToDropdown(true)
                                }}
                                onFocus={() => setShowAssignedToDropdown(true)}
                                className="border-slate-200"
                            />
                            {showAssignedToDropdown && trades && trades.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    <ul className="py-1">
                                        {Array.from(new Set(trades.map(t => t.subcontractor_name)))
                                            .filter(name => name.toLowerCase().includes(assignedTo.toLowerCase()))
                                            .map((name) => (
                                                <li
                                                    key={name}
                                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setAssignedTo(name)
                                                        setShowAssignedToDropdown(false)
                                                    }}
                                                >
                                                    {name}
                                                </li>
                                            ))}
                                        {Array.from(new Set(trades.map(t => t.subcontractor_name)))
                                            .filter(name => name.toLowerCase().includes(assignedTo.toLowerCase())).length === 0 && (
                                                <li className="px-3 py-2 text-sm text-slate-500 italic">No matches</li>
                                            )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.startDate")}
                            </Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">
                                {t("addForm.endDate")}
                            </Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Image upload */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                            {t("addForm.images")}
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {uploadedImages.map((img, i) => (
                                <div
                                    key={i}
                                    className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 group"
                                >
                                    <img
                                        src={img.url}
                                        alt={img.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={openCloudinaryWidget}
                                disabled={uploading}
                                className="w-16 h-16 rounded-md border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <ImagePlus className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {t("addForm.imagesHint")}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={submitting}
                    >
                        {t("addForm.cancel")}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim()}
                        className="min-w-[120px]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("addForm.creating")}
                            </>
                        ) : (
                            t("addForm.create")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
