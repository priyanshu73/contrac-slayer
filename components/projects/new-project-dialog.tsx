"use client"

import { useEffect, useRef, useState } from "react"
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
import { Calendar, Loader2, FileText, User, Sparkles, RotateCcw } from "lucide-react"
import { buildInitialProjectBrief } from "@/lib/project-brief"
export interface FromQuoteProps {
    jobId: number
    title?: string
    objective?: string
    startDate?: string
    endDate?: string
    clientId?: number
    contractValue?: number
}

export interface FromLeadProps {
    // Optional: pure call leads (from contractor-ai) have no backend Lead row to link.
    leadId?: number
    name: string
    email?: string
    phone?: string
    address?: string
    projectType?: string
    description?: string
    estimatedValue?: number
    // When true (quote-request leads), auto-enhance the description on open instead of
    // waiting for the "View enhanced" button. Call leads leave this false (plain prefill).
    enhanceOnOpen?: boolean
}

// Quote-request forms store project_type as a snake_case slug (e.g. "bathroom_renovation").
// Map the known slugs to their proper labels, falling back to title-casing for anything else.
const PROJECT_TYPE_LABELS: Record<string, string> = {
    bathroom_renovation: "Bathroom Renovation",
    kitchen_renovation: "Kitchen Renovation",
    flooring: "Flooring Installation",
    painting: "Painting",
    roofing: "Roofing",
    plumbing: "Plumbing",
    electrical: "Electrical Work",
    hvac: "HVAC",
    landscaping: "Landscaping",
    general_construction: "General Construction",
    other: "Other",
}

function formatProjectType(value?: string): string {
    if (!value) return ""
    const key = value.trim().toLowerCase()
    if (PROJECT_TYPE_LABELS[key]) return PROJECT_TYPE_LABELS[key]
    return value
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface NewProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onProjectCreated: (projectId: number) => void
    fromQuote?: FromQuoteProps
    fromLead?: FromLeadProps
    defaultClientId?: number
}

