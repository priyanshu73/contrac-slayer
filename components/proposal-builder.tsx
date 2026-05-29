"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, ChevronDown, ChevronsUpDown, Copy, ExternalLink, Eye, FileImage, GripVertical, Heading2, ImagePlus, Italic, List, ListOrdered, Loader2, MoveDown, MoveUp, Paintbrush, PencilLine, Plus, RemoveFormatting, Save, Send, Sparkles, Strikethrough, Trash2, Type, Underline, Undo2, User, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { BeforeAfterPanel, type BeforeAfterImagePair } from "@/components/before-after-panel"
import { api, contractorAI, type ScopeClarifiedScope } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"
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
const AI_PROPOSAL_LOADING_MESSAGES = [
  "Reviewing project context and linked quote details...",
  "Drafting a client-friendly scope and story...",
  "Organizing the proposal pages and flow...",
  "Polishing the final proposal copy...",
] as const

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

function syncProposalDocumentClient(
  document: ProposalDocument,
  client?: Client,
): ProposalDocument {
  if (!client) return document

  const nextCompanyName = client.name || document.companyName
  const nextCompanyAddress = client.address || document.companyAddress
  const oldGeneratedTitle = document.companyName ? `Proposal for ${document.companyName}` : ""
  const nextTitle =
    !document.title || document.title === oldGeneratedTitle
      ? `Proposal for ${nextCompanyName}`
      : document.title

  return {
    ...document,
    title: nextTitle,
    companyName: nextCompanyName,
    companyAddress: nextCompanyAddress,
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
  portalUrl,
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
  /** Client portal URL — shown as a link in the header when in public mode. */
  portalUrl?: string
}) {
  const isProposalMode = !!proposal
  const { toast } = useToast()
  const { user } = useAuth()
  const { number: contractorOpsAiNumber } = useContractorOpsNumber()
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
  const [aiProposalLoading, setAiProposalLoading] = useState(false)
  const [aiProposalLoadingStage, setAiProposalLoadingStage] = useState(0)
  const [aiProposalLoadingProgress, setAiProposalLoadingProgress] = useState(0)
  const [showAIModal, setShowAIModal] = useState(false)
  const [sendEmailOpen, setSendEmailOpen] = useState(false)
  const [sendEmailTo, setSendEmailTo] = useState("")
  const [sendEmailSending, setSendEmailSending] = useState(false)
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false)
  const [sentToEmail, setSentToEmail] = useState("")
  const [optionalNote, setOptionalNote] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [proposalShareUrl, setProposalShareUrl] = useState<string | null>(null)
  const [sendClient, setSendClient] = useState<Client | null>(client ?? null)
  const [imagePairs, setImagePairs] = useState<BeforeAfterImagePair[]>(() =>
    buildBeforeAfterPairsFromMedia(
      isProposalMode ? (project?.media ?? []) : (job?.project_media ?? [])
    )
  )
  const [imagePickerPageId, setImagePickerPageId] = useState<string | null>(null)
  const pageUploadRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (client) setSendClient(client)
  }, [client])

  useEffect(() => {
    if (!aiProposalLoading) {
      setAiProposalLoadingStage(0)
      setAiProposalLoadingProgress(0)
      return
    }

    setAiProposalLoadingStage(0)
    setAiProposalLoadingProgress(8)
    const started = Date.now()
    const rotate = window.setInterval(() => {
      setAiProposalLoadingStage((prev) => (prev + 1) % AI_PROPOSAL_LOADING_MESSAGES.length)
    }, 2400)
    const progress = window.setInterval(() => {
      const elapsed = Date.now() - started
      setAiProposalLoadingProgress(Math.min(94, 8 + (elapsed / 180_000) * 86))
    }, 400)

    return () => {
      window.clearInterval(rotate)
      window.clearInterval(progress)
    }
  }, [aiProposalLoading])

  // Resolve client phone/email for send actions (contractor builder only)
  useEffect(() => {
    if (publicMode) return

    const clientId =
      project?.client_id ?? proposal?.client_id ?? job?.client_id ?? client?.id ?? null

    setSendClient(null)

    const jobClient = job?.client as Client | undefined
    if (jobClient && (!clientId || jobClient.id === clientId)) {
      if (jobClient.phone?.trim() || jobClient.email?.trim()) {
        setSendClient(jobClient)
        return
      }
    }

    if (client?.id && (!clientId || client.id === clientId) && (client.phone?.trim() || client.email?.trim())) {
      setSendClient(client)
      return
    }

    if (clientId && clients?.length) {
      const fromList = clients.find((c) => c.id === clientId)
      if (fromList && (fromList.phone?.trim() || fromList.email?.trim())) {
        setSendClient(fromList)
        return
      }
    }

    if (!clientId) return

    let cancelled = false
    api
      .getClient(clientId)
      .then((data) => {
        if (!cancelled) setSendClient(data as Client)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [
    proposal?.client_id,
    project?.client_id,
    job?.client_id,
    job?.client,
    client,
    clients,
    publicMode,
  ])

  // Sync proposal context to window so AgentChatPanel can read it
  useEffect(() => {
    const ctx = {
      proposalTitle: document.title || proposal?.title || "",
      projectTitle: project?.title || "",
      description: project?.objective || job?.job_description || "",
      projectBrief: project?.brief || null,
      includeProjectBriefInContext: true,
      includeLineItemsInContext: true,
      projectId: proposal?.project_id ?? null,
      proposalId: proposal?.id ?? null,
      clientId: project?.client_id ?? proposal?.client_id ?? client?.id ?? null,
      clientEmail: sendClient?.email ?? client?.email ?? null,
      clientPhone: sendClient?.phone ?? client?.phone ?? null,
      jobId: job?.id ?? proposal?.quote_references?.[0]?.job_id ?? null,
      lineItems: (job?.items ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? "",
        description: item.custom_description ?? "",
      })),
    }
    ;(window as any).proposalBuilderContext = ctx
    window.dispatchEvent(new CustomEvent("proposal-context-updated", { detail: ctx }))
  }, [
    document.title,
    proposal?.title,
    project?.title,
    document.projectOverview?.title,
    project?.objective,
    job?.job_description,
    project?.brief,
    proposal?.project_id,
    proposal?.id,
    project?.client_id,
    proposal?.client_id,
    sendClient?.email,
    sendClient?.phone,
    client?.id,
    client?.email,
    client?.phone,
    job?.id,
    proposal?.quote_references,
  ])

  useEffect(() => {
    if (isProposalMode && proposal) {
      const initialDocument = buildInitialProposalDocument(
        { proposal_document: proposal.proposal_document, id: proposal.id, title: proposal.title ?? "" } as any,
        contractorName,
        client
      )
      setDocument(proposal.project_id ? syncProposalDocumentClient(initialDocument, client) : initialDocument)
    } else if (job) {
      setDocument(buildInitialProposalDocument(job, contractorName))
    }
    setDirty(false)
    setOverviewLoaded(false)
  }, [contractorName, isProposalMode, job, proposal, publicMode, client])

  useEffect(() => {
    if (!isProposalMode || !proposal?.project_id || !client) return
    updateDocument((current) => syncProposalDocumentClient(current, client))
  }, [client, isProposalMode, proposal?.project_id])

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
        const generated = isProposalMode && proposal && proposal.project_id
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

  const generateFullProposal = useCallback(async (opts?: {
    clarifiedScope?: ScopeClarifiedScope | null
    proposalTitle?: string
    projectTitle?: string
    description?: string
    includeProjectBriefInContext?: boolean
    includeLineItemsInContext?: boolean
    selectedItemIds?: number[]
  }) => {
    if (aiProposalLoading) return

    setAiProposalLoading(true)
    window.dispatchEvent(new CustomEvent("ai-generation-status", {
      detail: {
        kind: "proposal",
        phase: "running",
        title: "Generating AI proposal",
        detail: "Reviewing scope, project context, and proposal structure.",
      },
    }))
    try {
      const description = opts?.description?.trim() || project?.objective || job?.job_description || job?.description || undefined
      const generated = isProposalMode && proposal && proposal.project_id
        ? await api.generateAIProposalForProject(proposal.project_id, proposal.id, {
            description,
            job_id: proposal.quote_references?.[0]?.job_id ?? undefined,
            selected_item_ids: opts?.includeLineItemsInContext === false ? [] : opts?.selectedItemIds,
            clarified_scope: opts?.clarifiedScope ?? null,
            proposal_title: opts?.proposalTitle?.trim() || undefined,
            project_title: opts?.projectTitle?.trim() || undefined,
            include_project_brief: opts?.includeProjectBriefInContext ?? true,
            include_line_items: opts?.includeLineItemsInContext ?? true,
          })
        : await api.generateAIProposal(
            job!.id,
            description,
            opts?.includeLineItemsInContext === false ? [] : opts?.selectedItemIds,
            {
              proposal_title: opts?.proposalTitle?.trim() || undefined,
              project_title: opts?.projectTitle?.trim() || undefined,
              include_project_brief: opts?.includeProjectBriefInContext ?? true,
              include_line_items: opts?.includeLineItemsInContext ?? true,
            }
          )

      const beforeAfterQueue = [...(generated.before_after_pairs ?? [])]
      const generatedPages: ProposalPage[] = (generated.pages ?? []).map((page) => {
        const description = page.blocks.flatMap((block): ProposalPageBlock[] => {
          if (block.type === "before_after_placeholder") {
            const pair = beforeAfterQueue.shift()
            if (!pair?.before_url || !pair?.after_url) return []
            return [{
              id: createId("before-after"),
              type: "before_after",
              beforeUrl: pair.before_url,
              afterUrl: pair.after_url,
              beforeLabel: "Before",
              afterLabel: "After",
            }]
          }

          return [createTextBlock(block.content_html ?? "")]
        })

        return {
          id: createId("page"),
          title: page.title,
          description,
        }
      })

      setDocument((current) => {
        const withTheme =
          generated.suggested_theme
            ? updateProposalTheme(current, normalizeProposalThemeId(generated.suggested_theme))
            : current

        return {
          ...withTheme,
          scopeSummary: generated.scope_summary_html || withTheme.scopeSummary,
          projectOverview: {
            title: generated.project_overview_title || withTheme.projectOverview.title,
            description: generated.project_overview_html || withTheme.projectOverview.description,
          },
          pages: generatedPages.length > 0 ? generatedPages : withTheme.pages,
        }
      })
      setDirty(true)
      setOverviewLoaded(true)
      window.dispatchEvent(new CustomEvent("ai-generation-status", {
        detail: {
          kind: "proposal",
          phase: "succeeded",
          title: "Proposal ready",
          detail: "The AI draft has been added to the builder. Review and save when you're ready.",
        },
      }))
      toast({
        title: "Proposal generated",
        description: "AI drafted the proposal pages. Review and save when you're ready.",
      })
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent("ai-generation-status", {
        detail: {
          kind: "proposal",
          phase: "failed",
          title: "Proposal generation failed",
          detail: error?.message || "The AI returned an unexpected response. Please try again.",
        },
      }))
      toast({
        title: "Generation failed",
        description: error?.message || "Unable to generate the proposal right now.",
        variant: "destructive",
      })
    } finally {
      setAiProposalLoading(false)
    }
  }, [aiProposalLoading, isProposalMode, proposal, project?.objective, job, toast])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        clarifiedScope?: ScopeClarifiedScope | null
        proposalTitle?: string
        projectTitle?: string
        description?: string
        includeProjectBriefInContext?: boolean
        includeLineItemsInContext?: boolean
        selectedItemIds?: number[]
      } | undefined
      void generateFullProposal(detail)
    }
    window.addEventListener("trigger-ai-proposal", handler)
    return () => window.removeEventListener("trigger-ai-proposal", handler)
  }, [generateFullProposal])

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
  const proposalTitle =
    document.title || proposal?.title || job?.title || project?.title || "your project"
  const clientEmail = sendClient?.email ?? job?.client?.email ?? client?.email ?? ""
  const clientPhone = sendClient?.phone ?? job?.client?.phone ?? client?.phone ?? ""
  const clientName = sendClient?.name ?? job?.client?.name ?? client?.name ?? "Customer"
  const emailSubject = `Your proposal for ${proposalTitle} from ${contractorName}`

  const getProposalShareUrl = () => {
    if (proposalShareUrl) return proposalShareUrl
    const publicLink = isProposalMode ? proposal?.public_link : job?.proposal_public_link
    if (!publicLink || typeof window === "undefined") return ""
    return `${window.location.origin}/${locale}/proposals/${publicLink}`
  }

  const ensureProposalShareLink = async (): Promise<string | null> => {
    const existing = getProposalShareUrl()
    if (existing) return existing

    try {
      setGeneratingLink(true)
      if (isProposalMode && proposal) {
        const updated = (await persistProposal(proposal, {
          proposal_document: document,
        })) as Proposal
        onProposalUpdated?.(updated)
        if (!updated.public_link) {
          toast({
            title: "No share link",
            description: "Save the proposal first, then try again.",
            variant: "destructive",
          })
          return null
        }
        const url =
          typeof window !== "undefined"
            ? `${window.location.origin}/${locale}/proposals/${updated.public_link}`
            : `/${locale}/proposals/${updated.public_link}`
        setProposalShareUrl(url)
        return url
      }
      if (job) {
        const updated = (await api.updateJob(job.id, { proposal_document: document })) as Job
        onJobUpdated?.(updated)
        const link = updated.proposal_public_link
        if (!link) {
          toast({
            title: "No share link",
            description: "Save the proposal first, then try again.",
            variant: "destructive",
          })
          return null
        }
        const url =
          typeof window !== "undefined"
            ? `${window.location.origin}/${locale}/proposals/${link}`
            : `/${locale}/proposals/${link}`
        setProposalShareUrl(url)
        return url
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to prepare proposal link.",
        variant: "destructive",
      })
      return null
    } finally {
      setGeneratingLink(false)
    }
    return null
  }

  const handleSendToClient = async () => {
    try {
      const url = await ensureProposalShareLink()
      if (!url) return

      const gmail = await api.getGmailStatus()
      if (!gmail.connected) {
        toast({
          title: "Gmail not connected",
          description: (
            <>
              Connect Gmail in{" "}
              <Link href={`/${locale}/settings`} className="underline font-medium">
                Settings → Integrations
              </Link>{" "}
              to send the proposal from your inbox.
            </>
          ),
          variant: "destructive",
        })
        return
      }

      setSendEmailTo(clientEmail)
      setSendEmailSuccess(false)
      setSentToEmail("")
      setOptionalNote("")
      setCopiedLink(false)
      setSendEmailOpen(true)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to prepare email.",
        variant: "destructive",
      })
    }
  }

  const handleSendProposalEmail = async () => {
    const to = sendEmailTo.trim()
    if (!to) {
      toast({ title: "Enter email", description: "Please enter the client's email address.", variant: "destructive" })
      return
    }
    const proposalUrl = await ensureProposalShareLink()
    if (!proposalUrl) return

    setSendEmailSending(true)
    try {
      if (isProposalMode && proposal && proposal.project_id) {
        await api.sendProposalEmail(proposal.project_id, proposal.id, to, proposalUrl)
      } else if (job) {
        await api.sendQuoteEmail(job.id, to, proposalUrl)
      }
      setSentToEmail(to)
      setSendEmailSuccess(true)
      toast({ title: "Proposal sent", description: `Sent to ${to}.` })
    } catch (err: any) {
      const msg = err?.message ?? ""
      const isInvalidTo = /invalid to header|invalid email|valid email address/i.test(msg)
      toast({
        title: "Send failed",
        description: isInvalidTo
          ? "Please enter a valid email address in the To field and try again."
          : msg || "Failed to send email.",
        variant: "destructive",
      })
    } finally {
      setSendEmailSending(false)
    }
  }

  const handleSendViaSms = async () => {
    if (!user?.contractor_profile?.contractor_ai_sp_id) {
      toast({
        title: "SMS not available",
        description: "Contractor AI integration is not set up. Connect it in settings to send via SMS.",
        variant: "destructive",
      })
      return
    }
    if (!contractorOpsAiNumber?.trim()) {
      toast({
        title: "Contractor Ops AI number required",
        description: "Set up your Contractor Ops AI number in Settings → Integrations to send via SMS.",
        variant: "destructive",
      })
      return
    }
    if (!clientPhone) {
      toast({
        title: "No phone number",
        description: "Add a phone number for this client to send the proposal via SMS.",
        variant: "destructive",
      })
      return
    }

    let shareUrl = getProposalShareUrl()
    if (!shareUrl) {
      shareUrl = (await ensureProposalShareLink()) ?? ""
    }
    if (!shareUrl) return

    const refJobId = job?.id ?? proposal?.quote_references?.[0]?.job_id ?? 0
    try {
      const message = `Hi ${clientName}, your documents are ready. View them here: ${shareUrl}`
      await contractorAI.sendImmediateSms({
        sp_id: user.contractor_profile.contractor_ai_sp_id,
        customer_number: clientPhone,
        message_text: message,
        reference_type: "job",
        reference_id: refJobId,
      })
      toast({ title: "SMS sent", description: `Proposal link sent to ${clientName}.` })
    } catch {
      toast({
        title: "Send failed",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyProposalLink = async () => {
    let url = getProposalShareUrl()
    if (!url) {
      url = (await ensureProposalShareLink()) ?? ""
      if (!url) return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      toast({ title: "Link copied", description: "Proposal link copied to clipboard." })
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast({ title: "Failed to copy", description: "Please try again or copy manually.", variant: "destructive" })
    }
  }

  const sendViaSmsDisabled =
    !user?.contractor_profile?.contractor_ai_sp_id ||
    !contractorOpsAiNumber?.trim() ||
    !clientPhone
  const inlineActionButtonClass =
    "h-8 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"

  const persistProposal = (p: Proposal, data: Parameters<typeof api.updateProposal>[2]) =>
    p.project_id
      ? api.updateProposal(p.project_id, p.id, data)
      : api.updateStandaloneProposal(p.id, data)

  const saveProposal = async () => {
    setSaving(true)
    try {
      if (isProposalMode && proposal) {
        const updated = (await persistProposal(proposal, { proposal_document: document })) as Proposal
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
              {publicMode && portalUrl && (
                <a
                  href={portalUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  My Portal
                </a>
              )}
              {!publicMode ? (
                <div className="flex items-center gap-1">
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
                </div>
              ) : null}

      {!publicMode ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" className={inlineActionButtonClass}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send to Client
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                      <DropdownMenuItem
                        onClick={() => void handleSendToClient()}
                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none cursor-pointer"
                      >
                        <svg className="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleSendViaSms()}
                        disabled={sendViaSmsDisabled}
                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none cursor-pointer"
                      >
                        <svg className="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Send via SMS
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem
                        onClick={() => void handleCopyProposalLink()}
                        disabled={generatingLink}
                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none cursor-pointer"
                      >
                        {copiedLink ? (
                          <Check className="mr-2 h-4 w-4 text-slate-500" />
                        ) : generatingLink ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4 text-slate-500" />
                        )}
                        {copiedLink
                          ? "Copied!"
                          : getProposalShareUrl()
                            ? "Copy proposal link"
                            : "Generate & copy proposal link"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 justify-start rounded-2xl border border-fuchsia-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#f5f3ff_45%,#eef2ff_100%)] px-3 text-slate-900 shadow-[0_10px_30px_-18px_rgba(168,85,247,0.55)] hover:border-fuchsia-300 hover:bg-[linear-gradient(135deg,#ffedd5_0%,#ede9fe_48%,#e0e7ff_100%)]"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-ai-panel-for-proposal"))}
                    disabled={aiProposalLoading}
                  >
                    {aiProposalLoading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-fuchsia-500" />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5 text-fuchsia-500" />
                    )}
                    {aiProposalLoading ? "Generating..." : "Generate AI Proposal"}
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

        {aiProposalLoading ? (
          <div className="rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.95),rgba(255,255,255,0.98),rgba(238,242,255,0.96))] px-5 py-4 shadow-[0_18px_45px_-28px_rgba(124,58,237,0.45)] print:hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  Generating your AI proposal
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {AI_PROPOSAL_LOADING_MESSAGES[aiProposalLoadingStage]}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-700">
                Drafting pages and narrative
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#ec4899)] transition-all duration-500 ease-out"
                style={{ width: `${aiProposalLoadingProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              The builder will update automatically when the draft is ready.
            </p>
          </div>
        ) : null}

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
                    if (isReadOnly) {
                      return (
                        <RichTextEditor
                          key={block.id}
                          value={block.html}
                          onChange={(value) =>
                            updateDocument((current) =>
                              updateBlock(current, page.id, block.id, () => ({ ...block, html: value })),
                            )
                          }
                          readOnly
                          readOnlyClassName={proposalTheme.readOnlyRichTextClassName}
                          placeholder={PAGE_TEXT_PLACEHOLDER}
                        />
                      )
                    }
                    return (
                      <div key={block.id} className={cn("rounded-2xl border p-3", proposalTheme.blockSurfaceClassName)}>
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
                        <RichTextEditor
                          value={block.html}
                          onChange={(value) =>
                            updateDocument((current) =>
                              updateBlock(current, page.id, block.id, () => ({ ...block, html: value })),
                            )
                          }
                          readOnly={false}
                          className={proposalTheme.richTextSurfaceClassName}
                          toolbarClassName={proposalTheme.richTextToolbarClassName}
                          editorClassName={proposalTheme.richTextEditorClassName}
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

      <Dialog
        open={sendEmailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendEmailSuccess(false)
            setOptionalNote("")
          }
          setSendEmailOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-xl shadow-xl rounded-xl p-6" showCloseButton>
          {sendEmailSuccess ? (
            <div className="py-2">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <Check className="h-5 w-5 shrink-0" />
                  Proposal sent to {sentToEmail}
                </DialogTitle>
                <DialogDescription>
                  Your client will receive the email from your Gmail with a link to view the proposal.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2"
                  onClick={async () => {
                    const url = getProposalShareUrl()
                    if (url) {
                      await navigator.clipboard.writeText(url)
                      setCopiedLink(true)
                      toast({ title: "Link copied" })
                      setTimeout(() => setCopiedLink(false), 2000)
                    }
                  }}
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? "Copied!" : "Copy share link"}
                </Button>
                <Button className="w-full" onClick={() => setSendEmailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-semibold">Review &amp; Send Proposal</DialogTitle>
              </DialogHeader>

              <div className="space-y-0 border-t">
                <div className="flex items-center gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0">From</span>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <span className="truncate text-sm font-medium">{contractorName} (me)</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex items-start gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0 pt-2.5">To</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      id="send-proposal-email-to"
                      type="email"
                      placeholder="Enter client email address"
                      value={sendEmailTo}
                      onChange={(e) => setSendEmailTo(e.target.value)}
                      className="min-h-11 w-full px-3 py-2.5 text-base"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0">Subject</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground" title={emailSubject}>
                    {emailSubject}
                  </p>
                </div>

                <div className="flex gap-3 py-3 px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0 pt-2.5" />
                  <textarea
                    placeholder="Add a short message (optional)"
                    value={optionalNote}
                    onChange={(e) => setOptionalNote(e.target.value)}
                    className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    rows={3}
                  />
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 mx-1 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">What your client will receive</p>
                  <div className="rounded-md border bg-background p-3 text-left space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Hi{clientName ? ` ${String(clientName).split(" ")[0]}` : ""},
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contractorName} has prepared a proposal for{" "}
                      <strong className="text-foreground">{proposalTitle}</strong>.
                    </p>
                    <div className="py-1">
                      <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                        View Proposal
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setSendEmailOpen(false)}
                  disabled={sendEmailSending}
                  className="order-2 sm:order-1 text-muted-foreground"
                >
                  Discard
                </Button>
                <Button
                  onClick={() => void handleSendProposalEmail()}
                  disabled={
                    sendEmailSending ||
                    !sendEmailTo.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendEmailTo.trim())
                  }
                  className="order-1 sm:order-2 text-base font-medium gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendEmailSending ? "Sending…" : "Send Proposal"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
