"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Copy, Eye, ExternalLink, FileImage, GripVertical, ImagePlus, Italic, List, Loader2, MoveDown, MoveUp, Paintbrush, PencilLine, Plus, Printer, Save, Sparkles, Trash2, Type, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BeforeAfterPanel, type BeforeAfterImagePair } from "@/components/before-after-panel"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type {
  Job,
  JobItem,
  ProjectMedia,
  ProposalAnnotationPoint,
  ProposalBeforeAfterBlock,
  ProposalDocument,
  ProposalImageAnnotationStroke,
  ProposalImageBlock,
  ProposalImageTextOverlay,
  ProposalOverviewResponse,
  ProposalPage,
  ProposalPageBlock,
  ProposalTextBlock,
} from "@/lib/types"

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function formatProposalDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date()
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase()
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function createTextBlock(html = ""): ProposalTextBlock {
  return {
    id: createId("text"),
    type: "text",
    html,
  }
}

const DEFAULT_SCOPE_SUMMARY_HTML = "<p>Describe the overall scope, intent, and project goals for this proposal.</p>"
const DEFAULT_PROJECT_OVERVIEW_DESCRIPTION_HTML = "<p>Summarize the project approach, priorities, and expected outcomes.</p>"
const PAGE_TEXT_PLACEHOLDER = "Add page notes, photos, and markups here."

async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  if (typeof window === "undefined") {
    return { width: 720, height: 420 }
  }

  return new Promise((resolve) => {
    const image = new window.Image()
    image.onload = () => {
      const naturalWidth = image.naturalWidth || 720
      const naturalHeight = image.naturalHeight || 420
      const maxWidth = 760
      const scaledWidth = Math.min(maxWidth, naturalWidth)
      const scaledHeight = Math.max(220, Math.round((naturalHeight / naturalWidth) * scaledWidth))
      resolve({
        width: Math.max(320, scaledWidth),
        height: scaledHeight,
      })
    }
    image.onerror = () => resolve({ width: 720, height: 420 })
    image.src = url
  })
}

async function createImageBlock(media: ProjectMedia): Promise<ProposalImageBlock> {
  const dimensions = await getImageDimensions(media.file_url)
  return {
    id: createId("image"),
    type: "image",
    media_id: media.id,
    url: media.file_url,
    file_name: media.file_name,
    width: dimensions.width,
    height: dimensions.height,
    annotations: [],
    textOverlays: [],
  }
}

async function createImageBlockFromUrl(url: string, fileName?: string | null): Promise<ProposalImageBlock> {
  const dimensions = await getImageDimensions(url)
  return {
    id: createId("image"),
    type: "image",
    url,
    file_name: fileName ?? undefined,
    width: dimensions.width,
    height: dimensions.height,
    annotations: [],
    textOverlays: [],
  }
}

function buildInitialProposalDocument(job: Job, contractorName: string): ProposalDocument {
  const today = new Date().toISOString().slice(0, 10)

  if (job.proposal_document) {
    return {
      ...job.proposal_document,
      quoteId: job.proposal_document.quoteId ?? job.id,
      contractorName: job.proposal_document.contractorName || contractorName,
      date: job.proposal_document.date || today,
      pages: Array.isArray(job.proposal_document.pages) ? job.proposal_document.pages : [],
    }
  }

  return {
    title: job.title || `Proposal for ${job.client?.name || "Project"}`,
    companyName: job.client?.name || "Client / Property",
    companyAddress: job.client?.address || job.address || "",
    quoteId: job.id,
    date: today,
    contractorName,
    scopeSummary: job.job_description
      ? `<p>${escapeHtml(job.job_description)}</p>`
      : DEFAULT_SCOPE_SUMMARY_HTML,
    projectOverview: {
      title: job.title || "Project Overview",
      description: DEFAULT_PROJECT_OVERVIEW_DESCRIPTION_HTML,
    },
    pages: [
      {
        id: createId("page"),
        title: "Page 1",
        description: [createTextBlock("")],
      },
    ],
  }
}

function updatePage(
  document: ProposalDocument,
  pageId: string,
  updater: (page: ProposalPage) => ProposalPage,
): ProposalDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  }
}

function updateBlock(
  document: ProposalDocument,
  pageId: string,
  blockId: string,
  updater: (block: ProposalPageBlock) => ProposalPageBlock,
): ProposalDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    description: page.description.map((block) => (block.id === blockId ? updater(block) : block)),
  }))
}

