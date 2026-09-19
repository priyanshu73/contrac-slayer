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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  Download,
  ImagePlus,
  Info,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Star,
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
  beforeAngles?: string[]
  afterUrl?: string | null
  afterFileName?: string | null
  status: "saved" | "pending" | "generating" | "success" | "failed"
  description?: string
  error?: string | null
}

interface BeforeAfterPanelProps {
  jobId?: number | null
  lineItems: BeforeAfterLineItem[]
  imagePairs: BeforeAfterImagePair[]
  onImagePairsChange: (pairs: BeforeAfterImagePair[]) => void
  onSavedChange?: () => void
}

const UI_MAX_INDIVIDUAL_IMAGES = 3
const UI_MIN_MULTI_ANGLE_IMAGES = 2
const UI_MAX_MULTI_ANGLE_IMAGES = 4

const loadingMessages = [
  "AI is rendering your project...",
  "Keeping the same angle while applying your scope of work...",
  "Synthesizing site context from your photos...",
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

type GenerationMode = "multi_angle" | "individual"

interface MultiAngleFileItem {
  id: string
  file: File
  preview: string
}

interface IndividualSlot {
  id: string
  beforePreview: string
  beforeFile: File | null
  beforeFileName: string | null
  afterUrl: string | null
  afterFileName: string | null
  status: "pending" | "generating" | "success" | "saved" | "failed"
  description: string
  error: string | null
  isSavedToQuote: boolean
}

export function BeforeAfterPanel({
  jobId,
  lineItems,
  imagePairs,
  onImagePairsChange,
  onSavedChange,
}: BeforeAfterPanelProps) {
  const multiInputRef = useRef<HTMLInputElement | null>(null)
  const singleInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  const { toast } = useToast()
  const [mode, setMode] = useState<GenerationMode>("individual")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingSlotId, setGeneratingSlotId] = useState<string | null>(null)
  const [isSavingMultiAngle, setIsSavingMultiAngle] = useState(false)
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [selectedLineItems, setSelectedLineItems] = useState<Record<number, boolean>>({})
  const [includeProjectContext, setIncludeProjectContext] = useState(true)

  // Mode 1 state: Multiple angles of the same space
  const [multiAngleFiles, setMultiAngleFiles] = useState<MultiAngleFileItem[]>([])
  const [heroAngleIndex, setHeroAngleIndex] = useState(0)
  const [multiAngleDescription, setMultiAngleDescription] = useState("")
  const [latestMultiAngleResult, setLatestMultiAngleResult] = useState<BeforeAfterImagePair | null>(null)
  const [isMultiAngleSaved, setIsMultiAngleSaved] = useState(false)
  const [previewAngleIndex, setPreviewAngleIndex] = useState(0)

  // Mode 2 state: Individual photo slots (isolated local state, never leaks unrendered cards)
  const [individualSlots, setIndividualSlots] = useState<IndividualSlot[]>([
    {
      id: makePairId(),
      beforePreview: "",
      beforeFile: null,
      beforeFileName: null,
      afterUrl: null,
      afterFileName: null,
      status: "pending",
      description: "",
      error: null,
      isSavedToQuote: false,
    },
  ])

  // Saved / completed visualizations only
  const completedPairs = imagePairs.filter(
    (pair) => Boolean(pair.beforePreview && pair.afterUrl)
  )
  const [selectedAngleMap, setSelectedAngleMap] = useState<Record<string, number>>({})
  const [deletePopoverPairId, setDeletePopoverPairId] = useState<string | null>(null)
  const [deletingPairId, setDeletingPairId] = useState<string | null>(null)

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

  // ── Mode 1: Multi-Angle Handlers ─────────────────────────────────────────────

  const handleSelectMultiFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const remainingSlots = UI_MAX_MULTI_ANGLE_IMAGES - multiAngleFiles.length
    if (remainingSlots <= 0) {
      setGenerationError(`You can upload up to ${UI_MAX_MULTI_ANGLE_IMAGES} angles for this space.`)
      event.target.value = ""
      return
    }

    const filesToAdd = files.slice(0, remainingSlots)
    const newItems: MultiAngleFileItem[] = filesToAdd.map((file) => ({
      id: makePairId(),
      file,
      preview: URL.createObjectURL(file),
    }))

    setMultiAngleFiles((prev) => [...prev, ...newItems])
    setGenerationError(null)
    event.target.value = ""
  }

  const handleRemoveMultiFile = (id: string) => {
    setMultiAngleFiles((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      if (heroAngleIndex >= filtered.length) {
        setHeroAngleIndex(Math.max(0, filtered.length - 1))
      }
      return filtered
    })
  }

  const handleGenerateMultiAngle = async () => {
    if (!jobId) {
      setGenerationError("Save the quote first to generate and store before/after images.")
      return
    }
    if (multiAngleFiles.length < UI_MIN_MULTI_ANGLE_IMAGES) {
      setGenerationError(`Upload at least ${UI_MIN_MULTI_ANGLE_IMAGES} angles of the space to generate.`)
      return
    }
    if (!multiAngleDescription.trim()) {
      setGenerationError("Add the finished look description before generating.")
      return
    }
    if (selectedUsableLineItems.length === 0) {
      setGenerationError("Select at least one scope item to include.")
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    let messageIndex = 0
    const messageTimer = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessageIndex(messageIndex)
    }, 3500)

    try {
      const result = await api.generateAfterImagesBatch(jobId, {
        beforeImages: multiAngleFiles.map((m) => m.file),
        mode: "multi_angle",
        heroIndex: heroAngleIndex,
        afterImageDescription: multiAngleDescription.trim(),
        includeProjectContext,
        lineItems: selectedUsableLineItems.map((item) => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
        })),
      })

      const item = result.items[0]
      if (item && item.success) {
        const heroFile = multiAngleFiles[heroAngleIndex]
        const allAngles =
          item.before_image_urls && item.before_image_urls.length > 0
            ? item.before_image_urls
            : multiAngleFiles.map((m) => m.preview)

        const newPair: BeforeAfterImagePair = {
          id: makePairId(),
          beforePreview: item.before_image_url || heroFile.preview,
          beforeFileName: item.before_file_name || heroFile.file.name,
          beforeAngles: allAngles,
          afterUrl: item.after_image_url || null,
          afterFileName: item.after_file_name || null,
          status: "success",
          description: multiAngleDescription.trim(),
          error: null,
        }
        setLatestMultiAngleResult(newPair)
        setIsMultiAngleSaved(false)
        setPreviewAngleIndex(0)
      } else {
        throw new Error(item?.error || "Multi-angle render failed.")
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Multi-angle render failed.")
    } finally {
      window.clearInterval(messageTimer)
      setLoadingMessageIndex(0)
      setIsGenerating(false)
    }
  }

  const handleSaveMultiAngleToQuote = async () => {
    if (!latestMultiAngleResult || !latestMultiAngleResult.afterUrl || !latestMultiAngleResult.beforePreview) return
    setIsSavingMultiAngle(true)
    try {
      if (jobId) {
        await api.saveBeforeAfter(jobId, {
          itemIndex: 1,
          beforeImageUrl: latestMultiAngleResult.beforePreview,
          afterImageUrl: latestMultiAngleResult.afterUrl,
          beforeImageUrls: latestMultiAngleResult.beforeAngles || [latestMultiAngleResult.beforePreview],
          description: multiAngleDescription,
        })
      }
      const pairToSave: BeforeAfterImagePair = {
        ...latestMultiAngleResult,
        status: "saved",
      }
      const alreadySaved = completedPairs.some((p) => p.id === pairToSave.id)
      const nextPairs = alreadySaved
        ? completedPairs.map((p) => (p.id === pairToSave.id ? pairToSave : p))
        : [pairToSave, ...completedPairs]
      onImagePairsChange(nextPairs)
      setIsMultiAngleSaved(true)
      onSavedChange?.()
      toast({
        title: "Saved to Quote",
        description: "Your Before & After master visualization has been saved to the quote.",
      })
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err?.message || "Failed to save visualization to quote.",
        variant: "destructive",
      })
    } finally {
      setIsSavingMultiAngle(false)
    }
  }

  // ── Mode 2: Individual Photo Handlers ─────────────────────────────────────────

  const handleAddSlot = () => {
    if (individualSlots.length >= UI_MAX_INDIVIDUAL_IMAGES) {
      setGenerationError(`You can have up to ${UI_MAX_INDIVIDUAL_IMAGES} individual photo slots.`)
      return
    }
    const newSlot: IndividualSlot = {
      id: makePairId(),
      beforePreview: "",
      beforeFile: null,
      beforeFileName: null,
      afterUrl: null,
      afterFileName: null,
      status: "pending",
      description: "",
      error: null,
      isSavedToQuote: false,
    }
    setIndividualSlots((prev) => [...prev, newSlot])
  }

  const handleSelectSingleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeSlotId) return

    setIndividualSlots((prev) =>
      prev.map((s) =>
        s.id === activeSlotId
          ? {
              ...s,
              beforePreview: URL.createObjectURL(file),
              beforeFile: file,
              beforeFileName: file.name,
              afterUrl: null,
              status: "pending",
              error: null,
              isSavedToQuote: false,
            }
          : s
      )
    )
    event.target.value = ""
    setActiveSlotId(null)
  }

  const handleUpdateSlotDescription = (id: string, text: string) => {
    setIndividualSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, description: text } : s))
    )
  }

  const handleGenerateSingleSlot = async (slot: IndividualSlot, index: number) => {
    if (!jobId) {
      setGenerationError("Save the quote first to generate and store before/after images.")
      return
    }
    if (!slot.beforeFile && !slot.beforePreview) {
      setGenerationError("Upload a before photo for this slot first.")
      return
    }
    if (!slot.description.trim()) {
      setGenerationError(`Add the finished look description for Photo #${index + 1}.`)
      return
    }

    setGeneratingSlotId(slot.id)
    setGenerationError(null)

    setIndividualSlots((prev) =>
      prev.map((s) =>
        s.id === slot.id ? { ...s, status: "generating", error: null } : s
      )
    )

    let messageIndex = 0
    const messageTimer = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessageIndex(messageIndex)
    }, 3500)

    try {
      const file = slot.beforeFile
      if (!file) {
        throw new Error("Please re-select the before photo to generate.")
      }

      const result = await api.generateAfterImagesBatch(jobId, {
        beforeImages: [file],
        mode: "single_item",
        itemIndex: index + 1,
        afterImageDescription: slot.description.trim(),
        includeProjectContext,
        lineItems: selectedUsableLineItems.map((item) => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
        })),
      })

      const item = result.items[0]
      if (item && item.success) {
        setIndividualSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? {
                  ...s,
                  beforePreview: item.before_image_url || s.beforePreview,
                  beforeFile: null,
                  beforeFileName: item.before_file_name || s.beforeFileName,
                  afterUrl: item.after_image_url || null,
                  afterFileName: item.after_file_name || null,
                  status: "success",
                  error: null,
                  isSavedToQuote: false,
                }
              : s
          )
        )
      } else {
        throw new Error(item?.error || "Generation failed for this photo.")
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Generation failed."
      setIndividualSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, status: "failed", error: msg } : s
        )
      )
      setGenerationError(msg)
    } finally {
      window.clearInterval(messageTimer)
      setLoadingMessageIndex(0)
      setGeneratingSlotId(null)
    }
  }

  const handleSaveSlotToQuote = async (slotId: string) => {
    const slotIndex = individualSlots.findIndex((s) => s.id === slotId)
    const slot = slotIndex >= 0 ? individualSlots[slotIndex] : null
    if (!slot || !slot.afterUrl || !slot.beforePreview) return

    setSavingSlotId(slotId)
    try {
      if (jobId) {
        await api.saveBeforeAfter(jobId, {
          itemIndex: slotIndex + 1,
          beforeImageUrl: slot.beforePreview,
          afterImageUrl: slot.afterUrl,
          description: slot.description,
        })
      }

      const pairToSave: BeforeAfterImagePair = {
        id: slot.id,
        beforePreview: slot.beforePreview,
        beforeFile: null,
        beforeFileName: slot.beforeFileName,
        afterUrl: slot.afterUrl,
        afterFileName: slot.afterFileName,
        status: "saved",
        description: slot.description,
        error: null,
      }

      const alreadySaved = completedPairs.some((p) => p.id === pairToSave.id)
      const nextPairs = alreadySaved
        ? completedPairs.map((p) => (p.id === pairToSave.id ? pairToSave : p))
        : [...completedPairs, pairToSave]
      onImagePairsChange(nextPairs)

      setIndividualSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, isSavedToQuote: true, status: "saved" } : s))
      )
      onSavedChange?.()
      toast({
        title: "Saved to Quote",
        description: `Photo #${slotIndex + 1} visualization saved to the quote.`,
      })
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err?.message || "Failed to save visualization to quote.",
        variant: "destructive",
      })
    } finally {
      setSavingSlotId(null)
    }
  }

  const handleRemoveSlot = (slotId: string) => {
    if (individualSlots.length <= 1) {
      setIndividualSlots([
        {
          id: makePairId(),
          beforePreview: "",
          beforeFile: null,
          beforeFileName: null,
          afterUrl: null,
          afterFileName: null,
          status: "pending",
          description: "",
          error: null,
          isSavedToQuote: false,
        },
      ])
    } else {
      setIndividualSlots((prev) => prev.filter((s) => s.id !== slotId))
    }
    onImagePairsChange(completedPairs.filter((p) => p.id !== slotId))
  }

  const handleDownload = (pair: { afterUrl?: string | null; afterFileName?: string | null }, index: number = 0) => {
    if (!pair.afterUrl) return
    const anchor = document.createElement("a")
    anchor.href = pair.afterUrl
    anchor.download = pair.afterFileName || `ai-after-render-${index + 1}.png`
    anchor.click()
  }

  const extractIndexFromPair = (pair: BeforeAfterImagePair, fallbackIndex: number): number => {
    if (pair.afterFileName) {
      const match = pair.afterFileName.match(/ai-after-render(?:-(\d+))?/i)
      if (match && match[1]) return parseInt(match[1], 10)
    }
    if (pair.beforeFileName) {
      const match =
        pair.beforeFileName.match(/^before-photo(?:-(\d+))?/i) ||
        pair.beforeFileName.match(/^before-(\d+)/i)
      if (match && match[1]) return parseInt(match[1], 10)
    }
    const idMatch = pair.id.match(/(\d+)/)
    if (idMatch && idMatch[1]) return parseInt(idMatch[1], 10)
    return fallbackIndex
  }

  const handleDeleteSavedPair = async (pair: BeforeAfterImagePair, index: number) => {
    setDeletingPairId(pair.id)
    try {
      const itemIndex = extractIndexFromPair(pair, index)
      if (jobId) {
        await api.deleteBeforeAfter(jobId, itemIndex)
      }

      onImagePairsChange(completedPairs.filter((p) => p.id !== pair.id))

      if (latestMultiAngleResult?.id === pair.id) {
        setIsMultiAngleSaved(false)
        setLatestMultiAngleResult(null)
      }

      setIndividualSlots((prev) =>
        prev.map((s) => (s.id === pair.id ? { ...s, isSavedToQuote: false, afterUrl: null, status: "pending" } : s))
      )

      toast({
        title: "Visualization deleted",
        description: "The before & after images were removed from this quote.",
      })

      onSavedChange?.()
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message || "Failed to remove visualization from quote.",
        variant: "destructive",
      })
    } finally {
      setDeletingPairId(null)
      setDeletePopoverPairId(null)
    }
  }

  const handleRemovePair = (pairId: string) => {
    onImagePairsChange(completedPairs.filter((pair) => pair.id !== pairId))
    if (latestMultiAngleResult?.id === pairId) {
      setIsMultiAngleSaved(false)
    }
    setIndividualSlots((prev) =>
      prev.map((s) => (s.id === pairId ? { ...s, isSavedToQuote: false } : s))
    )
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

      <div className="space-y-3">
        {/* No jobId warning */}
        {!jobId && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Save the quote first to generate and store before/after images.
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200/80 bg-zinc-100/70 p-1">
          <button
            type="button"
            onClick={() => setMode("individual")}
            className={cn(
              "flex flex-col items-start rounded-lg px-3 py-2 text-left transition",
              mode === "individual"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            <div className="flex items-center gap-1.5 text-[12px] font-semibold">
              <Camera className="h-3.5 w-3.5 text-emerald-600" />
              <span>Individual area photos</span>
            </div>
            <span className="mt-0.5 text-[10px] text-zinc-400">
              1 photo → 1 after render (up to 3 total)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("multi_angle")}
            className={cn(
              "flex flex-col items-start rounded-lg px-3 py-2 text-left transition",
              mode === "multi_angle"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            <div className="flex items-center gap-1.5 text-[12px] font-semibold">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>Multiple angles of the same space</span>
            </div>
            <span className="mt-0.5 text-[10px] text-zinc-400">
              2–4 angles consolidated into 1 master render
            </span>
          </button>
        </div>

        {/* Shared Scope & Project Context Bar */}
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Scope:</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 max-w-full rounded-full px-3 text-[12px]"
                    disabled={usableLineItems.length === 0}
                  >
                    <span className="mr-1">Quote Items</span>
                    {usableLineItems.length > 0 && (
                      <span className="text-[11px] text-zinc-400">
                        ({selectedUsableLineItems.length}/{usableLineItems.length})
                      </span>
                    )}
                    <ChevronDown className="ml-1.5 h-3 w-3 shrink-0 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0 text-[11px] font-medium text-zinc-500">
                      Quote items to include in AI build plan
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
                          <div className="truncate text-[12.5px] font-medium text-zinc-900">{label}</div>
                          {detail ? (
                            <div className="mt-0.5 line-clamp-2 text-[10.5px] text-zinc-400">{detail}</div>
                          ) : null}
                        </div>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Project context</span>
              <Switch
                checked={includeProjectContext}
                onCheckedChange={setIncludeProjectContext}
                aria-label="Include project context"
                className="scale-90"
              />
            </div>
          </div>
        </div>

        {/* ── MODE 1: MULTIPLE ANGLES INTO 1 MASTER VIEW ── */}
        {mode === "multi_angle" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                    Angle Photos ({multiAngleFiles.length}/{UI_MAX_MULTI_ANGLE_IMAGES})
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Upload 2 to 4 angles of the space. AI analyzes all angles for 3D context and renders on the Hero angle.
                  </p>
                </div>
                {multiAngleFiles.length < UI_MAX_MULTI_ANGLE_IMAGES && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => multiInputRef.current?.click()}
                    className="h-7 rounded-full px-3 text-[11.5px]"
                  >
                    <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    Add Angles
                  </Button>
                )}
                <input
                  ref={multiInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelectMultiFiles}
                />
              </div>

              {/* Angles Gallery */}
              {multiAngleFiles.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {multiAngleFiles.map((item, index) => {
                    const isHero = index === heroAngleIndex
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative overflow-hidden rounded-xl border bg-zinc-50 transition",
                          isHero
                            ? "border-blue-600 ring-2 ring-blue-500/20 shadow-sm"
                            : "border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          <img src={item.preview} alt={`Angle ${index + 1}`} className="h-full w-full object-cover" />
                        </div>

                        {/* Badges and actions */}
                        <div className="p-1.5">
                          {isHero ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                              <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                              Hero Angle
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setHeroAngleIndex(index)}
                              className="text-[10px] font-medium text-zinc-500 hover:text-blue-600"
                            >
                              Set as Hero
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMultiFile(item.id)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/90 backdrop-blur-sm transition hover:bg-black/80"
                          title="Remove angle"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  onClick={() => multiInputRef.current?.click()}
                  className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 py-7 text-center transition hover:bg-zinc-50"
                >
                  <ImagePlus className="mb-1.5 h-6 w-6 text-zinc-400" />
                  <p className="text-[12.5px] font-medium text-zinc-700">Upload 2 to 4 photos of the same space</p>
                  <p className="text-[11px] text-zinc-400">e.g. Center view, Left angle, Right boundary</p>
                </div>
              )}
            </div>

            {/* Finished Look Description */}
            <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                Finished Look Description <span className="text-rose-400">*</span>
              </label>
              <Textarea
                value={multiAngleDescription}
                onChange={(e) => setMultiAngleDescription(e.target.value)}
                rows={2}
                className="min-h-[70px] resize-none rounded-lg border-zinc-200 text-[12.5px] placeholder:text-zinc-400 focus:border-zinc-400"
                placeholder="Describe what the finished renovation will look like across the entire space (materials, styles, layout)..."
              />
            </div>

            {/* Generate Action Bar */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3">
              <p className="text-[12px] text-zinc-500">
                {isGenerating
                  ? loadingMessages[loadingMessageIndex]
                  : multiAngleFiles.length < UI_MIN_MULTI_ANGLE_IMAGES
                    ? `Add at least ${UI_MIN_MULTI_ANGLE_IMAGES} angles`
                    : `${multiAngleFiles.length} angles ready · Hero selected`}
              </p>
              <Button
                type="button"
                onClick={handleGenerateMultiAngle}
                disabled={
                  !jobId ||
                  multiAngleFiles.length < UI_MIN_MULTI_ANGLE_IMAGES ||
                  !multiAngleDescription.trim() ||
                  isGenerating
                }
                className="h-8 rounded-full px-4 text-[12.5px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Generate Master Render
                  </>
                )}
              </Button>
            </div>

            {/* Active Silk Loading Card for Multi-Angle */}
            {isGenerating && multiAngleFiles[heroAngleIndex] && (
              <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-blue-50/40 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-[12px] font-semibold text-zinc-800">
                      Analyzing {multiAngleFiles.length} angles & rendering master after view...
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{loadingMessages[loadingMessageIndex]}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="relative border-r border-zinc-100">
                    <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                      <img
                        src={multiAngleFiles[heroAngleIndex]?.preview}
                        alt="Hero Angle"
                        className="h-full w-full object-cover"
                      />
                      <SilkGenerationLoader src={multiAngleFiles[heroAngleIndex]?.preview} />
                    </div>
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                      Hero Angle · Analyzing
                    </span>
                  </div>
                  <div className="flex aspect-[16/10] flex-col items-center justify-center bg-zinc-50/50 p-6 text-center">
                    <Sparkles className="mb-2 h-6 w-6 text-blue-500 animate-pulse" />
                    <p className="text-[12.5px] font-semibold text-zinc-800">Ops Image Gen</p>
                    <p className="mt-1 text-[11px] text-zinc-400 max-w-[240px]">
                      Combining site geometry from all {multiAngleFiles.length} photos into one seamless photorealistic finish.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 1 Generated Result Card with Prominent Save to Quote Option */}
            {latestMultiAngleResult && !isGenerating && (
              <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-[0_2px_12px_rgb(37_99_235/0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-blue-50/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[12.5px] font-semibold text-zinc-900">
                      Generated Master Render
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({latestMultiAngleResult.beforeAngles?.length || multiAngleFiles.length} angles synthesized)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMultiAngleSaved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11.5px] font-semibold text-emerald-700 border border-emerald-200">
                        <Check className="h-3.5 w-3.5" />
                        Saved in Quote
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveMultiAngleToQuote}
                        disabled={isSavingMultiAngle}
                        className="h-7.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3.5 text-[12px] font-medium text-white shadow-sm transition active:scale-95"
                      >
                        {isSavingMultiAngle ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Save to Quote
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(latestMultiAngleResult, 0)}
                      className="h-7.5 rounded-full px-3 text-[11.5px]"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Before Side */}
                  <div className="relative border-r border-zinc-100">
                    <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                      <img
                        src={
                          latestMultiAngleResult.beforeAngles?.[previewAngleIndex] ||
                          latestMultiAngleResult.beforePreview
                        }
                        alt="Before view"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Angle switcher pills */}
                    {latestMultiAngleResult.beforeAngles && latestMultiAngleResult.beforeAngles.length > 1 && (
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
                        {latestMultiAngleResult.beforeAngles.map((_, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setPreviewAngleIndex(aIdx)}
                            className={cn(
                              "rounded px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider backdrop-blur-md transition",
                              previewAngleIndex === aIdx
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-black/60 text-white/80 hover:bg-black/80"
                            )}
                          >
                            {aIdx === 0 ? "Hero Angle" : `Angle ${aIdx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                      Before Photo
                    </span>
                  </div>

                  {/* After Side */}
                  <div className="relative">
                    <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                      <img
                        src={latestMultiAngleResult.afterUrl!}
                        alt="After render"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      After · Master Render
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: INDIVIDUAL AREA PHOTOS (UP TO 3) ── */}
        {mode === "individual" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-medium text-zinc-500">
                Individual Photos ({individualSlots.length}/{UI_MAX_INDIVIDUAL_IMAGES}) · Generate one by one
              </p>
              {individualSlots.length < UI_MAX_INDIVIDUAL_IMAGES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSlot}
                  className="h-7 rounded-full px-3 text-[11.5px]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Photo Slot
                </Button>
              )}
            </div>

            <input
              ref={singleInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSelectSingleFile}
            />

            {individualSlots.map((slot, index) => {
              const isCardGenerating = generatingSlotId === slot.id || slot.status === "generating"
              const canCardGenerate =
                Boolean(jobId) &&
                Boolean(slot.beforeFile || slot.beforePreview) &&
                Boolean(slot.description?.trim()) &&
                !isGenerating &&
                !isCardGenerating

              return (
                <div
                  key={slot.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgb(15_17_21/0.04)]"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-zinc-700">Photo #{index + 1}</span>
                      {slot.isSavedToQuote ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-100">
                          <Check className="h-2.5 w-2.5" /> Saved in Quote
                        </span>
                      ) : slot.afterUrl ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100">
                          Ready to save
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {slot.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                          <AlertCircle className="h-3 w-3" />Failed
                        </span>
                      ) : isCardGenerating ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                          <Loader2 className="h-3 w-3 animate-spin" />Rendering...
                        </span>
                      ) : null}

                      {slot.isSavedToQuote ? (
                        <Popover
                          open={deletePopoverPairId === slot.id}
                          onOpenChange={(open) => setDeletePopoverPairId(open ? slot.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition"
                              title="Delete from quote"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            side="bottom"
                            sideOffset={6}
                            className="w-64 p-3 shadow-lg border border-zinc-200 bg-white rounded-xl z-50"
                          >
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-zinc-900">Delete visualization?</p>
                                <p className="text-[11px] text-zinc-500 leading-snug">
                                  This will remove photo #{index + 1} from quote #{jobId}.
                                </p>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-100">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs text-zinc-600"
                                  onClick={() => setDeletePopoverPairId(null)}
                                  disabled={deletingPairId === slot.id}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                                  disabled={deletingPairId === slot.id}
                                  onClick={() => {
                                    const pair = completedPairs.find((p) => p.id === slot.id) || {
                                      id: slot.id,
                                      beforePreview: slot.beforePreview,
                                      afterUrl: slot.afterUrl,
                                      afterFileName: slot.afterFileName,
                                      beforeFileName: slot.beforeFileName,
                                      status: "saved" as const,
                                    }
                                    handleDeleteSavedPair(pair, index + 1)
                                  }}
                                >
                                  {deletingPairId === slot.id ? (
                                    <>
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Confirm"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-300 hover:text-zinc-600"
                          onClick={() => handleRemoveSlot(slot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Photo Display / Upload */}
                  <div className="grid grid-cols-1 border-b border-zinc-100 sm:grid-cols-2">
                    {/* Before Photo */}
                    <div className="relative border-r border-zinc-100">
                      {slot.beforePreview ? (
                        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                          <img src={slot.beforePreview} alt={`Before ${index + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotId(slot.id)
                              singleInputRef.current?.click()
                            }}
                            className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm hover:bg-black/80"
                          >
                            Replace Before
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setActiveSlotId(slot.id)
                            singleInputRef.current?.click()
                          }}
                          className="flex aspect-[16/10] cursor-pointer flex-col items-center justify-center bg-zinc-50/70 p-4 text-center transition hover:bg-zinc-100/70"
                        >
                          <ImagePlus className="mb-1 h-5 w-5 text-zinc-400" />
                          <span className="text-[11.5px] font-medium text-zinc-600">Upload Before Photo</span>
                        </div>
                      )}
                    </div>

                    {/* After Render */}
                    <div className="relative">
                      {slot.afterUrl ? (
                        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                          <img src={slot.afterUrl} alt={`After ${index + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                              After · AI
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownload(slot, index)}
                              className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm hover:bg-black/80"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      ) : isCardGenerating ? (
                        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                          <img src={slot.beforePreview} alt="" className="h-full w-full object-cover" />
                          <SilkGenerationLoader src={slot.beforePreview} />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-zinc-50/40 p-4 text-center text-[11px] text-zinc-400">
                          Generated after view will appear here
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dedicated Description for this Photo */}
                  <div className="p-3.5">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Finished Look for Photo #{index + 1} <span className="text-rose-400">*</span>
                    </label>
                    <Textarea
                      value={slot.description}
                      onChange={(e) => handleUpdateSlotDescription(slot.id, e.target.value)}
                      rows={2}
                      className="min-h-[56px] resize-none rounded-lg border-zinc-200 text-[12px] placeholder:text-zinc-400 focus:border-zinc-400"
                      placeholder={`e.g. Modern travertine paver patio with built-in bench seating for Photo #${index + 1}...`}
                    />

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        {isCardGenerating
                          ? loadingMessages[loadingMessageIndex]
                          : slot.isSavedToQuote
                            ? "Saved in quote"
                            : slot.afterUrl
                              ? "Ready to save"
                              : "Ready"}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Save to Quote Button for Individual Photo */}
                        {slot.afterUrl && !slot.isSavedToQuote && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveSlotToQuote(slot.id)}
                            disabled={savingSlotId === slot.id}
                            className="h-7.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3 text-[12px] text-white shadow-sm"
                          >
                            {savingSlotId === slot.id ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Save to Quote
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleGenerateSingleSlot(slot, index)}
                          disabled={!canCardGenerate}
                          className="h-7.5 rounded-full px-3.5 text-[12px]"
                        >
                          {isCardGenerating ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Rendering...
                            </>
                          ) : slot.afterUrl ? (
                            <>
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                              Regenerate
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                              Generate Render #{index + 1}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {slot.error && (
                      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-600">
                        {slot.error}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Global Error Notice */}
        {generationError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200/60 bg-rose-50 px-3.5 py-2.5 text-[12px] text-rose-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>{generationError}</div>
          </div>
        )}

        {/* Saved Visualizations Gallery (ONLY shows when there are actually saved pairs with both before & after) */}
        {completedPairs.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-zinc-200/80">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Saved in Quote ({completedPairs.length})
              </p>
              <span className="text-[10.5px] text-zinc-400">
                Attached to quote #{jobId}
              </span>
            </div>

            {completedPairs.map((pair, index) => {
              const hasAngles = pair.beforeAngles && pair.beforeAngles.length > 1
              const currentAngleIdx = selectedAngleMap[pair.id] ?? 0
              const currentBefore =
                hasAngles && pair.beforeAngles![currentAngleIdx]
                  ? pair.beforeAngles![currentAngleIdx]
                  : pair.beforePreview

              return (
                <div
                  key={pair.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgb(15_17_21/0.04)]"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-zinc-700">
                        Render #{index + 1}
                      </span>
                      {hasAngles && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100">
                          {pair.beforeAngles!.length} angles
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-100">
                        <Check className="h-2.5 w-2.5" /> Saved
                      </span>
                    </div>

                    <Popover
                      open={deletePopoverPairId === pair.id}
                      onOpenChange={(open) => setDeletePopoverPairId(open ? pair.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition"
                          title="Remove from quote"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        side="bottom"
                        sideOffset={6}
                        className="w-64 p-3 shadow-lg border border-zinc-200 bg-white rounded-xl z-50"
                      >
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-zinc-900">Delete visualization?</p>
                            <p className="text-[11px] text-zinc-500 leading-snug">
                              This will remove the before &amp; after images from quote #{jobId}.
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-100">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-zinc-600"
                              onClick={() => setDeletePopoverPairId(null)}
                              disabled={deletingPairId === pair.id}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                              disabled={deletingPairId === pair.id}
                              onClick={() => handleDeleteSavedPair(pair, index + 1)}
                            >
                              {deletingPairId === pair.id ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Confirm"
                              )}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {/* Before Side */}
                    <div className="relative border-r border-zinc-100">
                      <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                        <img src={currentBefore} alt="" className="h-full w-full object-cover" />
                      </div>

                      {hasAngles && (
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                          {pair.beforeAngles!.map((_, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() =>
                                setSelectedAngleMap((prev) => ({ ...prev, [pair.id]: aIdx }))
                              }
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md transition",
                                currentAngleIdx === aIdx
                                  ? "bg-blue-600 text-white"
                                  : "bg-black/60 text-white/80 hover:bg-black/80"
                              )}
                            >
                              {aIdx === 0 ? "Hero" : `Angle ${aIdx + 1}`}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                        Before Photo
                      </span>
                    </div>

                    {/* After Side */}
                    <div className="relative">
                      <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                        <img src={pair.afterUrl!} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                          After · AI Render
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownload(pair, index)}
                          className="flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm hover:bg-black/80 transition"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
