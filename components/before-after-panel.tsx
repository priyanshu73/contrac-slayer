"use client"

import type { ChangeEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Download, ImagePlus, Loader2, Sparkles } from "lucide-react"

export interface BeforeAfterLineItem {
  title?: string
  description?: string
  quantity?: number
  unitOfMeasure?: string
}

interface BeforeAfterPanelProps {
  jobId?: number | null
  lineItems: BeforeAfterLineItem[]
  jobDescription: string
  jobTitle: string
  beforeImageFile: File | null
  beforeImagePreview: string | null
  generatedAfterUrl: string | null
  onBeforeImageSelect: (file: File | null, preview: string | null) => void
  onAfterImageGenerated: (dataUrl: string) => void
}

const loadingMessages = [
  "AI is rendering your project...",
  "Keeping the same angle while applying your scope of work...",
  "Polishing a photorealistic after view...",
]

function buildDefaultUserPrompt(
  jobTitle: string,
  jobDescription: string,
  _lineItems: BeforeAfterLineItem[],
) {
  const title = jobTitle.trim() || "this project"
  const description = jobDescription.trim()

  return [
    `Create a clean, photorealistic after image for ${title}.`,
    description ? `Project context: ${description}` : "",
    "Keep the same camera angle and make the finished work look realistic and complete.",
  ]
    .filter(Boolean)
    .join("\n")
}