function moveBlockWithinPage(page: ProposalPage, blockId: string, direction: -1 | 1): ProposalPage {
  const index = page.description.findIndex((block) => block.id === blockId)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= page.description.length) {
    return page
  }

  const nextBlocks = [...page.description]
  const [block] = nextBlocks.splice(index, 1)
  nextBlocks.splice(targetIndex, 0, block)

  return {
    ...page,
    description: nextBlocks,
  }
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  readOnly?: boolean
  className?: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editorRef.current || readOnly) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [readOnly, value])

  const applyCommand = (command: string) => {
    const doc = document as Document & { execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean }
    editorRef.current?.focus()
    doc.execCommand?.(command, false)
    onChange(editorRef.current?.innerHTML || "")
  }

  if (readOnly) {
    if (!value?.trim()) {
      return null
    }

    return (
      <div
        className={cn("prose prose-slate max-w-none text-[15px] leading-7", className)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
        <Button type="button" variant="outline" size="sm" onClick={() => applyCommand("bold")}>
          <Bold className="mr-1 h-4 w-4" />
          Bold
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyCommand("italic")}>
          <Italic className="mr-1 h-4 w-4" />
          Italic
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyCommand("insertUnorderedList")}>
          <List className="mr-1 h-4 w-4" />
          Bullets
        </Button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[140px] px-4 py-3 text-[15px] leading-7 text-slate-700 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}

