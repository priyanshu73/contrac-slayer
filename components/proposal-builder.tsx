"use client"

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, ChevronDown, ChevronsUpDown, Copy, Eye, ExternalLink, FileImage, GripVertical, Heading2, ImagePlus, Italic, List, ListOrdered, Loader2, MoveDown, MoveUp, Paintbrush, PencilLine, Plus, RemoveFormatting, Save, Sparkles, Strikethrough, Trash2, Type, Underline, Undo2, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { BeforeAfterPanel, type BeforeAfterImagePair } from "@/components/before-after-panel"
import { api } from "@/lib/api"
import { DEFAULT_PROPOSAL_THEME_ID, PROPOSAL_THEMES, getProposalTheme, normalizeProposalThemeId } from "@/lib/proposal-themes"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type {
  Client,
  Job,
  JobItem,
  Project,
  ProjectMedia,
  Proposal,
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
  ProposalThemeId,
} from "@/lib/types"

// ─── Typography ──────────────────────────────────────────────────────────────

export const PROPOSAL_FONTS = [
  { id: "inter",             name: "Inter",              stack: "Inter, system-ui, sans-serif",                    google: null },
  { id: "playfair",          name: "Playfair Display",   stack: "'Playfair Display', Georgia, serif",              google: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600" },
  { id: "cormorant",         name: "Cormorant Garamond", stack: "'Cormorant Garamond', Georgia, serif",            google: "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600" },
  { id: "merriweather",      name: "Merriweather",       stack: "Merriweather, Georgia, serif",                    google: "Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400" },
  { id: "libre-baskerville", name: "Libre Baskerville",  stack: "'Libre Baskerville', Georgia, serif",             google: "Libre+Baskerville:ital,wght@0,400;0,700;1,400" },
  { id: "lato",              name: "Lato",               stack: "Lato, Arial, sans-serif",                         google: "Lato:ital,wght@0,300;0,400;0,700;1,300;1,400" },
  { id: "raleway",           name: "Raleway",            stack: "Raleway, Arial, sans-serif",                      google: "Raleway:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600" },
  { id: "source-serif",      name: "Source Serif 4",     stack: "'Source Serif 4', Georgia, serif",                google: "Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400" },
] as const

export type ProposalFontId = (typeof PROPOSAL_FONTS)[number]["id"]
export const DEFAULT_PROPOSAL_FONT_ID: ProposalFontId = "inter"

const loadedGoogleFonts = new Set<string>()

function ensureGoogleFont(googleSpec: string | null) {
  if (!googleSpec || typeof document === "undefined") return
  if (loadedGoogleFonts.has(googleSpec)) return
  loadedGoogleFonts.add(googleSpec)
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${googleSpec}&display=swap`
  document.head.appendChild(link)
}

function getProposalFont(id?: string | null) {
  return PROPOSAL_FONTS.find((f) => f.id === id) ?? PROPOSAL_FONTS[0]
}

// ─────────────────────────────────────────────────────────────────────────────

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

function normalizeHexColor(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return /^#[0-9a-fA-F]{6}$/.test(normalized ?? "") ? normalized! : fallback
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "")
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function withAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isLightColor(color: string) {
  const { r, g, b } = hexToRgb(color)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.72
}

function normalizePageTitle(title: string | undefined, pageIndex: number) {
  const value = title?.trim() ?? ""
  return value === `Page ${pageIndex + 1}` ? "" : value
}

function updateProposalTheme(current: ProposalDocument, themeId: ProposalThemeId): ProposalDocument {
  const theme = getProposalTheme(themeId)
  if (current.themeId === themeId) return current
  return {
    ...current,
    themeId,
    accentColor: theme.swatches[1],
    tintColor: theme.swatches[2],
  }
}

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

function buildInitialProposalDocument(job: Job, contractorName: string, client?: import("@/lib/types").Client): ProposalDocument {
  const today = new Date().toISOString().slice(0, 10)

  if (job.proposal_document) {
    const themeId = normalizeProposalThemeId(job.proposal_document.themeId)
    const theme = getProposalTheme(themeId)
    const savedName = job.proposal_document.companyName
    const isPlaceholder = !savedName || savedName === "Client / Property"
    return {
      ...job.proposal_document,
      companyName: isPlaceholder ? (client?.name || savedName || "") : savedName,
      companyAddress: isPlaceholder ? (client?.address || job.proposal_document.companyAddress || "") : job.proposal_document.companyAddress,
      quoteId: job.proposal_document.quoteId ?? job.id,
      contractorName: job.proposal_document.contractorName || contractorName,
      themeId,
      accentColor: normalizeHexColor(job.proposal_document.accentColor, theme.swatches[1]),
      tintColor: normalizeHexColor(job.proposal_document.tintColor, theme.swatches[2]),
      date: job.proposal_document.date || today,
      pages: Array.isArray(job.proposal_document.pages)
        ? job.proposal_document.pages.map((page, pageIndex) => ({
            ...page,
            title: normalizePageTitle(page.title, pageIndex),
          }))
        : [],
    }
  }

  const clientName = client?.name || job.client?.name || ""
  const clientAddress = client?.address || job.client?.address || job.address || ""

  return {
    title: job.title || (clientName ? `Proposal for ${clientName}` : "Proposal for Project"),
    companyName: clientName || "Client / Property",
    companyAddress: clientAddress,
    quoteId: job.id,
    date: today,
    contractorName,
    themeId: DEFAULT_PROPOSAL_THEME_ID,
    accentColor: getProposalTheme(DEFAULT_PROPOSAL_THEME_ID).swatches[1],
    tintColor: getProposalTheme(DEFAULT_PROPOSAL_THEME_ID).swatches[2],
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
        title: "",
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
  toolbarClassName,
  editorClassName,
  readOnlyClassName,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  readOnly?: boolean
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  readOnlyClassName?: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editorRef.current || readOnly) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [readOnly, value])

  const exec = (command: string, val?: string) => {
    const doc = document as Document & { execCommand?: (c: string, ui?: boolean, v?: string) => boolean }
    editorRef.current?.focus()
    doc.execCommand?.(command, false, val)
    onChange(editorRef.current?.innerHTML || "")
  }

  const toggleHeading = () => {
    const doc = document as Document & { queryCommandValue?: (c: string) => string }
    const current = doc.queryCommandValue?.("formatBlock") ?? ""
    exec("formatBlock", current.toLowerCase() === "h2" ? "p" : "h2")
  }

  if (readOnly) {
    if (!value?.trim()) {
      return null
    }

    return (
      <div
        className={cn("prose max-w-none text-[15px] leading-7", readOnlyClassName, className)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  const sep = <span className="mx-0.5 h-4 w-px self-center bg-slate-200" />

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
      <div className={cn("flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5", toolbarClassName)}>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold") }}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic") }}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec("underline") }}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Strikethrough" onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough") }}>
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        {sep}
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Heading" onMouseDown={(e) => { e.preventDefault(); toggleHeading() }}>
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        {sep}
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bullet list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList") }}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList") }}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        {sep}
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); exec("formatBlock", "p") }}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={editorRef}
        className={cn(
          "min-h-[140px] px-4 py-3 text-[15px] leading-7 text-slate-700 outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]",
          editorClassName,
        )}
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
  className,
}: {
  block: ProposalImageBlock
  readOnly: boolean
  onChange: (block: ProposalImageBlock) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  className?: string
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
    <div className={cn("space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3", className)}>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={!canMoveUp} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={!canMoveDown} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
            <MoveDown className="h-4 w-4" />
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
          <Button type="button" variant="ghost" size="icon-sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
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
  className,
}: {
  block: ProposalBeforeAfterBlock
  readOnly: boolean
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50/80 p-3", className)}>
      {!readOnly ? (
        <div className="mb-2 flex items-center justify-end gap-0.5">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={!canMoveUp} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={!canMoveDown} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
            <MoveDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
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
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm print:bg-slate-900 print:[backdrop-filter:none]">
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
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm print:bg-emerald-600 print:[backdrop-filter:none]">
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

function ClientNameField({
  value,
  clients,
  onChange,
  onClientSelect,
}: {
  value: string
  clients?: Client[]
  onChange: (name: string) => void
  onClientSelect: (client: Client) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex items-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Company / property name"
        className="flex-1"
      />
      {clients && clients.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Link client from your contacts">
              <User className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search clients…" />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        onClientSelect(c)
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 size-4", value === c.name ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{c.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

export function ProposalBuilder({
  job,
  proposal,
  project,
  client,
  clients,
  contractorName,
  locale,
  onJobUpdated,
  onProposalUpdated,
  onProjectClientChanged,
  publicMode = false,
}: {
  /** Legacy: job-centric mode. Pass when building from a quote directly. */
  job?: Job
  /** New: proposal-centric mode. Pass when building from a project proposal. */
  proposal?: Proposal
  project?: Project
  /** Client linked to the project — used to pre-fill company name/address on new proposals. */
  client?: Client
  /** All clients available for selection — enables the "link client" combobox. */
  clients?: Client[]
  contractorName: string
  locale: string
  onJobUpdated?: (job: Job) => void
  onProposalUpdated?: (proposal: Proposal) => void
  /** Called when the user picks a client in the proposal form, so the parent can sync project.client_id. */
  onProjectClientChanged?: (clientId: number) => void
  publicMode?: boolean
}) {
  const isProposalMode = !!proposal
  const { toast } = useToast()
  const fileInputId = useId()
  const [document, setDocument] = useState<ProposalDocument>(() => {
    if (isProposalMode && proposal) {
      return buildInitialProposalDocument(
        { proposal_document: proposal.proposal_document, id: proposal.id, title: proposal.title ?? "" } as any,
        contractorName,
        client
      )
    }
    return buildInitialProposalDocument(job as Job, contractorName)
  })
  const [viewMode, setViewMode] = useState(publicMode)
  const [saving, setSaving] = useState(false)
  const [uploadingPageId, setUploadingPageId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [overviewLoaded, setOverviewLoaded] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [imagePairs, setImagePairs] = useState<BeforeAfterImagePair[]>(() =>
    buildBeforeAfterPairsFromMedia(
      isProposalMode ? (project?.media ?? []) : (job?.project_media ?? [])
    )
  )
  const [imagePickerPageId, setImagePickerPageId] = useState<string | null>(null)
  const pageUploadRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Sync proposal context to window so AgentChatPanel can read it
  useEffect(() => {
    const ctx = {
      proposalTitle: document.title || proposal?.title || "",
      projectTitle: project?.title || document.projectOverview?.title || "",
      description: project?.objective || job?.job_description || "",
      projectBrief: project?.brief || null,
      includeProjectBriefInContext: true,
    }
    ;(window as any).proposalBuilderContext = ctx
    window.dispatchEvent(new CustomEvent("proposal-context-updated", { detail: ctx }))
  }, [document.title, proposal?.title, project?.title, document.projectOverview?.title, project?.objective, job?.job_description, project?.brief])

  useEffect(() => {
    if (isProposalMode && proposal) {
      setDocument(buildInitialProposalDocument(
        { proposal_document: proposal.proposal_document, id: proposal.id, title: proposal.title ?? "" } as any,
        contractorName,
        client
      ))
    } else if (job) {
      setDocument(buildInitialProposalDocument(job, contractorName))
    }
    setDirty(false)
    setOverviewLoaded(false)
  }, [contractorName, isProposalMode, job, proposal, publicMode, client])

  useEffect(() => {
    setViewMode(publicMode)
  }, [isProposalMode ? proposal?.id : job?.id, publicMode])

  useEffect(() => {
    setImagePairs(buildBeforeAfterPairsFromMedia(
      isProposalMode ? (project?.media ?? []) : (job?.project_media ?? [])
    ))
  }, [isProposalMode, job?.id, job?.project_media, project?.id, project?.media])

  useEffect(() => {
    const hasExistingDoc = isProposalMode ? !!proposal?.proposal_document : !!job?.proposal_document
    const shouldHydrateOverview =
      !hasExistingDoc &&
      !overviewLoaded &&
      document.projectOverview.description === DEFAULT_PROJECT_OVERVIEW_DESCRIPTION_HTML

    if (!shouldHydrateOverview) {
      return
    }

    let cancelled = false

    const loadOverview = async () => {
      try {
        const generated = isProposalMode && proposal
          ? (await api.getProposalOverviewForProject(proposal.project_id, proposal.id)) as ProposalOverviewResponse
          : (await api.getProposalOverview(job!.id)) as ProposalOverviewResponse
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
  }, [document.projectOverview.description, isProposalMode, job?.id, job?.proposal_document, overviewLoaded, proposal])

  const generateProposalOverview = useCallback(async () => {
    try {
      const generated = isProposalMode && proposal
        ? (await api.getProposalOverviewForProject(proposal.project_id, proposal.id)) as ProposalOverviewResponse
        : (await api.getProposalOverview(job!.id)) as ProposalOverviewResponse
      setDocument((current) => ({
        ...current,
        projectOverview: {
          title: generated.title || current.projectOverview.title,
          description: `<p>${escapeHtml(generated.description || "")}</p>`,
        },
      }))
      setDirty(true)
      setOverviewLoaded(true)
    } catch {
      // Leave existing content in place if generation fails
    }
  }, [isProposalMode, proposal, job])

  useEffect(() => {
    const handler = () => { void generateProposalOverview() }
    window.addEventListener("trigger-ai-proposal", handler)
    return () => window.removeEventListener("trigger-ai-proposal", handler)
  }, [generateProposalOverview])

  const updateDocument = (updater: (current: ProposalDocument) => ProposalDocument) => {
    setDocument((current) => {
      const next = updater(current)
      return next
    })
    setDirty(true)
  }

  const isReadOnly = publicMode || viewMode
  const proposalTheme = getProposalTheme(document.themeId)
  const accentColor = normalizeHexColor(document.accentColor, proposalTheme.swatches[1])
  const tintColor = normalizeHexColor(document.tintColor, proposalTheme.swatches[2])
  const accentTextColor = isLightColor(accentColor) ? "#0f172a" : "#ffffff"
  const proposalFont = getProposalFont(document.fontFamily)

  useEffect(() => {
    ensureGoogleFont(proposalFont.google ?? null)
  }, [proposalFont])
  const canvasStyle = {
    backgroundImage: `radial-gradient(circle at top left, ${withAlpha(accentColor, 0.14)}, transparent 30%), radial-gradient(circle at bottom right, ${withAlpha(tintColor, 0.22)}, transparent 26%), linear-gradient(180deg, #f8fafc 0%, ${withAlpha(tintColor, 0.12)} 100%)`,
  }
  const previewStyle = {
    backgroundImage: `linear-gradient(135deg, ${withAlpha(accentColor, 0.14)}, rgba(255,255,255,0.96) 48%, ${withAlpha(tintColor, 0.22)})`,
  }
  const coverHeaderStyle = {
    backgroundImage: `linear-gradient(135deg, ${withAlpha(accentColor, 0.05)}, rgba(255,255,255,0.99) 52%, ${withAlpha(tintColor, 0.07)})`,
  }
  const pageHeaderStyle = {
    backgroundImage: `linear-gradient(135deg, ${withAlpha(accentColor, 0.08)}, rgba(255,255,255,0.97) 56%, ${withAlpha(tintColor, 0.14)})`,
  }
  const proposalPublicHref = isProposalMode
    ? (proposal?.public_link ? `/${locale}/proposals/${proposal.public_link}` : null)
    : (job?.proposal_public_link ? `/${locale}/proposals/${job.proposal_public_link}` : null)

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
      if (isProposalMode && proposal) {
        const updated = (await api.updateProposal(proposal.project_id, proposal.id, { proposal_document: document })) as Proposal
        onProposalUpdated?.(updated)
        setDirty(false)
        toast({ title: "Proposal saved", description: "Your proposal has been saved." })
      } else if (job) {
        const updatedJob = (await api.updateJob(job.id, { proposal_document: document })) as Job
        onJobUpdated?.(updatedJob)
        setDirty(false)
        toast({
          title: "Proposal saved",
          description: updatedJob.proposal_public_link
            ? "Your proposal is attached to this quote and now has its own share link."
            : "Your proposal document is now attached to this quote.",
        })
      }
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
          title: "",
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
      const uploadJobId = job?.id ?? proposal?.quote_references?.[0]?.job_id
      if (!uploadJobId) throw new Error("No quote to upload media to")
      const uploaded = (await api.uploadQuoteMedia(uploadJobId, Array.from(files))) as ProjectMedia[]
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
    <div className={cn("min-h-screen print:bg-none print:bg-white", proposalTheme.canvasClassName)} style={canvasStyle}>
      <div className={cn(
        "mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-6 print:max-w-none print:px-0 print:py-0 print:gap-0",
        isReadOnly ? "gap-4" : "gap-6",
      )}>
        <div className="flex flex-col gap-4 rounded-[30px] border border-slate-100 bg-white px-5 py-4 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
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

              {!isReadOnly ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select
                    value={proposalTheme.id}
                    onValueChange={(value) => updateDocument((current) => updateProposalTheme(current, value as ProposalThemeId))}
                  >
                    <SelectTrigger size="sm" className="h-8 w-auto min-w-[150px] max-w-[220px] rounded-xl border-slate-200 bg-white text-xs">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      {PROPOSAL_THEMES.map((themeOption) => (
                        <SelectItem key={themeOption.id} value={themeOption.id}>
                          <span className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              {themeOption.swatches.map((swatch) => (
                                <span key={swatch} className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatch }} />
                              ))}
                            </span>
                            <span>{themeOption.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  <Select
                    value={proposalFont.id}
                    onValueChange={(val) => {
                      const font = PROPOSAL_FONTS.find((f) => f.id === val)
                      if (font) ensureGoogleFont(font.google ?? null)
                      updateDocument((current) => ({ ...current, fontFamily: val }))
                    }}
                  >
                    <SelectTrigger size="sm" className="h-8 w-[142px] rounded-xl border-slate-200 bg-white text-xs">
                      <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      {PROPOSAL_FONTS.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          <span style={{ fontFamily: font.stack }}>{font.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex h-8 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Accent</span>
                    <input
                      type="color"
                      value={accentColor}
                      className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                      onChange={(event) => updateDocument((current) => ({ ...current, accentColor: event.target.value }))}
                    />
                  </label>

                  <label className="flex h-8 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tint</span>
                    <input
                      type="color"
                      value={tintColor}
                      className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                      onChange={(event) => updateDocument((current) => ({ ...current, tintColor: event.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {!publicMode || proposalPublicHref ? (
                <div className="flex items-center gap-1">
                  {!publicMode ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                          onClick={() => setViewMode((value) => !value)}
                        >
                          <Eye className="h-[22px] w-[22px]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] px-1.5 py-0.5">
                        {viewMode ? "Edit mode" : "Preview"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {proposalPublicHref && !publicMode ? (
                    <Fragment>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            onClick={() => copyDocumentLink(proposalPublicHref, "Proposal")}
                          >
                            <Copy className="h-[22px] w-[22px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] px-1.5 py-0.5">
                          Copy link
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                            <Link href={proposalPublicHref} target="_blank">
                              <ExternalLink className="h-[22px] w-[22px]" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] px-1.5 py-0.5">
                          Open view
                        </TooltipContent>
                      </Tooltip>
                    </Fragment>
                  ) : null}
                  {!publicMode ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                          onClick={saveProposal}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-[22px] w-[22px] animate-spin" /> : <Save className="h-[22px] w-[22px]" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] px-1.5 py-0.5">
                        Save
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              ) : null}

              {!publicMode ? (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 justify-start rounded-2xl border border-fuchsia-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#f5f3ff_45%,#eef2ff_100%)] px-3 text-slate-900 shadow-[0_10px_30px_-18px_rgba(168,85,247,0.55)] hover:border-fuchsia-300 hover:bg-[linear-gradient(135deg,#ffedd5_0%,#ede9fe_48%,#e0e7ff_100%)]"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-ai-panel-for-proposal"))}
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5 text-fuchsia-500" />
                    Generate AI Proposal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 justify-start rounded-2xl border border-sky-200/80 bg-[linear-gradient(135deg,#fefce8_0%,#ecfeff_42%,#eff6ff_100%)] px-3 text-slate-900 shadow-[0_10px_30px_-18px_rgba(14,165,233,0.45)] hover:border-sky-300 hover:bg-[linear-gradient(135deg,#fef3c7_0%,#cffafe_46%,#dbeafe_100%)]"
                    onClick={() => setShowAIModal(true)}
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5 text-sky-500" />
                    AI Before &amp; After
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Card
          className={cn(
            "gap-0 overflow-hidden rounded-[34px] border py-0 print:rounded-none print:border-none print:shadow-none",
            proposalTheme.coverCardClassName,
          )}
          style={{ fontFamily: proposalFont.stack }}
        >
          <div
            className={cn(
              "border-b px-5 sm:px-6 print:border-b-0 print:px-0",
              isReadOnly ? "py-4 sm:py-4" : "py-4 sm:py-4",
              proposalTheme.coverHeaderClassName,
            )}
            style={coverHeaderStyle}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className={cn("rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em]", proposalTheme.coverPrimaryBadgeClassName)}
                  style={{ backgroundColor: accentColor, color: accentTextColor }}
                >
                  Proposal
                </Badge>
                {document.quoteId ? <Badge className={cn("rounded-full px-3 py-1 text-xs", proposalTheme.coverSecondaryBadgeClassName)}>QUOTE #{document.quoteId}</Badge> : null}
                {isReadOnly ? (
                  <Badge variant="secondary" className={cn("rounded-full px-3 py-1 text-xs", proposalTheme.coverSecondaryBadgeClassName)}>
                    {formatProposalDate(document.date)}
                  </Badge>
                ) : (
                  <label
                    className={cn(
                      "relative inline-flex cursor-pointer items-center overflow-hidden rounded-full px-3 py-1 text-xs",
                      proposalTheme.coverSecondaryBadgeClassName,
                    )}
                    title="Edit proposal date"
                  >
                    <span>{formatProposalDate(document.date)}</span>
                    <input
                      type="date"
                      value={document.date}
                      onChange={(event) => updateDocument((current) => ({ ...current, date: event.target.value }))}
                      aria-label="Proposal date"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                )}
                <Badge variant="secondary" className={cn("rounded-full px-3 py-1 text-xs", proposalTheme.coverSecondaryBadgeClassName)}>{document.contractorName}</Badge>
              </div>

              {isReadOnly ? (
                <h1 className={cn("max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl", proposalTheme.id === "editorial" ? "text-white" : "text-slate-950")}>{document.title}</h1>
              ) : (
                <input
                  value={document.title}
                  onChange={(event) => updateDocument((current) => ({ ...current, title: event.target.value }))}
                  className={cn(
                    "w-full max-w-4xl border-0 border-b-2 border-transparent bg-transparent px-0 rounded-none text-3xl font-semibold tracking-tight shadow-none outline-none transition-colors sm:text-5xl",
                    proposalTheme.id === "editorial"
                      ? "text-white placeholder:text-stone-400 hover:border-white/20 focus:border-white/40"
                      : "text-slate-950 placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-400",
                  )}
                  placeholder="Proposal title"
                />
              )}

              <p className={cn("max-w-3xl text-sm font-medium sm:text-base", proposalTheme.id === "editorial" ? "text-stone-200" : "text-slate-600")}>
                {subtitle || "Link this proposal to a company / property"}
              </p>
            </div>
          </div>

          <div className={cn("space-y-4 px-5 sm:px-6", isReadOnly ? "py-4 sm:py-4" : "py-5 sm:py-6")}>
            {!isReadOnly ? (
              <div className={cn("grid gap-4 rounded-[28px] border p-4 sm:grid-cols-2", proposalTheme.coverMetaPanelClassName)}>
                <ClientNameField
                  value={document.companyName}
                  clients={clients}
                  onChange={(name) => updateDocument((current) => ({ ...current, companyName: name }))}
                  onClientSelect={(selected) => {
                    updateDocument((current) => ({
                      ...current,
                      companyName: selected.name,
                      companyAddress: selected.address || current.companyAddress,
                    }))
                    onProjectClientChanged?.(selected.id)
                  }}
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
              <div className={cn("grid rounded-[28px] border text-sm sm:grid-cols-3", "gap-2.5 p-3", proposalTheme.coverMetaPanelClassName)}>
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.22em]", proposalTheme.id === "editorial" ? "text-stone-400" : "text-slate-400")}>Prepared For</p>
                  <p className={cn("mt-0.5 font-medium", proposalTheme.id === "editorial" ? "text-white" : "text-slate-900")}>{document.companyName || "Client / Property"}</p>
                </div>
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.22em]", proposalTheme.id === "editorial" ? "text-stone-400" : "text-slate-400")}>Address</p>
                  <p className={cn("mt-0.5 font-medium", proposalTheme.id === "editorial" ? "text-white" : "text-slate-900")}>{document.companyAddress || "Not specified"}</p>
                </div>
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.22em]", proposalTheme.id === "editorial" ? "text-stone-400" : "text-slate-400")}>Prepared By</p>
                  <p className={cn("mt-0.5 font-medium", proposalTheme.id === "editorial" ? "text-white" : "text-slate-900")}>{document.contractorName}</p>
                </div>
              </div>
            )}

            <RichTextEditor
              value={document.scopeSummary}
              onChange={(value) => updateDocument((current) => ({ ...current, scopeSummary: value }))}
              readOnly={isReadOnly}
              className={isReadOnly ? "prose-p:mb-0 prose-p:text-[16px] prose-p:leading-8" : proposalTheme.richTextSurfaceClassName}
              toolbarClassName={proposalTheme.richTextToolbarClassName}
              editorClassName={proposalTheme.richTextEditorClassName}
              readOnlyClassName={proposalTheme.readOnlyRichTextClassName}
              placeholder="Add the top-level scope summary for this proposal."
            />
          </div>
        </Card>

        <Card className={cn("rounded-[32px] border", isReadOnly ? "p-4 sm:p-5" : "p-5 sm:p-6", proposalTheme.overviewCardClassName)}>
          <div className={cn(isReadOnly ? "space-y-3" : "space-y-4")}>
            <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px] tracking-[0.24em]", proposalTheme.overviewBadgeClassName)}>
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
              className={!isReadOnly ? proposalTheme.richTextSurfaceClassName : undefined}
              toolbarClassName={proposalTheme.richTextToolbarClassName}
              editorClassName={proposalTheme.richTextEditorClassName}
              readOnlyClassName={proposalTheme.readOnlyRichTextClassName}
              placeholder="Describe the project context and why this work matters."
            />
          </div>
        </Card>

        {document.pages.map((page, pageIndex) => (
          <Card key={page.id} className={cn("overflow-hidden rounded-[32px] border sm:p-0 print:overflow-visible print:border-none print:shadow-none print:rounded-none", proposalTheme.pageCardClassName)}>
            <div className={cn(isReadOnly ? "space-y-4" : "space-y-5")}>
              <div className={cn("border-b px-5 sm:px-6 print:border-b-0 print:bg-none print:px-0 print:py-2", isReadOnly ? "py-2.5" : "py-2.5", proposalTheme.pageHeaderClassName)} style={pageHeaderStyle}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {!isReadOnly ? <GripVertical className="mt-1 h-5 w-5 shrink-0 text-slate-400" /> : null}
                    <div className="min-w-0 flex-1">
                      {isReadOnly ? (
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{page.title || `Untitled page ${pageIndex + 1}`}</h2>
                      ) : (
                        <Input
                          value={page.title}
                          onChange={(event) =>
                            updateDocument((current) =>
                              updatePage(current, page.id, (currentPage) => ({ ...currentPage, title: event.target.value })),
                            )
                          }
                          className="h-auto border-none bg-transparent px-0 py-0 text-2xl font-semibold tracking-tight text-slate-950 shadow-none outline-none placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0"
                          placeholder="Add a page title"
                        />
                      )}
                    </div>
                  </div>

                  {!isReadOnly ? (
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => movePage(page.id, -1)} disabled={pageIndex === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => movePage(page.id, 1)} disabled={pageIndex === document.pages.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() =>
                          updateDocument((current) => ({
                            ...current,
                            pages: current.pages.filter((currentPage) => currentPage.id !== page.id),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={cn("space-y-4 px-5 sm:px-6", isReadOnly ? "py-4 sm:py-4" : "py-5 sm:py-6")}>
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
                        className={proposalTheme.blockSurfaceClassName}
                      />
                    )
                  }

                  if (block.type === "text") {
                    return (
                      <div key={block.id} className={cn("rounded-2xl border p-3", proposalTheme.blockSurfaceClassName)}>
                        {!isReadOnly ? (
                          <div className="mb-2 flex items-center justify-end gap-0.5">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={moveUp} disabled={blockIndex === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={moveDown} disabled={blockIndex === page.description.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={deleteBlock} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
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
                          className={!isReadOnly ? proposalTheme.richTextSurfaceClassName : undefined}
                          toolbarClassName={proposalTheme.richTextToolbarClassName}
                          editorClassName={proposalTheme.richTextEditorClassName}
                          readOnlyClassName={proposalTheme.readOnlyRichTextClassName}
                          placeholder={PAGE_TEXT_PLACEHOLDER}
                        />
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
                      className={proposalTheme.blockSurfaceClassName}
                      onChange={(nextBlock) =>
                        updateDocument((current) => updateBlock(current, page.id, block.id, () => nextBlock))
                      }
                      onDelete={deleteBlock}
                    />
                  )
                })}
              </div>

              {!isReadOnly ? (
                <div className={cn("mx-5 mb-5 flex flex-wrap gap-2 rounded-3xl border border-dashed p-3.5 sm:mx-6 sm:mb-6", proposalTheme.addActionsClassName)}>
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
              jobId={job?.id ?? proposal?.quote_references?.[0]?.job_id ?? 0}
              lineItems={(job?.items ?? []).map((item: JobItem) => ({
                title: item.title,
                description: item.custom_description,
                quantity: item.quantity,
                unitOfMeasure: item.unit_of_measure,
              }))}
              jobDescription={job?.job_description || job?.description || ""}
              jobTitle={job?.title || project?.title || ""}
              imagePairs={imagePairs}
              onImagePairsChange={setImagePairs}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