export function BeforeAfterPanel({
  jobId,
  lineItems,
  jobDescription,
  jobTitle,
  beforeImageFile,
  beforeImagePreview,
  generatedAfterUrl,
  onBeforeImageSelect,
  onAfterImageGenerated,
}: BeforeAfterPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [selectedLineItems, setSelectedLineItems] = useState<Record<number, boolean>>({})
  const [userPrompt, setUserPrompt] = useState("")
  const [hasEditedPrompt, setHasEditedPrompt] = useState(false)

  const usableLineItems = lineItems
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter((item) => {
      const text = item.title?.trim() || item.description?.trim()
      return Boolean(text)
    })
  const usableLineItemsSignature = usableLineItems
    .map((item) => `${item.originalIndex}:${item.title || ""}:${item.description || ""}:${item.quantity || ""}:${item.unitOfMeasure || ""}`)
    .join("|")

  useEffect(() => {
    setSelectedLineItems((previous) => {
      const next: Record<number, boolean> = {}
      for (const item of usableLineItems) {
        next[item.originalIndex] = previous[item.originalIndex] ?? true
      }
      return next
    })
  }, [usableLineItemsSignature])

  const defaultUserPrompt = buildDefaultUserPrompt(jobTitle, jobDescription, usableLineItems)

  useEffect(() => {
    if (!hasEditedPrompt || !userPrompt.trim()) {
      setUserPrompt(defaultUserPrompt)
    }
  }, [defaultUserPrompt, hasEditedPrompt, userPrompt])

  const selectedUsableLineItems = usableLineItems.filter(
    (item) => selectedLineItems[item.originalIndex] ?? true
  )
  const hasGeneratedPreview = Boolean(generatedAfterUrl)

  const canGenerate = Boolean(beforeImagePreview) && selectedUsableLineItems.length > 0 && !isGenerating

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setGenerationError(null)
    onBeforeImageSelect(file, preview)
    event.target.value = ""
  }

  const handleGenerate = async () => {
    if (!beforeImagePreview || selectedUsableLineItems.length === 0) return

    setIsGenerating(true)
    setGenerationError(null)
    let messageIndex = 0
    const messageTimer = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessageIndex(messageIndex)
    }, 3500)

    try {
      let result: { after_image_url: string }

      if (beforeImageFile) {
        result = await api.generateAfterImagePreview({
          beforeImage: beforeImageFile,
          jobTitle,
          jobDescription,
          lineItems: selectedUsableLineItems.map((item) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure,
          })),
          userPrompt: userPrompt.trim(),
        })
      } else if (jobId && beforeImagePreview) {
        result = await api.generateAfterImage(jobId, beforeImagePreview, {
          lineItems: selectedUsableLineItems.map((item) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure,
          })),
          userPrompt: userPrompt.trim(),
        })
      } else {
        throw new Error("Upload a before photo before generating the preview.")
      }

      onAfterImageGenerated(result.after_image_url)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Unable to generate the after image preview."
      )
    } finally {
      window.clearInterval(messageTimer)
      setLoadingMessageIndex(0)
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedAfterUrl) return
    const anchor = document.createElement("a")
    anchor.href = generatedAfterUrl
    anchor.download = "ai-after-render.png"
    anchor.click()
  }

  const toggleLineItem = (originalIndex: number) => {
    setSelectedLineItems((previous) => ({
      ...previous,
      [originalIndex]: !(previous[originalIndex] ?? true),
    }))
  }

  const setAllLineItemsSelected = (selected: boolean) => {
    const next: Record<number, boolean> = {}
    for (const item of usableLineItems) {
      next[item.originalIndex] = selected
    }
    setSelectedLineItems(next)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <Sparkles className="h-4 w-4" />
          <span>Before & After Preview</span>
        </div>
        <p className="text-sm text-slate-600">
          Upload one photo, choose which quote items to include, and generate the after image when you&apos;re ready.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-auto min-h-10 rounded-full px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium text-slate-900">
                  {beforeImagePreview ? "Replace before photo" : "Upload before photo"}
                </div>
                <div className="text-[10px] leading-3 text-slate-400">PNG, JPG, WEBP, HEIC</div>
              </div>
            </div>
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelectFile}
          />
          <div className="min-w-0 flex-1 pt-2 text-sm text-slate-500">
            {beforeImagePreview ? (
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Before photo ready</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 max-w-full rounded-full px-4 py-2"
                disabled={usableLineItems.length === 0}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-medium text-slate-900">Select scope</div>
                    {usableLineItems.length > 0 && (
                      <p className="text-[10px] leading-3 text-slate-400">
                        {selectedUsableLineItems.length}/{usableLineItems.length} selected
                      </p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-[11px] font-medium text-slate-700">
                  Quote items
                </DropdownMenuLabel>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAllLineItemsSelected(true)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllLineItemsSelected(false)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <DropdownMenuSeparator />
              {usableLineItems.map((item) => {
                const checked = selectedLineItems[item.originalIndex] ?? true
                return (
                  <DropdownMenuCheckboxItem
                    key={`${item.title || item.description || "item"}-${item.originalIndex}`}
                    checked={checked}
                    onCheckedChange={() => toggleLineItem(item.originalIndex)}
                    className="items-start"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-900">
                        {item.title?.trim() || item.description?.trim() || "Line item"}
                      </div>
                      {item.title?.trim() && item.description?.trim() && item.description.trim() !== item.title.trim() && (
                        <div className="line-clamp-2 text-xs text-slate-500">{item.description}</div>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {usableLineItems.length === 0 && (
            <div className="min-w-0 flex-1 pt-2 text-sm text-slate-500">
              Add at least one line item to generate a preview.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Prompt</h3>
              <p className="text-xs text-slate-500">Uses the existing quote details by default.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserPrompt(defaultUserPrompt)
                setHasEditedPrompt(false)
              }}
            >
              Reset
            </Button>
          </div>
          <Textarea
            value={userPrompt}
            onChange={(event) => {
              setHasEditedPrompt(true)
              setUserPrompt(event.target.value)
            }}
            placeholder="Describe what the finished project should look like..."
            className="min-h-[120px] resize-y border-slate-200 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={!canGenerate} onClick={handleGenerate} className="bg-emerald-600 hover:bg-emerald-700">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generatedAfterUrl ? "Regenerate After Image" : "Generate After Image"}
          </Button>
          {generatedAfterUrl && (
            <Button type="button" variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download After Image
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{loadingMessages[loadingMessageIndex]}</p>
            <Progress value={65} className="h-1.5" />
          </div>
        )}

        {generationError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {generationError}
          </div>
        )}

        {hasGeneratedPreview && (
          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Before</p>
              <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-slate-100", !beforeImagePreview && "flex aspect-[4/3] items-center justify-center")}>
                {beforeImagePreview ? (
                  <img src={beforeImagePreview} alt="Before" className="aspect-[4/3] h-full w-full object-cover" />
                ) : (
                  <div className="text-sm text-slate-400">Before photo preview</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">After</p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {generatedAfterUrl ? (
                  <img src={generatedAfterUrl} alt="After rendering" className="aspect-[4/3] h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-400">Generated after image</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
