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
  imagePairs: BeforeAfterImagePair[]
  onImagePairsChange: (pairs: BeforeAfterImagePair[]) => void
}

const UI_MAX_BEFORE_AFTER_IMAGES = 1

const loadingMessages = [
  "AI is rendering your project...",
  "Keeping the same angle while applying your scope of work...",
  "Polishing a photorealistic after view...",
]

function makePairId() {
  return `before-after-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Silk Ripple Loader ───────────────────────────────────────────────────────

const SILK_CSS = `
  .silk-loader-wrap {
    position: absolute;
    inset: 0;
    z-index: 2;
    overflow: hidden;
    background: rgb(8 12 22 / 0.12);
  }
  .silk-loader-img {
    position: absolute;
    inset: -6%;
    width: 112%;
    height: 112%;
    object-fit: cover;
    filter: url(#ba-silk-disp);
    will-change: filter;
  }
  .silk-tint {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 30%, oklch(0.78 0.18 245 / 0.35), transparent 60%),
      radial-gradient(ellipse 80% 60% at 80% 70%, oklch(0.78 0.18 320 / 0.32), transparent 60%),
      linear-gradient(180deg, oklch(0.15 0.05 245 / 0.2), oklch(0.15 0.05 245 / 0.35));
    mix-blend-mode: overlay;
    animation: ba-silk-tint 6s ease-in-out infinite alternate;
  }
  @keyframes ba-silk-tint {
    from { transform: translate(-2%, -1%); }
    to   { transform: translate(2%, 1%); }
  }
  .silk-dots {
    position: absolute;
    inset: -8%;
    background-image: radial-gradient(circle at center, rgb(255 255 255 / 0.55) 1.2px, transparent 1.8px);
    background-size: 13px 13px;
    filter: url(#ba-silk-disp-dots);
    mix-blend-mode: screen;
    opacity: 0.7;
    will-change: filter;
  }
  .silk-sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 28%, rgb(255 255 255 / 0.18) 50%, transparent 72%);
    background-size: 260% 100%;
    background-position: 200% 0;
    animation: ba-silk-sheen 3.2s cubic-bezier(0.4,0,0.6,1) infinite;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
  @keyframes ba-silk-sheen {
    to { background-position: -120% 0; }
  }
  .silk-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgb(0 0 0 / 0.38) 100%);
    mix-blend-mode: multiply;
  }
  .gen-pill {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 11px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.58);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgb(255 255 255 / 0.09);
    color: white;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    box-shadow: 0 8px 24px -8px rgb(0 0 0 / 0.45);
    z-index: 5;
    animation: ba-pill-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes ba-pill-in {
    from { opacity: 0; transform: translateX(-50%) translateY(6px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .gen-pill-dots {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .gen-pill-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: white;
    animation: ba-mini-wave 1.1s ease-in-out infinite;
  }
  .gen-pill-dot:nth-child(2) { animation-delay: 0.13s; }
  .gen-pill-dot:nth-child(3) { animation-delay: 0.26s; }
  @keyframes ba-mini-wave {
    0%, 100% { transform: translateY(2px); opacity: 0.3; }
    50%       { transform: translateY(-2px); opacity: 1; }
  }
  .gen-pill-tick { color: rgb(255 255 255 / 0.6); font-variant-numeric: tabular-nums; margin-left: 1px; }
`

function SilkFilterDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      <defs>
        <filter id="ba-silk-disp" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.022" numOctaves={2} seed={2} result="t">
            <animate attributeName="baseFrequency" dur="9s" values="0.011 0.022;0.022 0.013;0.013 0.018;0.011 0.022" repeatCount="indefinite" />
            <animate attributeName="seed" dur="6s" values="2;9;4;2" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="t" scale={22} />
        </filter>
        <filter id="ba-silk-disp-dots" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.035" numOctaves={2} seed={5} result="t2">
            <animate attributeName="baseFrequency" dur="7s" values="0.018 0.03;0.03 0.02;0.018 0.03" repeatCount="indefinite" />
            <animate attributeName="seed" dur="4s" values="5;12;5" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="t2" scale={14} />
        </filter>
      </defs>
    </svg>
  )
}

function SilkGenerationLoader({ src }: { src: string }) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 100)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="silk-loader-wrap">
      {src && <img src={src} alt="" className="silk-loader-img" />}
      <div className="silk-tint" />
      <div className="silk-dots" />
      <div className="silk-sheen" />
      <div className="silk-vignette" />
      <div className="gen-pill">
        <span className="gen-pill-dots">
          <span className="gen-pill-dot" />
          <span className="gen-pill-dot" />
          <span className="gen-pill-dot" />
        </span>
        <span className="gen-pill-tick">{(elapsedMs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BeforeAfterPanel({
  jobId,
  lineItems,
  imagePairs,
  onImagePairsChange,
}: BeforeAfterPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [selectedLineItems, setSelectedLineItems] = useState<Record<number, boolean>>({})
  const [afterImageDescription, setAfterImageDescription] = useState("")

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
    <>
      <style dangerouslySetInnerHTML={{ __html: SILK_CSS }} />
      <SilkFilterDefs />

      <div className="space-y-2.5">
        {/* No jobId warning */}
        {!jobId && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Save the quote first to generate and store before/after images.
          </div>
        )}

        {/* Card: Photo + Scope */}
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">Photo &amp; Scope</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="h-8 rounded-full px-3.5 text-[12.5px]"
              disabled={imagePairs.length >= UI_MAX_BEFORE_AFTER_IMAGES}
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              {imagePairs.length > 0 ? "Replace photo" : "Upload before photo"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSelectFiles}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 max-w-full rounded-full px-3.5 text-[12.5px]"
                  disabled={usableLineItems.length === 0}
                >
                  <span className="mr-1">Scope</span>
                  {usableLineItems.length > 0 && (
                    <span className="text-zinc-400 text-[11px]">
                      {selectedUsableLineItems.length}/{usableLineItems.length}
                    </span>
                  )}
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel className="p-0 text-[11px] font-medium text-zinc-500">
                    Quote items
                  </DropdownMenuLabel>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAllLineItemsSelected(true)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllLineItemsSelected(false)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
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
                        <div className="truncate text-[13px] font-medium text-zinc-900">{label}</div>
                        {detail ? (
                          <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{detail}</div>
                        ) : null}
                      </div>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {imagePairs.length > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Photo ready
              </span>
            )}
          </div>
        </div>

        {/* Card: After description */}
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
          <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            After description <span className="text-rose-400 normal-case tracking-normal">*</span>
          </label>
          <Textarea
            value={afterImageDescription}
            onChange={(event) => setAfterImageDescription(event.target.value)}
            rows={3}
            className="min-h-[80px] resize-none rounded-lg border-zinc-200 text-[13px] placeholder:text-zinc-400 focus:border-zinc-400"
            placeholder="Describe what the finished result should look like — materials, finish, style."
          />
        </div>

        {/* Generate bar */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-zinc-500">
              {isGenerating
                ? loadingMessages[loadingMessageIndex]
                : pendingPairs.length > 0
                  ? `${pendingPairs.length} photo${pendingPairs.length === 1 ? "" : "s"} queued`
                  : "All renders up to date"}
            </p>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="h-8 shrink-0 rounded-full px-4 text-[12.5px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Generate
                </>
              )}
            </Button>
          </div>

          {generationError && (
            <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-rose-200/60 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {generationError}
            </div>
          )}
        </div>

        {/* Image pair cards */}
        {imagePairs.length > 0 && (
          <div className="space-y-2.5">
            {imagePairs.map((pair, index) => {
              const showAfterSide = Boolean(pair.afterUrl) || pair.status === "generating"

              return (
                <div
                  key={pair.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_0_rgb(15_17_21/0.04),0_4px_16px_-6px_rgb(15_17_21/0.07)]"
                >
                  {/* Minimal status bar */}
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <div className="flex items-center gap-1.5">
                      {pair.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600">
                          <AlertCircle className="h-3 w-3" />Failed
                        </span>
                      ) : pair.status === "generating" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600">
                          <Loader2 className="h-3 w-3 animate-spin" />Generating
                        </span>
                      ) : pair.afterUrl ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600">
                          <Check className="h-3 w-3" />Saved
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-500">
                          Pending
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-300 hover:text-zinc-600"
                      onClick={() => handleRemovePair(pair.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Images — full width, taller */}
                  <div className={cn("grid border-t border-zinc-100/80", showAfterSide ? "grid-cols-2" : "grid-cols-1")}>
                    {/* Before */}
                    <div className={cn("relative", showAfterSide && "border-r border-zinc-100/80")}>
                      <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                        <img
                          src={pair.beforePreview}
                          alt={`Before ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                          Before
                        </span>
                      </div>
                    </div>

                    {/* After / silk loader */}
                    {pair.afterUrl ? (
                      <div className="relative">
                        <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                          <img
                            src={pair.afterUrl}
                            alt={`After ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                            After · AI
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDownload(pair, index)}
                            className="flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/70"
                          >
                            <Download className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : pair.status === "generating" ? (
                      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                        <img
                          src={pair.beforePreview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <SilkGenerationLoader src={pair.beforePreview} />
                      </div>
                    ) : null}
                  </div>

                  {/* Error footer */}
                  {pair.error && (
                    <div className="border-t border-rose-100/80 bg-rose-50/60 px-4 py-2.5 text-[11.5px] text-rose-600">
                      {pair.error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
