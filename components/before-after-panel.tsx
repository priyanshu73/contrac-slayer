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
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react"

export interface BeforeAfterLineItem {
  title?: string
  description?: string
  quantity?: number
  unitOfMeasure?: string
}

export interface BeforeAfterImagePair {
  id: string
  beforePreview: string
  beforeFile?: File | null
  beforeFileName?: string | null
  afterUrl?: string | null
  afterFileName?: string | null
  status: "saved" | "pending" | "generating" | "success" | "failed"
  error?: string | null
}

interface BeforeAfterPanelProps {
  jobId?: number | null
  lineItems: BeforeAfterLineItem[]
  jobDescription: string
  jobTitle: string
  imagePairs: BeforeAfterImagePair[]
  onImagePairsChange: (pairs: BeforeAfterImagePair[]) => void
}

const UI_MAX_BEFORE_AFTER_IMAGES = 1

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

function makePairId() {
  return `before-after-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function BeforeAfterPanel({
  jobId,
  lineItems,
  jobDescription,
  jobTitle,
  imagePairs,
  onImagePairsChange,
}: BeforeAfterPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [selectedLineItems, setSelectedLineItems] = useState<Record<number, boolean>>({})
  const [afterImageDescription, setAfterImageDescription] = useState("")
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

  const pendingPairs = imagePairs.filter(
    (pair) => pair.beforeFile && (!pair.afterUrl || pair.status === "failed" || pair.status === "pending")
  )

  const canGenerate = Boolean(jobId) && pendingPairs.length > 0 && selectedUsableLineItems.length > 0 && afterImageDescription.trim().length > 0 && !isGenerating

  const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const availableSlots = UI_MAX_BEFORE_AFTER_IMAGES - imagePairs.length
    if (availableSlots <= 0) {
      setGenerationError("Only one before photo can be added right now.")
      event.target.value = ""
      return
    }

    const filesToAdd = files.slice(0, availableSlots)
    const newPairs: BeforeAfterImagePair[] = filesToAdd.map((file) => ({
      id: makePairId(),
      beforePreview: URL.createObjectURL(file),
      beforeFile: file,
      beforeFileName: file.name,
      afterUrl: null,
      afterFileName: null,
      status: "pending",
      error: null,
    }))

    onImagePairsChange([...imagePairs, ...newPairs])
    setGenerationError(
      files.length > filesToAdd.length
        ? "Only the first image was added."
        : null
    )
    event.target.value = ""
  }

  const handleGenerate = async () => {
    if (!jobId) {
      setGenerationError("Save the quote first so we can generate and store the before/after pair.")
      return
    }

    if (!afterImageDescription.trim()) {
      setGenerationError("Add the after image description before generating.")
      return
    }

    if (pendingPairs.length === 0 || selectedUsableLineItems.length === 0) return

    setIsGenerating(true)
    setGenerationError(null)
    onImagePairsChange(
      imagePairs.map((pair) =>
        pendingPairs.some((pendingPair) => pendingPair.id === pair.id)
          ? { ...pair, status: "generating", error: null }
          : pair
      )
    )

    let messageIndex = 0
    const messageTimer = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessageIndex(messageIndex)
    }, 3500)

    try {
      const result = await api.generateAfterImagesBatch(jobId, {
        beforeImages: pendingPairs
          .map((pair) => pair.beforeFile)
          .filter((file): file is File => Boolean(file)),
        afterImageDescription: afterImageDescription.trim(),
        lineItems: selectedUsableLineItems.map((item) => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
        })),
        userPrompt: userPrompt.trim(),
      })

      const resultById = new Map(
        pendingPairs.map((pair, index) => [pair.id, result.items[index]])
      )

      onImagePairsChange(
        imagePairs.map((pair) => {
          const item = resultById.get(pair.id)
          if (!item) return pair

          if (item.success) {
            return {
              ...pair,
              beforePreview: item.before_image_url || pair.beforePreview,
              beforeFile: null,
              beforeFileName: item.before_file_name || pair.beforeFileName,
              afterUrl: item.after_image_url || null,
              afterFileName: item.after_file_name || null,
              status: "success",
              error: null,
            }
          }

          return {
            ...pair,
            status: "failed",
            error: item.error || "After image generation failed for this photo.",
          }
        })
      )

      const failedCount = result.items.filter((item) => !item.success).length
      if (failedCount > 0) {
        setGenerationError(
          failedCount === result.items.length
            ? "After image generation failed for all selected photos."
            : `After image generation failed for ${failedCount} photo${failedCount === 1 ? "" : "s"}.`
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate the after image previews."

      onImagePairsChange(
        imagePairs.map((pair) =>
          pendingPairs.some((pendingPair) => pendingPair.id === pair.id)
            ? { ...pair, status: "failed", error: message }
            : pair
        )
      )
      setGenerationError(message)
    } finally {
      window.clearInterval(messageTimer)
      setLoadingMessageIndex(0)
      setIsGenerating(false)
    }
  }

  const handleDownload = (pair: BeforeAfterImagePair, index: number) => {
    if (!pair.afterUrl) return
    const anchor = document.createElement("a")
    anchor.href = pair.afterUrl
    anchor.download = pair.afterFileName || `ai-after-render-${index + 1}.png`
    anchor.click()
  }

  const handleRemovePair = (pairId: string) => {
    onImagePairsChange(imagePairs.filter((pair) => pair.id !== pairId))
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
          Upload a before photo, choose the quote items to include, and we&apos;ll generate and save the before/after preview on the quote.
        </p>
        {!jobId && (
          <p className="text-xs text-amber-700">
            Save the quote first to generate and store before/after images.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-auto min-h-10 rounded-full px-4 py-2"
            disabled={imagePairs.length >= UI_MAX_BEFORE_AFTER_IMAGES}
          >
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium text-slate-900">
                  {imagePairs.length > 0 ? "Replace before photo" : "Upload before photo"}
                </div>
              </div>
            </div>
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelectFiles}
          />
          <div className="min-w-0 flex-1 pt-2 text-sm text-slate-500">
            {imagePairs.length > 0 ? (
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>
                  Before photo ready
                </span>
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
                    None
                  </button>
                </div>
              </div>
              <DropdownMenuSeparator />
              {usableLineItems.map((item) => {
                const checked = selectedLineItems[item.originalIndex] ?? true
                const label = item.title?.trim() || item.description?.trim() || "Untitled item"
                const detail = item.title?.trim() && item.description?.trim() ? item.description?.trim() : null

                return (
                  <DropdownMenuCheckboxItem
                    key={item.originalIndex}
                    checked={checked}
                    onCheckedChange={() => toggleLineItem(item.originalIndex)}
                    className="items-start gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{label}</div>
                      {detail ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{detail}</div>
                      ) : null}
                    </div>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">
            After image description <span className="text-rose-500">*</span>
          </label>
          <Textarea
            value={afterImageDescription}
            onChange={(event) => {
              setAfterImageDescription(event.target.value)
            }}
            rows={4}
            className="min-h-[112px] resize-none"
            placeholder="Explain how the final image should look like."
          />
          <p className="text-xs text-slate-500">
            This required field tells the AI what finished result to visualize from the selected line items and project context.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Additional AI guidance</label>
          <Textarea
            value={userPrompt}
            onChange={(event) => {
              setHasEditedPrompt(true)
              setUserPrompt(event.target.value)
            }}
            rows={4}
            className="min-h-[112px] resize-none"
            placeholder="Optional extra guidance about style, finish details, emphasis, realism, or landscaping mood."
          />
          <p className="text-xs text-slate-500">
            The selected quote items and after image description are always included. Use this for extra direction only.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900">
                {pendingPairs.length > 0
                  ? `Ready to generate ${pendingPairs.length} photo${pendingPairs.length === 1 ? "" : "s"}`
                  : "All uploaded photos are up to date"}
              </div>
              <p className="text-xs text-slate-500">
                Failed items stay visible below so users can see which after image didn&apos;t generate.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="rounded-full px-5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate After Images
                </>
              )}
            </Button>
          </div>

          {isGenerating ? (
            <div className="mt-4 space-y-2">
              <Progress value={72} className="h-2" />
              <p className="text-xs text-slate-500">{loadingMessages[loadingMessageIndex]}</p>
            </div>
          ) : null}

          {generationError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {generationError}
            </div>
          ) : null}
        </div>

        {imagePairs.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {imagePairs.map((pair, index) => (
              <div key={pair.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Preview Pair {index + 1}</p>
                    <p className="text-xs text-slate-500">
                      {pair.status === "failed"
                        ? "After image failed"
                        : pair.afterUrl
                          ? "Saved on quote"
                          : "Before photo ready"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pair.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    ) : pair.afterUrl ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        Pending
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemovePair(pair.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className={cn("grid gap-0", pair.afterUrl ? "md:grid-cols-2" : "grid-cols-1")}>
                  <div className="border-b border-slate-200 md:border-b-0 md:border-r">
                    <div className="aspect-[4/3] bg-slate-100">
                      <img
                        src={pair.beforePreview}
                        alt={`Before preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        Before
                      </span>
                    </div>
                  </div>

                  {pair.afterUrl ? (
                    <div>
                      <div className="aspect-[4/3] bg-slate-100">
                        <img
                          src={pair.afterUrl}
                          alt={`After preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium leading-tight text-emerald-700">
                          After (Estimated)
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(pair, index)}
                          className="w-full sm:w-auto"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[120px] items-center justify-center px-4 py-6 text-center text-sm text-slate-500">
                      {pair.status === "generating"
                        ? "Generating after image..."
                        : pair.error || "Generate this photo to see the after image."}
                    </div>
                  )}
                </div>

                {pair.error ? (
                  <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {pair.error}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
