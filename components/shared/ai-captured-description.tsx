"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sparkles, ChevronDown, Loader2, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AiCapturedDescriptionProps {
    // Raw source text to refine (the lead/quote request). Panel hides itself if empty.
    source: string
    // Refine target, e.g. "project_description" or "quote_description".
    target: string
    projectType?: string
    // When true, capture runs automatically once on mount (e.g. for call/quote leads).
    autoGenerate?: boolean
    // Called when the user pulls the captured text into their own description field.
    onUse: (text: string) => void
    // Called whenever a captured version is produced, so the parent can fall back to
    // it when the user leaves their own description blank.
    onCapture?: (text: string) => void
}

// A collapsible panel that shows an AI-captured version of the customer's request.
// It does NOT fill the description field itself — the user reads it here and clicks
// "Use as description" to copy it into their own writing.
export function AiCapturedDescription({
    source,
    target,
    projectType,
    autoGenerate,
    onUse,
    onCapture,
}: AiCapturedDescriptionProps) {
    const [text, setText] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(true)
    const [used, setUsed] = useState(false)
    const generatedRef = useRef(false)

    const generate = async () => {
        if (!source.trim() || loading) return
        setLoading(true)
        try {
            const { refined_text } = await api.refine(source.trim(), target, { project_type: projectType })
            setText(refined_text)
            onCapture?.(refined_text)
            setOpen(true)
        } catch {
            // Silent — the panel just stays in its "generate" state.
        } finally {
            setLoading(false)
        }
    }

    // Capture once, as soon as we have source text (it may arrive a render after mount).
    useEffect(() => {
        if (autoGenerate && source.trim() && !generatedRef.current) {
            generatedRef.current = true
            void generate()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, autoGenerate])

    if (!source.trim()) return null

    return (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50">
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-left text-xs font-semibold text-blue-700">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        AI Captured Description
                        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {text && (
                            <button
                                type="button"
                                onClick={() => {
                                    onUse(text)
                                    setUsed(true)
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                            >
                                {used ? (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        Added to description
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-3.5 w-3.5" />
                                        Use as description
                                    </>
                                )}
                            </button>
                        )}
                        <CollapsibleTrigger>
                            <ChevronDown
                                className={cn("h-4 w-4 text-blue-500 transition-transform", open && "rotate-180")}
                            />
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent className="px-3 pb-3">
                    {text ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>
                    ) : loading ? (
                        <p className="text-xs text-blue-600">Capturing details from the request…</p>
                    ) : (
                        <button
                            type="button"
                            onClick={generate}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Capture with AI
                        </button>
                    )}
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}
