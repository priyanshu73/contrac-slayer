"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Loader2, FileText } from "lucide-react"

interface Client {
    id: number
    name: string
    phone?: string
    email?: string
}

export interface FromQuoteProps {
    jobId: number
    title?: string
    objective?: string
    startDate?: string
    endDate?: string
    clientId?: number
    contractValue?: number
}

interface NewProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onProjectCreated: (projectId: number) => void
    fromQuote?: FromQuoteProps
}

export function NewProjectDialog({
    open,
    onOpenChange,
    onProjectCreated,
    fromQuote,
}: NewProjectDialogProps) {
    const t = useTranslations("projects.newProjectDialog")
    const { toast } = useToast()

    const [title, setTitle] = useState("")
    const [objective, setObjective] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Pre-populate from quote when dialog opens
    useEffect(() => {
        if (open && fromQuote) {
            setTitle(fromQuote.title || "")
            setObjective(fromQuote.objective || "")
            setStartDate(fromQuote.startDate || "")
            setEndDate(fromQuote.endDate || "")
        } else if (!open) {
            setTitle("")
            setObjective("")
            setStartDate("")
            setEndDate("")
        }
    }, [open, fromQuote])

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({
                title: t("validation.titleRequired"),
                variant: "destructive",
            })
            return
        }
        setSubmitting(true)
        try {
            const payload: Record<string, any> = { title: title.trim() }
            if (objective.trim()) payload.objective = objective.trim()
            if (startDate) payload.scheduled_start_date = startDate
            if (endDate) payload.scheduled_end_date = endDate
            if (fromQuote?.clientId) payload.client_id = fromQuote.clientId
            if (fromQuote?.contractValue != null) payload.contract_value = fromQuote.contractValue
            if (fromQuote?.jobId) payload.job_id = fromQuote.jobId

            const created = (await api.createProject(payload)) as any
            if (created?.id) {
                toast({ title: t("successTitle"), description: t("successDesc") })
                onProjectCreated(created.id)
                onOpenChange(false)
            }
        } catch (err: any) {
            toast({
                title: t("errorTitle"),
                description: err?.message || t("errorDesc"),
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                        {t("title")}
                    </DialogTitle>
                    {fromQuote ? (
                        <DialogDescription className="flex items-center gap-1.5 text-sm text-slate-500">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            Pre-filled from accepted quote — review and adjust before creating.
                        </DialogDescription>
                    ) : (
                        <DialogDescription className="text-sm text-slate-500">
                            {t("description")}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="project-title" className="text-sm font-medium text-slate-700">
                            {t("fields.title")} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="project-title"
                            placeholder={t("fields.titlePlaceholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-slate-200"
                        />
                    </div>

                    {/* Objective / Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="project-objective" className="text-sm font-medium text-slate-700">
                            {t("fields.objective")}
                        </Label>
                        <textarea
                            id="project-objective"
                            rows={3}
                            placeholder={t("fields.objectivePlaceholder")}
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Date pickers */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="start-date"
                                className="text-sm font-medium text-slate-700 flex items-center gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {t("fields.startDate")}
                            </Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="end-date"
                                className="text-sm font-medium text-slate-700 flex items-center gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {t("fields.endDate")}
                            </Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim()}
                        className="min-w-[120px]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("creating")}
                            </>
                        ) : (
                            t("create")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