function StrokePath({
  stroke,
  width,
  height,
}: {
  stroke: ProposalImageAnnotationStroke
  width: number
  height: number
}) {
  const d = stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * width} ${point.y * height}`)
    .join(" ")

  return <path d={d} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
}

function ImageBlockEditor({
  block,
  readOnly,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: ProposalImageBlock
  readOnly: boolean
  onChange: (block: ProposalImageBlock) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const drawStateRef = useRef<{ pointerId: number; points: ProposalAnnotationPoint[] } | null>(null)
  const resizeStateRef = useRef<{ pointerId: number; startX: number; startY: number; width: number; height: number } | null>(null)
  const dragStateRef = useRef<{ pointerId: number; overlayId: string } | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [strokeColor, setStrokeColor] = useState("#dc2626")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [draftPoints, setDraftPoints] = useState<ProposalAnnotationPoint[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)

  useEffect(() => {
    if (readOnly) setDrawMode(false)
  }, [readOnly])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return

      if (resizeStateRef.current && resizeStateRef.current.pointerId === event.pointerId) {
        const deltaX = event.clientX - resizeStateRef.current.startX
        const deltaY = event.clientY - resizeStateRef.current.startY
        onChange({
          ...block,
          width: Math.max(240, Math.round(resizeStateRef.current.width + deltaX)),
          height: Math.max(180, Math.round(resizeStateRef.current.height + deltaY)),
        })
      }

      if (dragStateRef.current && dragStateRef.current.pointerId === event.pointerId) {
        const x = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width))
        const y = Math.min(0.95, Math.max(0.05, (event.clientY - rect.top) / rect.height))
        onChange({
          ...block,
          textOverlays: block.textOverlays.map((overlay) =>
            overlay.id === dragStateRef.current?.overlayId ? { ...overlay, x, y } : overlay,
          ),
        })
      }

      if (drawStateRef.current && drawStateRef.current.pointerId === event.pointerId) {
        const point = {
          x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
          y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        }
        drawStateRef.current = {
          ...drawStateRef.current,
          points: [...drawStateRef.current.points, point],
        }
        setDraftPoints(drawStateRef.current.points)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (resizeStateRef.current?.pointerId === event.pointerId) {
        resizeStateRef.current = null
      }

      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null
      }

      if (drawStateRef.current?.pointerId === event.pointerId) {
        const finishedPoints = drawStateRef.current.points
        drawStateRef.current = null
        setDraftPoints([])

        if (finishedPoints.length >= 2) {
          onChange({
            ...block,
            annotations: [
              ...block.annotations,
              {
                id: createId("stroke"),
                color: strokeColor,
                width: strokeWidth,
                points: finishedPoints,
              },
            ],
          })
        }
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [block, onChange, strokeColor, strokeWidth])

  const selectedOverlay = block.textOverlays.find((overlay) => overlay.id === selectedOverlayId) || null

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onMoveUp} disabled={!canMoveUp}>
            <MoveUp className="mr-1 h-4 w-4" />
            Up
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onMoveDown} disabled={!canMoveDown}>
            <MoveDown className="mr-1 h-4 w-4" />
            Down
          </Button>
          <div className="flex items-center rounded-md border border-slate-200 bg-white">
            {([{ label: "S", width: 320 }, { label: "M", width: 520 }, { label: "L", width: 720 }] as const).map(({ label, width }, i) => {
              const isActive = block.width >= width - 100 && block.width < width + 100
              return (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium transition",
                    i > 0 && "border-l border-slate-200",
                    isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                  onClick={() => {
                    const ratio = block.height / block.width
                    onChange({ ...block, width, height: Math.max(180, Math.round(width * ratio)) })
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center rounded-md border border-slate-200 bg-white">
            {([
              { icon: AlignLeft,   value: "left"   },
              { icon: AlignCenter, value: "center" },
              { icon: AlignRight,  value: "right"  },
            ] as const).map(({ icon: Icon, value }, i) => {
              const isActive = (block.alignment ?? "left") === value
              return (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "p-1.5 transition",
                    i > 0 && "border-l border-slate-200",
                    isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                  onClick={() => onChange({ ...block, alignment: value })}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>
          <Button type="button" variant={drawMode ? "default" : "outline"} size="sm" onClick={() => setDrawMode((value) => !value)}>
            <PencilLine className="mr-1 h-4 w-4" />
            {drawMode ? "Drawing" : "Draw"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const overlay = {
                id: createId("label"),
                text: "Text overlay",
                x: 0.5,
                y: 0.88,
                fontSize: 18,
                color: "#ffffff",
                bold: true,
              }
              onChange({ ...block, textOverlays: [...block.textOverlays, overlay] })
              setSelectedOverlayId(overlay.id)
            }}
          >
            <Type className="mr-1 h-4 w-4" />
            Add label
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={block.annotations.length === 0}
            onClick={() => onChange({ ...block, annotations: block.annotations.slice(0, -1) })}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={block.annotations.length === 0}
            onClick={() => onChange({ ...block, annotations: [] })}
          >
            <Paintbrush className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Remove image
          </Button>
        </div>
      ) : null}

      {!readOnly && drawMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Color
            <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Stroke
            <input
              type="range"
              min={2}
              max={16}
              value={strokeWidth}
              onChange={(event) => setStrokeWidth(Number(event.target.value))}
            />
            <span>{strokeWidth}px</span>
          </label>
        </div>
      ) : null}

      {!readOnly && selectedOverlay ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Input
            value={selectedOverlay.text}
            onChange={(event) =>
              onChange({
                ...block,
                textOverlays: block.textOverlays.map((overlay) =>
                  overlay.id === selectedOverlay.id ? { ...overlay, text: event.target.value } : overlay,
                ),
              })
            }
            className="max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Size
            <input
              type="number"
              min={12}
              max={42}
              value={selectedOverlay.fontSize}
              onChange={(event) =>
                onChange({
                  ...block,
                  textOverlays: block.textOverlays.map((overlay) =>
                    overlay.id === selectedOverlay.id ? { ...overlay, fontSize: Number(event.target.value) || 18 } : overlay,
                  ),
                })
              }
              className="w-20 rounded-md border border-slate-200 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Color
            <input
              type="color"
              value={selectedOverlay.color}
              onChange={(event) =>
                onChange({
                  ...block,
                  textOverlays: block.textOverlays.map((overlay) =>
                    overlay.id === selectedOverlay.id ? { ...overlay, color: event.target.value } : overlay,
                  ),
                })
              }
            />
          </label>
          <Button
            type="button"
            variant={selectedOverlay.bold ? "default" : "outline"}
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                textOverlays: block.textOverlays.map((overlay) =>
                  overlay.id === selectedOverlay.id ? { ...overlay, bold: !overlay.bold } : overlay,
                ),
              })
            }
          >
            <Bold className="mr-1 h-4 w-4" />
            Bold
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              onChange({ ...block, textOverlays: block.textOverlays.filter((overlay) => overlay.id !== selectedOverlay.id) })
              setSelectedOverlayId(null)
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete label
          </Button>
        </div>
      ) : null}

      <div className={cn(
        "flex w-full",
        block.alignment === "center" ? "justify-center" : block.alignment === "right" ? "justify-end" : "justify-start"
      )}>
      <div
        ref={wrapperRef}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
          !readOnly && "touch-none select-none",
          drawMode && !readOnly && "cursor-crosshair",
        )}
        style={{ width: `${block.width}px`, height: `${block.height}px`, maxWidth: "100%" }}
        onPointerDown={(event) => {
          if (readOnly || !drawMode || !wrapperRef.current) return
          event.preventDefault()
          wrapperRef.current.setPointerCapture?.(event.pointerId)
          const rect = wrapperRef.current.getBoundingClientRect()
          const point = {
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
          }
          drawStateRef.current = { pointerId: event.pointerId, points: [point] }
          setDraftPoints([point])
        }}
      >
        <img
          src={block.url}
          alt={block.file_name || "Proposal image"}
          className="pointer-events-none h-full w-full select-none object-contain"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
        />

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${block.width} ${block.height}`} preserveAspectRatio="none">
          {block.annotations.map((stroke) => (
            <StrokePath key={stroke.id} stroke={stroke} width={block.width} height={block.height} />
          ))}
          {draftPoints.length >= 2 ? (
            <path
              d={draftPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * block.width} ${point.y * block.height}`).join(" ")}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>

        {block.textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className={cn(
              "absolute select-none rounded-md px-3 py-1.5 shadow-lg",
              !readOnly && "cursor-move",
              selectedOverlayId === overlay.id && !readOnly && "ring-2 ring-sky-400",
            )}
            style={{
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              transform: "translate(-50%, -50%)",
              color: overlay.color,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.bold ? 700 : 400,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
            }}
            onPointerDown={(event) => {
              if (readOnly || drawMode) return
              event.stopPropagation()
              event.preventDefault()
              setSelectedOverlayId(overlay.id)
              dragStateRef.current = { pointerId: event.pointerId, overlayId: overlay.id }
            }}
          >
            {overlay.text}
          </div>
        ))}

        {!readOnly ? (
          <button
            type="button"
            className="absolute bottom-2 right-2 h-5 w-5 rounded-full border border-white/80 bg-slate-900/80 shadow"
            aria-label="Resize image"
            onPointerDown={(event) => {
              event.preventDefault()
              resizeStateRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                width: block.width,
                height: block.height,
              }
            }}
          />
        ) : null}
      </div>
      </div>
    </div>
  )
}

function BeforeAfterBlockEditor({
  block,
  readOnly,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: ProposalBeforeAfterBlock
  readOnly: boolean
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onMoveUp} disabled={!canMoveUp}>
            <MoveUp className="mr-1 h-4 w-4" />
            Up
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onMoveDown} disabled={!canMoveDown}>
            <MoveDown className="mr-1 h-4 w-4" />
            Down
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Remove
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <img
            src={block.beforeUrl}
            alt={block.beforeLabel ?? "Before"}
            className="aspect-[4/3] w-full object-cover"
            draggable={false}
          />
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {block.beforeLabel ?? "Before"}
          </span>
        </div>

        {/* After */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
          <img
            src={block.afterUrl}
            alt={block.afterLabel ?? "After"}
            className="aspect-[4/3] w-full object-cover"
            draggable={false}
          />
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {block.afterLabel ?? "After"}
          </span>
        </div>
      </div>
    </div>
  )
}

function isBeforePhotoFilename(fileName?: string | null): boolean {
  if (!fileName) return false
  return /^before-photo/i.test(fileName) || /^before-/i.test(fileName)
}

function isAfterRenderFilename(fileName?: string | null): boolean {
  if (!fileName) return false
  return /^ai-after-render(?:-\d+)?\.png$/i.test(fileName)
}

function extractBeforeAfterIndex(fileName?: string | null): number | null {
  if (!fileName) return null
  const beforeMatch = fileName.match(/^before-photo(?:-(\d+))?/i) || fileName.match(/^before-(\d+)/i)
  if (beforeMatch) return beforeMatch[1] ? parseInt(beforeMatch[1], 10) : 1
  const afterMatch = fileName.match(/^ai-after-render(?:-(\d+))?\.png$/i)
  if (afterMatch) return afterMatch[1] ? parseInt(afterMatch[1], 10) : 1
  return null
}

function buildBeforeAfterPairsFromMedia(mediaItems: ProjectMedia[] = []): BeforeAfterImagePair[] {
  const pairMap = new Map<number, BeforeAfterImagePair>()

  for (const media of mediaItems) {
    const index = extractBeforeAfterIndex(media.file_name)
    if (!index) continue

    const existing = pairMap.get(index) ?? {
      id: `saved-before-after-${index}`,
      beforePreview: "",
      beforeFile: null,
      beforeFileName: null,
      afterUrl: null,
      afterFileName: null,
      status: "saved" as const,
      error: null,
    }

    if (isBeforePhotoFilename(media.file_name)) {
      existing.beforePreview = media.file_url
      existing.beforeFileName = media.file_name
    }
    if (isAfterRenderFilename(media.file_name)) {
      existing.afterUrl = media.file_url
      existing.afterFileName = media.file_name
    }

    pairMap.set(index, existing)
  }

  return Array.from(pairMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, pair]) => ({
      ...pair,
      status: (pair.afterUrl ? "saved" : "pending") as BeforeAfterImagePair["status"],
    }))
    .filter((pair) => Boolean(pair.beforePreview || pair.afterUrl))
}

export function ProposalBuilder({
  job,
  contractorName,
  locale,
  onJobUpdated,
  publicMode = false,
}: {
  job: Job
  contractorName: string
  locale: string
  onJobUpdated: (job: Job) => void
  publicMode?: boolean
}) {
  const { toast } = useToast()
  const fileInputId = useId()
  const [document, setDocument] = useState<ProposalDocument>(() => buildInitialProposalDocument(job, contractorName))
  const [viewMode, setViewMode] = useState(publicMode)
  const [saving, setSaving] = useState(false)
  const [uploadingPageId, setUploadingPageId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [overviewLoaded, setOverviewLoaded] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [imagePairs, setImagePairs] = useState<BeforeAfterImagePair[]>(() =>
    buildBeforeAfterPairsFromMedia(job.project_media ?? [])
  )
  const [imagePickerPageId, setImagePickerPageId] = useState<string | null>(null)
  const pageUploadRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setDocument(buildInitialProposalDocument(job, contractorName))
    setDirty(false)
    setOverviewLoaded(false)
  }, [contractorName, job, publicMode])

  useEffect(() => {
    setViewMode(publicMode)
  }, [job.id, publicMode])

  useEffect(() => {
    setImagePairs(buildBeforeAfterPairsFromMedia(job.project_media ?? []))
  }, [job.id, job.project_media])

  useEffect(() => {
    const shouldHydrateOverview =
      !job.proposal_document &&
      !overviewLoaded &&
      document.projectOverview.description === DEFAULT_PROJECT_OVERVIEW_DESCRIPTION_HTML

    if (!shouldHydrateOverview) {
      return
    }

    let cancelled = false

    const loadOverview = async () => {
      try {
        const generated = (await api.getProposalOverview(job.id)) as ProposalOverviewResponse
        if (cancelled) return
        setDocument((current) => ({
          ...current,
          projectOverview: {
            title: generated.title || current.projectOverview.title,
            description: `<p>${escapeHtml(generated.description || "")}</p>`,
          },
        }))
      } catch {
        // Leave the default copy in place if AI generation fails.
      } finally {
        if (!cancelled) {
          setOverviewLoaded(true)
        }
      }
    }

    void loadOverview()

    return () => {
      cancelled = true
    }
  }, [document.projectOverview.description, job.id, job.proposal_document, overviewLoaded])

  const updateDocument = (updater: (current: ProposalDocument) => ProposalDocument) => {
    setDocument((current) => {
      const next = updater(current)
      return next
    })
    setDirty(true)
  }

  const isReadOnly = publicMode || viewMode
  const proposalPublicHref = job.proposal_public_link ? `/${locale}/proposals/${job.proposal_public_link}` : null
  // Contractor view always uses the numeric ID route; public/client view uses the UUID share link
  const quoteHref = publicMode && job.quote_public_link
    ? `/${locale}/quotes/${job.quote_public_link}`
    : `/${locale}/quotes/${job.id}`

  const copyDocumentLink = async (href: string, label: string) => {
    if (typeof window === "undefined") return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      toast({
        title: `${label} link copied`,
        description: `The ${label.toLowerCase()} URL is ready to share.`,
      })
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy the link right now.",
        variant: "destructive",
      })
    }
  }

  const saveProposal = async () => {
    setSaving(true)
    try {
      const updatedJob = (await api.updateJob(job.id, { proposal_document: document })) as Job
      onJobUpdated(updatedJob)
      setDirty(false)
      toast({
        title: "Proposal saved",
        description: updatedJob.proposal_public_link
          ? "Your proposal is attached to this quote and now has its own share link."
          : "Your proposal document is now attached to this quote.",
      })
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save the proposal right now.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addPage = () => {
    updateDocument((current) => ({
      ...current,
      pages: [
        ...current.pages,
        {
          id: createId("page"),
          title: `Page ${current.pages.length + 1}`,
          description: [createTextBlock("")],
        },
      ],
    }))
  }

  const movePage = (pageId: string, direction: -1 | 1) => {
    updateDocument((current) => {
      const index = current.pages.findIndex((page) => page.id === pageId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= current.pages.length) return current
      const nextPages = [...current.pages]
      const [page] = nextPages.splice(index, 1)
      nextPages.splice(targetIndex, 0, page)
      return { ...current, pages: nextPages }
    })
  }

  const uploadImages = async (pageId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadingPageId(pageId)
    try {
      const uploaded = (await api.uploadQuoteMedia(job.id, Array.from(files))) as ProjectMedia[]
      const imageBlocks = await Promise.all(uploaded.map((media) => createImageBlock(media)))
      updateDocument((current) =>
        updatePage(current, pageId, (page) => ({
          ...page,
          description: [...page.description, ...imageBlocks],
        })),
      )
      toast({
        title: "Images added",
        description: uploaded.length === 1 ? "Photo added to proposal page." : `${uploaded.length} photos added to proposal page.`,
      })
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Unable to upload one or more files.",
        variant: "destructive",
      })
    } finally {
      setUploadingPageId(null)
    }
  }

  const subtitle = [document.companyName, document.companyAddress].filter(Boolean).join(" · ")

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4f7_100%)] print:bg-none print:bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 print:px-0 print:py-0 print:max-w-none print:gap-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[30px] border border-slate-100 bg-white px-5 py-3 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] print:hidden">
          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link href={quoteHref}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {publicMode ? "View Quote" : "Back to Quote"}
              </Link>
            </Button>
            <Badge variant="secondary" className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] text-white">
              {publicMode ? "Shared Proposal" : "Proposal Builder"}
            </Badge>
            {!publicMode ? (
              dirty
                ? <span className="text-xs font-medium text-amber-600">Unsaved changes</span>
                : <span className="text-xs text-slate-400">All changes saved</span>
            ) : (
              <span className="text-xs text-slate-400">Read-only</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {proposalPublicHref && !publicMode ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => copyDocumentLink(proposalPublicHref, "Proposal")} title="Copy proposal link">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={proposalPublicHref} target="_blank" title="Open shared view">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Shared view
                  </Link>
                </Button>
              </>
            ) : null}
            {!publicMode ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setViewMode((value) => !value)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {viewMode ? "Edit" : "Preview"}
              </Button>
            ) : null}
            {!publicMode ? (
              <Button type="button" size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setShowAIModal(true)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Before &amp; After
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const wasInEditMode = !viewMode
                if (wasInEditMode) setViewMode(true)
                // Give React a tick to re-render in read-only mode before printing
                setTimeout(() => {
                  window.print()
                  // Restore edit mode after the print dialog closes
                  if (wasInEditMode) setViewMode(false)
                }, 80)
              }}
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
            {!publicMode ? (
              <Button type="button" size="sm" onClick={saveProposal} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save
              </Button>
            ) : null}
          </div>
        </div>

        <Card className="rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)] print:shadow-none print:border-none print:rounded-none">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.92)_38%,rgba(251,191,36,0.12))] px-6 py-6 sm:px-8 print:border-b-0 print:px-0">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full bg-slate-950 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white">
                  Proposal
                </Badge>
                {document.quoteId ? <Badge className="rounded-full bg-slate-900 px-3 py-1 text-xs">QUOTE #{document.quoteId}</Badge> : null}
                <Badge variant="secondary" className="rounded-full bg-white px-3 py-1 text-xs shadow-sm">{formatProposalDate(document.date)}</Badge>
                <Badge variant="secondary" className="rounded-full bg-white px-3 py-1 text-xs shadow-sm">{document.contractorName}</Badge>
              </div>

              {isReadOnly ? (
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{document.title}</h1>
              ) : (
                <Input
                  value={document.title}
                  onChange={(event) => updateDocument((current) => ({ ...current, title: event.target.value }))}
                  className="h-auto border-none bg-transparent px-0 text-3xl font-semibold tracking-tight text-slate-950 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 sm:text-5xl"
                  placeholder="Proposal title"
                />
              )}

              <p className="max-w-3xl text-sm font-medium text-slate-600 sm:text-base">
                {subtitle || "Link this proposal to a company / property"}
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            {!isReadOnly ? (
              <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/90 p-4 sm:grid-cols-2">
                <Input
                  value={document.companyName}
                  onChange={(event) => updateDocument((current) => ({ ...current, companyName: event.target.value }))}
                  placeholder="Company / property name"
                />
                <Input
                  value={document.companyAddress}
                  onChange={(event) => updateDocument((current) => ({ ...current, companyAddress: event.target.value }))}
                  placeholder="Company / property address"
                />
                <Input
                  value={document.date}
                  type="date"
                  onChange={(event) => updateDocument((current) => ({ ...current, date: event.target.value }))}
                />
                <Input
                  value={document.contractorName}
                  onChange={(event) => updateDocument((current) => ({ ...current, contractorName: event.target.value }))}
                  placeholder="Contractor company name"
                />
              </div>
            ) : (
              <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Prepared For</p>
                  <p className="mt-1 font-medium text-slate-900">{document.companyName || "Client / Property"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Address</p>
                  <p className="mt-1 font-medium text-slate-900">{document.companyAddress || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Prepared By</p>
                  <p className="mt-1 font-medium text-slate-900">{document.contractorName}</p>
                </div>
              </div>
            )}

            <RichTextEditor
              value={document.scopeSummary}
              onChange={(value) => updateDocument((current) => ({ ...current, scopeSummary: value }))}
              readOnly={isReadOnly}
              className={isReadOnly ? "prose-p:mb-0 prose-p:text-[16px] prose-p:leading-8" : undefined}
              placeholder="Add the top-level scope summary for this proposal."
            />
          </div>
        </Card>

        <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-[11px] tracking-[0.24em] text-slate-500">
              PROJECT OVERVIEW
            </Badge>

            {isReadOnly ? (
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{document.projectOverview.title}</h2>
            ) : (
              <Input
                value={document.projectOverview.title}
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    projectOverview: { ...current.projectOverview, title: event.target.value },
                  }))
                }
                className="h-auto border-none px-0 text-2xl font-semibold tracking-tight text-slate-950 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0"
                placeholder="Project overview title"
              />
            )}

            <RichTextEditor
              value={document.projectOverview.description}
              onChange={(value) =>
                updateDocument((current) => ({
                  ...current,
                  projectOverview: { ...current.projectOverview, description: value },
                }))
              }
              readOnly={isReadOnly}
              placeholder="Describe the project context and why this work matters."
            />
          </div>
        </Card>

        {document.pages.map((page, pageIndex) => (
          <Card key={page.id} className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm sm:p-0 print:overflow-visible print:border-none print:shadow-none print:rounded-none">
            <div className="space-y-5">
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(240,249,255,1))] px-6 py-5 sm:px-8 print:border-b-0 print:bg-none print:px-0 print:py-2">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-[11px] tracking-[0.22em] text-slate-500">
                    PAGE {pageIndex + 1}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {!isReadOnly ? <GripVertical className="mt-1 h-5 w-5 shrink-0 text-slate-400" /> : null}
                    <div className="min-w-0 flex-1">
                      {isReadOnly ? (
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{page.title}</h2>
                      ) : (
                        <Input
                          value={page.title}
                          onChange={(event) =>
                            updateDocument((current) =>
                              updatePage(current, page.id, (currentPage) => ({ ...currentPage, title: event.target.value })),
                            )
                          }
                          className="h-auto border-none px-0 text-2xl font-semibold tracking-tight text-slate-950 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0"
                          placeholder="Page title"
                        />
                      )}
                    </div>
                  </div>

                  {!isReadOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => movePage(page.id, -1)} disabled={pageIndex === 0}>
                        <MoveUp className="mr-1 h-4 w-4" />
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => movePage(page.id, 1)}
                        disabled={pageIndex === document.pages.length - 1}
                      >
                        <MoveDown className="mr-1 h-4 w-4" />
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          updateDocument((current) => ({
                            ...current,
                            pages: current.pages.filter((currentPage) => currentPage.id !== page.id),
                          }))
                        }
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
                {page.description.map((block, blockIndex) => {
                  const deleteBlock = () =>
                    updateDocument((current) =>
                      updatePage(current, page.id, (currentPage) => ({
                        ...currentPage,
                        description: currentPage.description.filter((b) => b.id !== block.id),
                      })),
                    )
                  const moveUp = () =>
                    updateDocument((current) =>
                      updatePage(current, page.id, (currentPage) => moveBlockWithinPage(currentPage, block.id, -1)),
                    )
                  const moveDown = () =>
                    updateDocument((current) =>
                      updatePage(current, page.id, (currentPage) => moveBlockWithinPage(currentPage, block.id, 1)),
                    )

                  if (block.type === "before_after") {
                    return (
                      <BeforeAfterBlockEditor
                        key={block.id}
                        block={block}
                        readOnly={isReadOnly}
                        canMoveUp={blockIndex > 0}
                        canMoveDown={blockIndex < page.description.length - 1}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                        onDelete={deleteBlock}
                      />
                    )
                  }

                  if (block.type === "text") {
                    return (
                      <div key={block.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        {!isReadOnly ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={moveUp} disabled={blockIndex === 0}>
                              <MoveUp className="mr-1 h-4 w-4" />
                              Up
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={moveDown} disabled={blockIndex === page.description.length - 1}>
                              <MoveDown className="mr-1 h-4 w-4" />
                              Down
                            </Button>
                          </div>
                        ) : null}
                        <RichTextEditor
                          value={block.html}
                          onChange={(value) =>
                            updateDocument((current) =>
                              updateBlock(current, page.id, block.id, () => ({ ...block, html: value })),
                            )
                          }
                          readOnly={isReadOnly}
                          placeholder={PAGE_TEXT_PLACEHOLDER}
                        />
                        {!isReadOnly ? (
                          <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={deleteBlock}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove text block
                          </Button>
                        ) : null}
                      </div>
                    )
                  }

                  // image block
                  return (
                    <ImageBlockEditor
                      key={block.id}
                      block={block}
                      readOnly={isReadOnly}
                      canMoveUp={blockIndex > 0}
                      canMoveDown={blockIndex < page.description.length - 1}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      onChange={(nextBlock) =>
                        updateDocument((current) => updateBlock(current, page.id, block.id, () => nextBlock))
                      }
                      onDelete={deleteBlock}
                    />
                  )
                })}
              </div>

              {!isReadOnly ? (
                <div className="mx-6 mb-6 flex flex-wrap gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:mx-8 sm:mb-8">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDocument((current) =>
                        updatePage(current, page.id, (currentPage) => ({
                          ...currentPage,
                          description: [...currentPage.description, createTextBlock("")],
                        })),
                      )
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add text
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingPageId === page.id}
                    onClick={() => {
                      const hasPickable = imagePairs.some(
                        (p) => p.afterUrl || (!p.beforeFile && p.beforePreview)
                      )
                      if (hasPickable) {
                        setImagePickerPageId(page.id)
                      } else {
                        pageUploadRefs.current[page.id]?.click()
                      }
                    }}
                  >
                    {uploadingPageId === page.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1 h-4 w-4" />
                    )}
                    Add images
                  </Button>

                  <input
                    ref={(el) => { pageUploadRefs.current[page.id] = el }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void uploadImages(page.id, event.target.files)
                      event.currentTarget.value = ""
                    }}
                  />
                </div>
              ) : null}
            </div>
          </Card>
        ))}

        {!isReadOnly ? (
          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-3xl border-dashed border-slate-300 bg-white/80 text-slate-700 shadow-sm hover:border-slate-400 hover:bg-white"
            onClick={addPage}
          >
            <FileImage className="mr-2 h-4 w-4" />
            + Add Page
          </Button>
        ) : null}
      </div>

      <Dialog open={imagePickerPageId !== null} onOpenChange={(open) => { if (!open) setImagePickerPageId(null) }}>
        <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-[28px]">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-base font-semibold text-slate-900">Add Image</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-500">
              Select from your AI before &amp; after photos or upload a new image.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {imagePairs.some((p) => p.afterUrl || (!p.beforeFile && p.beforePreview)) ? (
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    AI Before &amp; After
                  </span>
                </div>
                <div className="space-y-3">
                  {imagePairs
                    .filter((p) => p.afterUrl || (!p.beforeFile && p.beforePreview))
                    .map((pair, pairIndex) => {
                      const hasBefore = !pair.beforeFile && Boolean(pair.beforePreview)
                      const hasAfter = Boolean(pair.afterUrl)
                      const hasBoth = hasBefore && hasAfter

                      const addImage = async (url: string, label: string) => {
                        const pageId = imagePickerPageId
                        if (!pageId) return
                        const block = await createImageBlockFromUrl(url, label)
                        updateDocument((current) =>
                          updatePage(current, pageId, (p) => ({
                            ...p,
                            description: [...p.description, block],
                          }))
                        )
                        setImagePickerPageId(null)
                      }

                      const addBoth = () => {
                        const pageId = imagePickerPageId
                        if (!pageId || !pair.beforePreview || !pair.afterUrl) return
                        const block: ProposalBeforeAfterBlock = {
                          id: createId("before-after"),
                          type: "before_after",
                          beforeUrl: pair.beforePreview,
                          afterUrl: pair.afterUrl,
                          beforeLabel: "Before",
                          afterLabel: "After",
                        }
                        updateDocument((current) =>
                          updatePage(current, pageId, (p) => ({
                            ...p,
                            description: [...p.description, block],
                          }))
                        )
                        setImagePickerPageId(null)
                      }

                      return (
                        <div key={pair.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                            <span className="text-xs font-medium text-slate-500">Pair {pairIndex + 1}</span>
                            {hasBoth ? (
                              <button
                                type="button"
                                onClick={addBoth}
                                className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                              >
                                <Plus className="h-3 w-3" />
                                Add both
                              </button>
                            ) : null}
                          </div>
                          <div className={cn("grid divide-x divide-slate-100", hasBoth ? "grid-cols-2" : "grid-cols-1")}>
                            {hasBefore ? (
                              <button
                                type="button"
                                className="group text-left transition hover:bg-slate-50"
                                onClick={() => addImage(pair.beforePreview, `Before ${pairIndex + 1}`)}
                              >
                                <div className="aspect-[4/3] overflow-hidden">
                                  <img src={pair.beforePreview} alt={`Before ${pairIndex + 1}`} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                                </div>
                                <div className="px-3 py-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Before</span>
                                </div>
                              </button>
                            ) : null}
                            {hasAfter ? (
                              <button
                                type="button"
                                className="group text-left transition hover:bg-slate-50"
                                onClick={() => addImage(pair.afterUrl!, `After ${pairIndex + 1}`)}
                              >
                                <div className="aspect-[4/3] overflow-hidden">
                                  <img src={pair.afterUrl!} alt={`After ${pairIndex + 1}`} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                                </div>
                                <div className="px-3 py-2">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">After (AI)</span>
                                </div>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : null}

            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Upload from device
                </span>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() => {
                  const pageId = imagePickerPageId
                  if (!pageId) return
                  setImagePickerPageId(null)
                  setTimeout(() => { pageUploadRefs.current[pageId]?.click() }, 80)
                }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <ImagePlus className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Upload images</p>
                  <p className="text-xs text-slate-400">JPG, PNG, WEBP and more</p>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-[28px]">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 ring-1 ring-violet-100">
                <Sparkles className="h-4 w-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-slate-900">
                  AI Before and After
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-slate-500">
                  Upload a before photo, choose the saved quote items to include, and generate a before/after preview for this quote.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <BeforeAfterPanel
              jobId={job.id}
              lineItems={(job.items ?? []).map((item: JobItem) => ({
                title: item.title,
                description: item.custom_description,
                quantity: item.quantity,
                unitOfMeasure: item.unit_of_measure,
              }))}
              jobDescription={job.job_description || job.description || ""}
              jobTitle={job.title || ""}
              imagePairs={imagePairs}
              onImagePairsChange={setImagePairs}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
