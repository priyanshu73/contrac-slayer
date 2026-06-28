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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Loader2, FileText, User, ChevronsUpDown, UserPlus, Check } from "lucide-react"
import { AiCapturedDescription } from "@/components/shared/ai-captured-description"
import { formatProjectType, isUsableProjectType } from "@/lib/project-type"
import { buildInitialProjectBrief } from "@/lib/project-brief"
import { AddClientForm, type CreatedClient } from "@/components/add-client-form"
import { cn } from "@/lib/utils"

type ClientOption = { id: number; name: string; email?: string }
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

    // Manual client selection (only relevant when not coming from a lead/quote, which
    // already carry their own client). Optional — a project can be created without one.
    const [clients, setClients] = useState<ClientOption[]>([])
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
    const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
    const [addClientPanelOpen, setAddClientPanelOpen] = useState(false)
    const showClientSelector = !fromLead && !fromQuote
    const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null

    // Raw customer request, kept to seed the project brief's rawRequest.
    const [originalDescription, setOriginalDescription] = useState("")
    // AI-captured description reported by the panel; used as a fallback when the user
    // leaves their own description blank.
    const [aiDescription, setAiDescription] = useState("")

    const rawProjectType = fromLead?.projectType ?? fromQuote?.title
    // Only feed a real work type into the AI as context — not call placeholders.
    const projectType = isUsableProjectType(rawProjectType) ? rawProjectType : undefined
    // Raw text the AI-captured-description panel refines (lead request / quote objective).
    const aiSource = fromLead?.description ?? fromQuote?.objective ?? ""

    // Derive a relevant title from the raw request when the lead has no usable project
    // type (e.g. call leads). Best-effort and silent — keeps the fallback title on failure.
    const requestTitle = async (source: string) => {
        if (!source.trim()) return
        try {
            const { refined_text } = await api.refine(source.trim(), "project_title", { project_type: projectType })
            if (refined_text.trim()) setTitle(refined_text.trim())
        } catch {
            // Keep the fallback title.
        }
    }

    // `fromLead`/`fromQuote` are new object literals on every parent render, so we initialize
    // (and auto-enhance) only on the closed -> open transition — not on every re-render.
    // Otherwise the textarea would reset and refine-description would fire repeatedly.
    const initializedRef = useRef(false)

    useEffect(() => {
        if (open && !initializedRef.current) {
            initializedRef.current = true

            setAiDescription("")
            if (fromLead) {
                const usableType = isUsableProjectType(fromLead.projectType)
                setTitle(usableType ? formatProjectType(fromLead.projectType) : `${fromLead.name} Project`)
                // Leave the objective empty for the user to write; the AI-captured version
                // lives in its own panel below.
                setObjective("")
                setOriginalDescription(fromLead.description || "")
                setStartDate("")
                setEndDate("")

                // No usable project type (e.g. call leads, where it's "AI Operator Call") →
                // derive a relevant title from the request text instead of the generic fallback.
                if (fromLead.enhanceOnOpen && (fromLead.description || "").trim() && !usableType) {
                    void requestTitle(fromLead.description!)
                }
            } else if (fromQuote) {
                setTitle(fromQuote.title || "")
                setObjective(fromQuote.objective || "")
                setOriginalDescription(fromQuote.objective || "")
                setStartDate(fromQuote.startDate || "")
                setEndDate(fromQuote.endDate || "")
            }
        } else if (!open && initializedRef.current) {
            initializedRef.current = false
            setTitle("")
            setObjective("")
            setOriginalDescription("")
            setAiDescription("")
            setStartDate("")
            setEndDate("")
            setSelectedClientId(null)
            setAddClientPanelOpen(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Load clients for the optional selector (manual creation only).
    useEffect(() => {
        if (!open || !showClientSelector) return
        let cancelled = false
        api.getClients(0, 500)
            .then((res: any) => {
                if (cancelled) return
                const list = Array.isArray(res) ? res : res?.clients ?? res?.items ?? []
                setClients(list.map((c: any) => ({ id: c.id, name: c.name, email: c.email })))
            })
            .catch(() => {
                // Non-fatal: the selector just stays empty, client remains optional.
            })
        return () => {
            cancelled = true
        }
    }, [open, showClientSelector])

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
            const clientId: number | undefined = defaultClientId ?? selectedClientId ?? undefined

            // Fall back to the AI-captured description when the user left their own blank.
            const finalObjective = objective.trim() || aiDescription.trim()

            const payload: Record<string, any> = { title: title.trim() }
            if (finalObjective) payload.objective = finalObjective
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
                    objective: finalObjective,
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
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    {fromLead ? (
                        <DialogTitle className="text-lg font-semibold text-slate-900">
                            {t("title")} from lead
                            <span className="font-normal text-slate-500"> — linked to client {fromLead.name}</span>
                        </DialogTitle>
                    ) : (
                        <DialogTitle className="text-lg font-semibold text-slate-900">
                            {t("title")}
                        </DialogTitle>
                    )}
                    {fromQuote ? (
                        <DialogDescription className="flex items-center gap-1.5 text-sm text-slate-500">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            Pre-filled from accepted quote — review and adjust before creating.
                        </DialogDescription>
                    ) : !fromLead ? (
                        <DialogDescription className="text-sm text-slate-500">
                            {t("description")}
                        </DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {fromLead && (
                        <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="text-sm font-semibold text-blue-900 truncate">{fromLead.name}</p>
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide shrink-0">
                                        Linked client
                                    </span>
                                </div>
                                {(fromLead.email || fromLead.phone || fromLead.address) && (
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-blue-700">
                                        {fromLead.email && <span className="truncate">{fromLead.email}</span>}
                                        {fromLead.email && fromLead.phone && <span className="text-blue-300">·</span>}
                                        {fromLead.phone && <span>{fromLead.phone}</span>}
                                        {(fromLead.email || fromLead.phone) && fromLead.address && (
                                            <span className="text-blue-300">·</span>
                                        )}
                                        {fromLead.address && <span className="truncate">{fromLead.address}</span>}
                                    </div>
                                )}
                            </div>
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

                    {showClientSelector && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Client <span className="font-normal text-slate-400">(optional)</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 px-2 text-xs text-slate-600 hover:text-slate-900"
                                    onClick={() => setAddClientPanelOpen(true)}
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Add client
                                </Button>
                            </div>
                            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={clientComboboxOpen}
                                        className={cn(
                                            "w-full justify-between border-slate-200 font-normal",
                                            !selectedClient && "text-slate-400"
                                        )}
                                    >
                                        {selectedClient ? (
                                            <span className="truncate text-slate-900">
                                                {selectedClient.name}
                                                {selectedClient.email && (
                                                    <span className="text-slate-400"> · {selectedClient.email}</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span>Select a client</span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search clients..." className="h-10" />
                                        <CommandList>
                                            <CommandEmpty>No clients found.</CommandEmpty>
                                            <CommandGroup>
                                                {selectedClient && (
                                                    <CommandItem
                                                        value="__clear__"
                                                        onSelect={() => {
                                                            setSelectedClientId(null)
                                                            setClientComboboxOpen(false)
                                                        }}
                                                        className="text-slate-500"
                                                    >
                                                        Clear selection
                                                    </CommandItem>
                                                )}
                                                {clients.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={`${c.name} ${c.email ?? ""}`}
                                                        onSelect={() => {
                                                            setSelectedClientId(c.id)
                                                            setClientComboboxOpen(false)
                                                        }}
                                                        className="gap-2"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4 shrink-0",
                                                                selectedClientId === c.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-medium text-slate-900">
                                                                {c.name}
                                                            </span>
                                                            {c.email && (
                                                                <span className="block truncate text-xs text-slate-500">
                                                                    {c.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

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
                        <AiCapturedDescription
                            source={aiSource}
                            target="project_description"
                            projectType={projectType}
                            autoGenerate={!!fromLead?.enhanceOnOpen}
                            onUse={setObjective}
                            onCapture={setAiDescription}
                        />
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

        {showClientSelector && (
            <Sheet open={addClientPanelOpen} onOpenChange={setAddClientPanelOpen}>
                <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Add client</SheetTitle>
                        <p className="text-sm text-muted-foreground">
                            Create a new client and link it to this project.
                        </p>
                    </SheetHeader>
                    <div className="mt-4 px-1">
                        <AddClientForm
                            embedded
                            onSuccess={(newClient: CreatedClient) => {
                                setClients((prev) =>
                                    prev.some((c) => c.id === newClient.id)
                                        ? prev
                                        : [{ id: newClient.id, name: newClient.name, email: newClient.email }, ...prev]
                                )
                                setSelectedClientId(newClient.id)
                                setAddClientPanelOpen(false)
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        )}
        </>
    )
}
