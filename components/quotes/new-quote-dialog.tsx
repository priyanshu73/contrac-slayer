"use client"

import { useEffect, useRef, useState } from "react"
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
import { User, ArrowRight } from "lucide-react"
import { AiCapturedDescription } from "@/components/shared/ai-captured-description"
import { formatProjectType, isUsableProjectType } from "@/lib/project-type"

export interface QuoteFromLeadProps {
    leadId?: number
    name: string
    email?: string
    phone?: string
    address?: string
    projectType?: string
    description?: string
    measurements?: any
    // When true (quote-request leads), auto-enhance the description on open instead
    // of waiting for the "Enhance description" button. Call leads leave this false.
    enhanceOnOpen?: boolean
}

export interface QuoteContext {
    title: string
    description: string
    projectType?: string
    measurements?: any
}

interface NewQuoteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fromLead: QuoteFromLeadProps
    // Fired when the user confirms. The parent persists the context (sessionStorage)
    // and navigates to the quote builder.
    onConfirm: (context: QuoteContext) => void
}

export function NewQuoteDialog({ open, onOpenChange, fromLead, onConfirm }: NewQuoteDialogProps) {
    const { toast } = useToast()

    const [title, setTitle] = useState("")
    const [objective, setObjective] = useState("")
    // AI-captured scope reported by the panel; used as a fallback when the user leaves
    // their own scope blank.
    const [aiDescription, setAiDescription] = useState("")

    // Only feed a real work type into the AI as context — not call placeholders.
    const projectType = isUsableProjectType(fromLead?.projectType) ? fromLead?.projectType : undefined
    const aiSource = fromLead?.description ?? ""

    // Derive a relevant title from the raw request when the lead has no usable project
    // type (e.g. call leads). Best-effort and silent — keeps the fallback title on failure.
    const requestTitle = async (source: string) => {
        if (!source.trim()) return
        try {
            const { refined_text } = await api.refine(source.trim(), "quote_title", { project_type: projectType })
            if (refined_text.trim()) setTitle(refined_text.trim())
        } catch {
            // Keep the fallback title.
        }
    }

    // `fromLead` is a new object literal on every parent render, so we initialize
    // (and auto-enhance) only on the closed -> open transition — not on every re-render.
    const initializedRef = useRef(false)

    useEffect(() => {
        if (open && !initializedRef.current) {
            initializedRef.current = true

            const usableType = isUsableProjectType(fromLead.projectType)
            setTitle(usableType ? formatProjectType(fromLead.projectType) : `${fromLead.name} Quote`)
            // Leave the scope empty for the user to write; the AI-captured version lives
            // in its own panel below.
            setObjective("")
            setAiDescription("")

            // No usable project type (e.g. call leads, where it's "AI Operator Call") →
            // derive a relevant title from the request text instead of the generic fallback.
            if (fromLead.enhanceOnOpen && (fromLead.description || "").trim() && !usableType) {
                void requestTitle(fromLead.description!)
            }
        } else if (!open && initializedRef.current) {
            initializedRef.current = false
            setTitle("")
            setObjective("")
            setAiDescription("")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleConfirm = () => {
        if (!title.trim()) {
            toast({ title: "Quote title is required", variant: "destructive" })
            return
        }
        onConfirm({
            title: title.trim(),
            // Fall back to the AI-captured scope when the user left their own blank.
            description: objective.trim() || aiDescription.trim(),
            // Prefer a real enum type; otherwise fall back to the AI-derived title so the
            // builder's free-text Quote Type is filled with the work (e.g. "Backyard
            // Swimming Pool Installation") instead of the "AI Operator Call" placeholder.
            projectType: projectType || title.trim() || undefined,
            measurements: fromLead.measurements,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                        Create New Quote from lead
                        <span className="font-normal text-slate-500"> — linked to client {fromLead.name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        Review the scope below, then continue to the quote builder for AI pricing.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
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

                    <div className="space-y-1.5">
                        <Label htmlFor="quote-title" className="text-sm font-medium text-slate-700">
                            Quote Title <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="quote-title"
                            placeholder="e.g. Bathroom Renovation"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-slate-200"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="quote-scope" className="text-sm font-medium text-slate-700">
                            Scope / Description
                        </Label>
                        <textarea
                            id="quote-scope"
                            rows={4}
                            placeholder="Describe the work to be quoted…"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                        />
                        <AiCapturedDescription
                            source={aiSource}
                            target="quote_description"
                            projectType={projectType}
                            autoGenerate={!!fromLead.enhanceOnOpen}
                            onUse={setObjective}
                            onCapture={setAiDescription}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!title.trim()} className="min-w-[160px]">
                        Continue to Builder
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