export function NewProjectDialog({
    open,
    onOpenChange,
    onProjectCreated,
    fromQuote,
    fromLead,
    defaultClientId,
}: NewProjectDialogProps) {
    const t = useTranslations("projects.newProjectDialog")
    const { toast } = useToast()

    const [title, setTitle] = useState("")
    const [objective, setObjective] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Original (raw) customer request, cached AI-enhanced version, and which one is shown.
    const [originalDescription, setOriginalDescription] = useState("")
    const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null)
    const [showingEnhanced, setShowingEnhanced] = useState(false)
    const [enhancing, setEnhancing] = useState(false)

    const projectType = fromLead?.projectType ?? fromQuote?.title

    // Fetch the AI-enhanced description and switch the textarea to it.
    // `silent` suppresses the error toast (used for the automatic on-open enhancement).
    const requestEnhanced = async (source: string, opts: { silent?: boolean } = {}) => {
        if (!source.trim()) return
        setEnhancing(true)
        try {
            const { refined_description } = await api.refineProjectDescription(source.trim(), projectType)
            setEnhancedDescription(refined_description)
            setObjective(refined_description)
            setShowingEnhanced(true)
        } catch (err: any) {
            if (!opts.silent) {
                toast({
                    title: "Couldn't enhance description",
                    description: err?.message || "Please try again.",
                    variant: "destructive",
                })
            }
        } finally {
            setEnhancing(false)
        }
    }

    // `fromLead`/`fromQuote` are new object literals on every parent render, so we initialize
    // (and auto-enhance) only on the closed -> open transition — not on every re-render.
    // Otherwise the textarea would reset and refine-description would fire repeatedly.
    const initializedRef = useRef(false)

    useEffect(() => {
        if (open && !initializedRef.current) {
            initializedRef.current = true

            if (fromLead) {
                setTitle(formatProjectType(fromLead.projectType) || `${fromLead.name} Project`)
                setObjective(fromLead.description || "")
                setOriginalDescription(fromLead.description || "")
                setStartDate("")
                setEndDate("")
            } else if (fromQuote) {
                setTitle(fromQuote.title || "")
                setObjective(fromQuote.objective || "")
                setOriginalDescription(fromQuote.objective || "")
                setStartDate(fromQuote.startDate || "")
                setEndDate(fromQuote.endDate || "")
            }
            setEnhancedDescription(null)
            setShowingEnhanced(false)
            setEnhancing(false)

            // Quote-request leads: auto-enhance the description once on open (no button click).
            // Falls back silently to the original text if the request fails.
            if (fromLead?.enhanceOnOpen && (fromLead.description || "").trim()) {
                void requestEnhanced(fromLead.description!, { silent: true })
            }
        } else if (!open && initializedRef.current) {
            initializedRef.current = false
            setTitle("")
            setObjective("")
            setOriginalDescription("")
            setStartDate("")
            setEndDate("")
            setEnhancedDescription(null)
            setShowingEnhanced(false)
            setEnhancing(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleToggleEnhanced = async () => {
        if (showingEnhanced) {
            // Revert to the original raw request.
            setObjective(originalDescription)
            setShowingEnhanced(false)
            return
        }

        if (enhancedDescription !== null) {
            setObjective(enhancedDescription)
            setShowingEnhanced(true)
            return
        }

        await requestEnhanced(objective.trim() || originalDescription.trim())
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({
                title: t("validation.titleRequired"),
                variant: "destructive",
            })
            return
        }
        if (fromLead && !defaultClientId) {
            toast({
                title: "Save the client first",
                description: "Create the client record before starting the project.",
                variant: "destructive",
            })
            return
        }

        setSubmitting(true)
        try {
            const clientId: number | undefined = defaultClientId

            const payload: Record<string, any> = { title: title.trim() }
            if (objective.trim()) payload.objective = objective.trim()
            if (startDate) payload.scheduled_start_date = startDate
            if (endDate) payload.scheduled_end_date = endDate
            if (clientId) payload.client_id = clientId

            if (fromLead) {
                if (fromLead.estimatedValue != null) payload.contract_value = fromLead.estimatedValue
                if (fromLead.leadId != null) payload.lead_id = fromLead.leadId
            }

            if (fromQuote) {
                if (fromQuote.clientId) payload.client_id = fromQuote.clientId
                if (fromQuote.contractValue != null) payload.contract_value = fromQuote.contractValue
                if (fromQuote.jobId) payload.job_id = fromQuote.jobId
            }

            const created = (await api.createProject(payload)) as any
            if (created?.id) {
                const initialBrief = buildInitialProjectBrief({
                    title: title.trim(),
                    objective: objective.trim(),
                    rawRequest: originalDescription.trim(),
                    startDate,
                    endDate,
                    source: fromLead ? "lead" : fromQuote ? "quote" : "manual",
                })

                try {
                    await api.updateProject(created.id, { brief: initialBrief })
                } catch {
                    // Keep creation successful even if the initial brief seed fails.
                }

                if (fromLead?.leadId != null) {
                    try {
                        await api.updateLead(fromLead.leadId, {
                            converted_to_project_id: created.id,
                        })
                    } catch {
                        // project created — lead update is best-effort
                    }
                }
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
                    {fromLead ? (
                        <DialogDescription className="flex items-center gap-1.5 text-sm text-slate-500">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            Creating project from lead — linked to client {fromLead.name}.
                        </DialogDescription>
                    ) : fromQuote ? (
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
                    {fromLead && (
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-1">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Linked client</p>
                            <p className="text-sm font-medium text-blue-900">{fromLead.name}</p>
                            {fromLead.email && <p className="text-xs text-blue-700">{fromLead.email}</p>}
                            {fromLead.phone && <p className="text-xs text-blue-700">{fromLead.phone}</p>}
                            {fromLead.address && <p className="text-xs text-blue-600">{fromLead.address}</p>}
                        </div>
                    )}

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

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="project-objective" className="text-sm font-medium text-slate-700">
                                {t("fields.objective")}
                            </Label>
                            {originalDescription.trim() && (
                                <button
                                    type="button"
                                    onClick={handleToggleEnhanced}
                                    disabled={enhancing || submitting}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                                >
                                    {enhancing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Enhancing…
                                        </>
                                    ) : showingEnhanced ? (
                                        <>
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Revert to original
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Enhance description
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <textarea
                            id="project-objective"
                            rows={3}
                            placeholder={t("fields.objectivePlaceholder")}
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                        />
                        {showingEnhanced && (
                            <p className="text-[11px] text-blue-600 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI-enhanced — original request is saved for reference.
                            </p>
                        )}
                    </div>

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
