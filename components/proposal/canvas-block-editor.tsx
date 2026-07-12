"use client"

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowUpRight,
  Bold,
  BringToFront,
  Circle,
  Copy,
  ImagePlus,
  Italic,
  Layers,
  Loader2,
  Minus,
  MousePointer2,
  PencilLine,
  SendToBack,
  Square,
  Trash2,
  Type,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createId } from "@/components/proposal/utils"
import type {
  ProposalAnnotationPoint,
  ProposalCanvasArrowElement,
  ProposalCanvasBlock,
  ProposalCanvasDrawElement,
  ProposalCanvasElement,
  ProposalCanvasImageElement,
  ProposalCanvasShapeElement,
  ProposalCanvasTextElement,
  ProposalImageBlock,
} from "@/lib/types"

/** Minimum normalized size for any element box (keeps handles grabbable). */
const MIN_SIZE = 0.03

/** Minimum canvas design dimensions (also used by the corner drag handle). */
const MIN_CANVAS_WIDTH = 240
const MIN_CANVAS_HEIGHT = 160

export type CanvasUploadResult = {
  url: string
  media_id?: number
  file_name?: string
  width: number
  height: number
}

type CanvasTool = "select" | "text" | "rect" | "ellipse" | "arrow" | "draw"

type Point = ProposalAnnotationPoint

// ---------------------------------------------------------------------------
// Legacy migration: turn a single-image ProposalImageBlock into a canvas block.
// Legacy annotations/overlays are already normalized to the whole image box, so
// they map straight into canvas space as individual elements.
// ---------------------------------------------------------------------------

function pointsBounds(points: Point[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    w: Math.max(MIN_SIZE, maxX - minX),
    h: Math.max(MIN_SIZE, maxY - minY),
  }
}

/** Map absolute canvas points into points relative (0–1) to a box. */
function toRelative(points: Point[], box: { x: number; y: number; w: number; h: number }): Point[] {
  return points.map((p) => ({
    x: box.w > 0 ? (p.x - box.x) / box.w : 0.5,
    y: box.h > 0 ? (p.y - box.y) / box.h : 0.5,
  }))
}

export function imageBlockToCanvas(block: ProposalImageBlock): ProposalCanvasBlock {
  let z = 0
  const elements: ProposalCanvasElement[] = []

  // The base image fills the whole canvas.
  elements.push({
    id: createId("el"),
    kind: "image",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    z: z++,
    url: block.url,
    media_id: block.media_id,
    file_name: block.file_name,
    objectFit: "contain",
  })

  for (const ann of block.annotations ?? []) {
    if (!ann.type || ann.type === "stroke") {
      const box = pointsBounds(ann.points)
      elements.push({
        id: createId("el"),
        kind: "draw",
        ...box,
        z: z++,
        points: toRelative(ann.points, box),
        color: ann.color,
        width: ann.width,
      })
    } else if (ann.type === "arrow" || ann.type === "measurement") {
      const box = pointsBounds([ann.start, ann.end])
      elements.push({
        id: createId("el"),
        kind: "arrow",
        ...box,
        z: z++,
        points: toRelative([ann.start, ann.end], box) as [Point, Point],
        variant: ann.type === "measurement" ? "line" : "arrow",
        color: ann.color,
        width: ann.width,
      })
      if (ann.type === "measurement" && ann.label?.trim()) {
        elements.push({
          id: createId("el"),
          kind: "text",
          x: box.x,
          y: Math.max(0, box.y - 0.06),
          w: Math.max(0.2, box.w),
          h: 0.06,
          z: z++,
          text: ann.label,
          fontSize: 16,
          color: ann.color,
          bold: true,
          align: "center",
        })
      }
    } else if (ann.type === "rect" || ann.type === "ellipse" || ann.type === "highlight") {
      elements.push({
        id: createId("el"),
        kind: "shape",
        x: ann.x,
        y: ann.y,
        w: Math.max(MIN_SIZE, ann.w),
        h: Math.max(MIN_SIZE, ann.h),
        z: z++,
        shape: ann.type === "ellipse" ? "ellipse" : "rect",
        stroke: ann.color,
        strokeWidth: ann.width,
        fill: ann.type === "highlight" ? ann.fill ?? ann.color : null,
        fillOpacity: ann.type === "highlight" ? ann.opacity ?? 0.28 : undefined,
      })
    }
  }

  for (const overlay of block.textOverlays ?? []) {
    const estW = Math.min(0.7, Math.max(0.2, (overlay.text.length * overlay.fontSize * 0.55) / block.width))
    const estH = Math.min(0.5, Math.max(0.05, (overlay.fontSize * 1.6) / block.height))
    elements.push({
      id: createId("el"),
      kind: "text",
      x: Math.min(1 - estW, Math.max(0, overlay.x - estW / 2)),
      y: Math.min(1 - estH, Math.max(0, overlay.y - estH / 2)),
      w: estW,
      h: estH,
      z: z++,
      text: overlay.text,
      fontSize: overlay.fontSize,
      color: overlay.color,
      bold: overlay.bold,
      align: "center",
      background: "rgba(15, 23, 42, 0.55)",
    })
  }

  return {
    id: block.id,
    type: "canvas",
    width: block.width,
    height: block.height,
    alignment: block.alignment,
    background: "#ffffff",
    elements,
    caption: block.caption,
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function boxFromDrag(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  }
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

function nextZ(elements: ProposalCanvasElement[]) {
  return elements.reduce((max, el) => Math.max(max, el.z), 0) + 1
}

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const
type Handle = (typeof HANDLES)[number]

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
}

const HANDLE_POS: Record<Handle, { left: string; top: string }> = {
  nw: { left: "0%", top: "0%" },
  n: { left: "50%", top: "0%" },
  ne: { left: "100%", top: "0%" },
  e: { left: "100%", top: "50%" },
  se: { left: "100%", top: "100%" },
  s: { left: "50%", top: "100%" },
  sw: { left: "0%", top: "100%" },
  w: { left: "0%", top: "50%" },
}

// ---------------------------------------------------------------------------
// Element visual renderers (used in both edit and read-only modes)
// ---------------------------------------------------------------------------

function ElementVisual({
  el,
  W,
  H,
  scale,
}: {
  el: ProposalCanvasElement
  W: number
  H: number
  scale: number
}) {
  if (el.kind === "image") {
    return (
      <img
        src={el.url}
        alt={el.file_name || "Canvas image"}
        draggable={false}
        className="pointer-events-none h-full w-full select-none"
        style={{ objectFit: el.objectFit ?? "cover", borderRadius: el.radius ? `${el.radius}px` : undefined }}
        onDragStart={(e) => e.preventDefault()}
      />
    )
  }

  if (el.kind === "text") {
    return (
      <div
        className="pointer-events-none flex h-full w-full select-none overflow-hidden whitespace-pre-wrap break-words px-1 py-0.5"
        style={{
          color: el.color,
          fontSize: `${el.fontSize * scale}px`,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          textAlign: el.align ?? "left",
          justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
          alignItems: "flex-start",
          lineHeight: 1.25,
          backgroundColor: el.background || undefined,
          borderRadius: el.background ? "6px" : undefined,
        }}
      >
        {el.text}
      </div>
    )
  }

  // Shapes / arrows / draw are drawn in ABSOLUTE canvas coordinates (el.x*W …),
  // so their SVG must span the whole canvas, not just this element's box. We size
  // the SVG to the full canvas by inverting the parent box's offset/scale — that
  // keeps coordinates absolute (matching the flattened raster) and, crucially,
  // stops a freehand stroke from drifting as its bounding box grows mid-draw.
  return (
    <svg
      className="pointer-events-none absolute"
      style={fullCanvasOverlayStyle(el)}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <ElementSvg el={el} W={W} H={H} />
    </svg>
  )
}

/**
 * Positions a per-element SVG so it covers the whole canvas even though it lives
 * inside the element's box div — by inverting the box's offset and scale. Lets
 * the SVG use absolute canvas coordinates (matching the rasterizer).
 */
function fullCanvasOverlayStyle(el: ProposalCanvasElement): React.CSSProperties {
  const w = el.w || MIN_SIZE
  const h = el.h || MIN_SIZE
  return {
    left: `${(-el.x / w) * 100}%`,
    top: `${(-el.y / h) * 100}%`,
    width: `${(1 / w) * 100}%`,
    height: `${(1 / h) * 100}%`,
    overflow: "visible",
  }
}

function ElementSvg({ el, W, H }: { el: ProposalCanvasElement; W: number; H: number }) {
  const arrowMarkerPrefix = useId().replace(/:/g, "")

  if (el.kind === "shape") {
    const x = el.x * W
    const y = el.y * H
    const w = el.w * W
    const h = el.h * H
    if (el.shape === "ellipse") {
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={el.fill || "none"}
          fillOpacity={el.fill ? el.fillOpacity ?? 1 : undefined}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
      )
    }
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={el.radius ?? 0}
        fill={el.fill || "none"}
        fillOpacity={el.fill ? el.fillOpacity ?? 1 : undefined}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        strokeLinejoin="round"
      />
    )
  }

  if (el.kind === "arrow") {
    const [p0, p1] = el.points
    const x1 = (el.x + p0.x * el.w) * W
    const y1 = (el.y + p0.y * el.h) * H
    const x2 = (el.x + p1.x * el.w) * W
    const y2 = (el.y + p1.y * el.h) * H
    const markerId = `${arrowMarkerPrefix}-${el.id}`
    return (
      <g>
        {el.variant !== "line" ? (
          <defs>
            <marker id={markerId} markerWidth="4" markerHeight="4" refX="3.6" refY="2" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 4 2 L 0 4 z" fill={el.color} />
            </marker>
          </defs>
        ) : null}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={el.color}
          strokeWidth={el.width}
          strokeLinecap="round"
          markerEnd={el.variant !== "line" ? `url(#${markerId})` : undefined}
        />
      </g>
    )
  }

  if (el.kind !== "draw") return null

  const d = el.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(el.x + p.x * el.w) * W} ${(el.y + p.y * el.h) * H}`)
    .join(" ")
  return <path d={d} fill="none" stroke={el.color} strokeWidth={el.width} strokeLinecap="round" strokeLinejoin="round" />
}

/** Transparent, easy-to-hit target for selecting an element in the editor. */
function ElementHitTarget({
  el,
  W,
  H,
  onPointerDown,
}: {
  el: ProposalCanvasElement
  W: number
  H: number
  onPointerDown: (event: React.PointerEvent) => void
}) {
  if (el.kind === "arrow") {
    const [p0, p1] = el.points
    return (
      <svg className="absolute" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={fullCanvasOverlayStyle(el)}>
        <line
          x1={(el.x + p0.x * el.w) * W}
          y1={(el.y + p0.y * el.h) * H}
          x2={(el.x + p1.x * el.w) * W}
          y2={(el.y + p1.y * el.h) * H}
          stroke="transparent"
          strokeWidth={Math.max(el.width + 16, 20)}
          strokeLinecap="round"
          className="cursor-move"
          style={{ pointerEvents: "stroke" }}
          onPointerDown={onPointerDown}
        />
      </svg>
    )
  }

  if (el.kind === "draw") {
    const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${(el.x + p.x * el.w) * W} ${(el.y + p.y * el.h) * H}`).join(" ")
    return (
      <svg className="absolute" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={fullCanvasOverlayStyle(el)}>
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(el.width + 16, 20)}
          strokeLinecap="round"
          className="cursor-move"
          style={{ pointerEvents: "stroke" }}
          onPointerDown={onPointerDown}
        />
      </svg>
    )
  }

  // Box kinds: full-frame hit target.
  return <div className="absolute inset-0 cursor-move" onPointerDown={onPointerDown} />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Interaction =
  | { mode: "create-box"; tool: "rect" | "ellipse" | "arrow"; start: Point; cur: Point }
  | { mode: "create-draw"; points: Point[] }
  | { mode: "move"; id: string; startBox: { x: number; y: number; w: number; h: number }; startPointer: Point }
  | {
      mode: "resize"
      id: string
      handle: Handle
      start: { left: number; right: number; top: number; bottom: number }
    }
  | { mode: "resize-block"; pointerId: number; startX: number; startY: number; width: number; height: number }

/**
 * Numeric size input that buffers keystrokes locally and commits on blur/Enter,
 * so intermediate values below the minimum don't fight the user while typing.
 * Text input (not `type="number"`) with a numeric keypad, per app convention.
 */
function DimensionInput({
  label,
  value,
  min,
  onCommit,
}: {
  label: string
  value: number
  min: number
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number.parseInt(text.replace(/[^0-9]/g, ""), 10)
    const next = Number.isFinite(parsed) ? Math.max(min, parsed) : value
    onCommit(next)
    setText(String(next))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
      }}
      className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-center text-xs text-slate-700 outline-none focus:border-slate-400"
    />
  )
}

export function CanvasBlockEditor({
  block,
  readOnly,
  onChange,
  onUploadImages,
  libraryImages,
  className,
  fillWidth = false,
  onFlatten,
  flattenLabel = "Save as image",
}: {
  block: ProposalCanvasBlock
  readOnly: boolean
  onChange: (block: ProposalCanvasBlock) => void
  /** Uploads device files and resolves to placeable image sources. */
  onUploadImages?: (files: File[]) => Promise<CanvasUploadResult[]>
  /** Existing images the user can drop onto the canvas. */
  libraryImages?: Array<{ url: string; label: string }>
  className?: string
  /** Stretch the canvas to fill the available width instead of capping it at the
   *  design width. Aspect ratio is preserved. */
  fillWidth?: boolean
  /** Flatten this canvas to a single uploaded image. Shows a "Save as image"
   *  action when provided; resolves once the swap is done. */
  onFlatten?: () => Promise<void> | void
  flattenLabel?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const blockRef = useRef(block)
  const onChangeRef = useRef(onChange)
  blockRef.current = block
  onChangeRef.current = onChange

  const [activeTool, setActiveTool] = useState<CanvasTool>("select")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProposalCanvasElement | null>(null)
  const [scale, setScale] = useState(1)
  const [strokeColor, setStrokeColor] = useState("#dc2626")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [showLibrary, setShowLibrary] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [flattening, setFlattening] = useState(false)

  const W = block.width
  const H = block.height
  const elements = [...block.elements].sort((a, b) => a.z - b.z)
  const selected = block.elements.find((el) => el.id === selectedId) || null

  useEffect(() => {
    if (readOnly) {
      setActiveTool("select")
      setSelectedId(null)
      setEditingId(null)
    }
  }, [readOnly])

  // Measure the rendered width to size text proportionally to the design width.
  useLayoutEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    const update = () => setScale(node.getBoundingClientRect().width / block.width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [block.width])

  const toNorm = useCallback((clientX: number, clientY: number): Point => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    }
  }, [])

  const updateElement = useCallback((id: string, patch: Partial<ProposalCanvasElement>) => {
    const current = blockRef.current
    onChangeRef.current({
      ...current,
      elements: current.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as ProposalCanvasElement) : el)),
    })
  }, [])

  const addElement = useCallback((el: ProposalCanvasElement) => {
    const current = blockRef.current
    onChangeRef.current({ ...current, elements: [...current.elements, el] })
  }, [])

  const removeElement = useCallback((id: string) => {
    const current = blockRef.current
    onChangeRef.current({ ...current, elements: current.elements.filter((el) => el.id !== id) })
  }, [])

  // Global pointer handlers drive create / move / resize.
  useEffect(() => {
    if (readOnly) return

    const handleMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return
      const p = toNorm(event.clientX, event.clientY)

      if (interaction.mode === "resize-block") {
        if (interaction.pointerId !== event.pointerId) return
        const deltaX = event.clientX - interaction.startX
        const deltaY = event.clientY - interaction.startY
        onChangeRef.current({
          ...blockRef.current,
          width: Math.max(MIN_CANVAS_WIDTH, Math.round(interaction.width + deltaX)),
          height: Math.max(MIN_CANVAS_HEIGHT, Math.round(interaction.height + deltaY)),
        })
        return
      }

      if (interaction.mode === "create-box") {
        interaction.cur = p
        const tool = interaction.tool
        const box = boxFromDrag(interaction.start, p)
        if (tool === "arrow") {
          const bb = { x: box.x, y: box.y, w: Math.max(MIN_SIZE, box.w), h: Math.max(MIN_SIZE, box.h) }
          setDraft({
            id: "draft",
            kind: "arrow",
            ...bb,
            z: 9999,
            points: toRelative([interaction.start, p], bb) as [Point, Point],
            variant: "arrow",
            color: strokeColor,
            width: strokeWidth,
          })
        } else {
          setDraft({
            id: "draft",
            kind: "shape",
            ...box,
            z: 9999,
            shape: tool,
            stroke: strokeColor,
            strokeWidth,
            fill: null,
          })
        }
        return
      }

      if (interaction.mode === "create-draw") {
        interaction.points.push(p)
        const bb = pointsBounds(interaction.points)
        setDraft({
          id: "draft",
          kind: "draw",
          ...bb,
          z: 9999,
          points: toRelative(interaction.points, bb),
          color: strokeColor,
          width: strokeWidth,
        })
        return
      }

      if (interaction.mode === "move") {
        const dx = p.x - interaction.startPointer.x
        const dy = p.y - interaction.startPointer.y
        const nx = Math.min(1 - interaction.startBox.w, Math.max(0, interaction.startBox.x + dx))
        const ny = Math.min(1 - interaction.startBox.h, Math.max(0, interaction.startBox.y + dy))
        updateElement(interaction.id, { x: nx, y: ny } as Partial<ProposalCanvasElement>)
        return
      }

      if (interaction.mode === "resize") {
        const { handle, start } = interaction
        let { left, right, top, bottom } = start
        if (handle.includes("w")) left = Math.min(p.x, right - MIN_SIZE)
        if (handle.includes("e")) right = Math.max(p.x, left + MIN_SIZE)
        if (handle.includes("n")) top = Math.min(p.y, bottom - MIN_SIZE)
        if (handle.includes("s")) bottom = Math.max(p.y, top + MIN_SIZE)
        updateElement(interaction.id, {
          x: clamp01(left),
          y: clamp01(top),
          w: clamp01(right) - clamp01(left),
          h: clamp01(bottom) - clamp01(top),
        } as Partial<ProposalCanvasElement>)
        return
      }
    }

    const handleUp = () => {
      const interaction = interactionRef.current
      interactionRef.current = null
      if (!interaction) return

      if (interaction.mode === "create-box") {
        const box = boxFromDrag(interaction.start, interaction.cur)
        if (interaction.tool === "arrow") {
          if (Math.abs(interaction.cur.x - interaction.start.x) + Math.abs(interaction.cur.y - interaction.start.y) > 0.01) {
            const bb = { x: box.x, y: box.y, w: Math.max(MIN_SIZE, box.w), h: Math.max(MIN_SIZE, box.h) }
            const id = createId("el")
            addElement({
              id,
              kind: "arrow",
              ...bb,
              z: nextZ(blockRef.current.elements),
              points: toRelative([interaction.start, interaction.cur], bb) as [Point, Point],
              variant: "arrow",
              color: strokeColor,
              width: strokeWidth,
            })
            setSelectedId(id)
          }
        } else if (box.w > MIN_SIZE / 2 && box.h > MIN_SIZE / 2) {
          const id = createId("el")
          addElement({
            id,
            kind: "shape",
            x: box.x,
            y: box.y,
            w: Math.max(MIN_SIZE, box.w),
            h: Math.max(MIN_SIZE, box.h),
            z: nextZ(blockRef.current.elements),
            shape: interaction.tool,
            stroke: strokeColor,
            strokeWidth,
            fill: null,
          })
          setSelectedId(id)
        }
        setDraft(null)
        // Keep the tool active so the user can create several in a row; they
        // switch back to Select explicitly.
        return
      }

      if (interaction.mode === "create-draw") {
        if (interaction.points.length >= 2) {
          const bb = pointsBounds(interaction.points)
          const id = createId("el")
          addElement({
            id,
            kind: "draw",
            ...bb,
            z: nextZ(blockRef.current.elements),
            points: toRelative(interaction.points, bb),
            color: strokeColor,
            width: strokeWidth,
          })
          setSelectedId(id)
        }
        setDraft(null)
        // Keep the tool active so the user can create several in a row; they
        // switch back to Select explicitly.
        return
      }
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [readOnly, toNorm, updateElement, addElement, strokeColor, strokeWidth])

  // Delete / Backspace removes the selected element — but never while typing in
  // a text field (the inline text editor, caption, or any control input).
  useEffect(() => {
    if (readOnly) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return
      if (!selectedId || editingId) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return
      event.preventDefault()
      removeElement(selectedId)
      setSelectedId(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [readOnly, selectedId, editingId, removeElement])

  // Deselect when the user interacts outside this editor (e.g. another canvas on
  // the page), so at most one editor holds a selection — otherwise a window-level
  // Delete keypress could remove an element from several canvases at once.
  useEffect(() => {
    if (readOnly || !selectedId) return
    const handler = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && containerRef.current?.contains(target)) return
      setSelectedId(null)
      setEditingId(null)
    }
    window.addEventListener("pointerdown", handler, true)
    return () => window.removeEventListener("pointerdown", handler, true)
  }, [readOnly, selectedId])

  const isDrawingTool = activeTool !== "select"

  const startCreate = (event: React.PointerEvent) => {
    if (readOnly) return
    event.preventDefault()
    const p = toNorm(event.clientX, event.clientY)

    if (activeTool === "text") {
      const w = 0.34
      const h = 0.12
      const id = createId("el")
      addElement({
        id,
        kind: "text",
        x: Math.min(1 - w, Math.max(0, p.x - w / 2)),
        y: Math.min(1 - h, Math.max(0, p.y - h / 2)),
        w,
        h,
        z: nextZ(blockRef.current.elements),
        text: "Text",
        fontSize: 24,
        color: "#0f172a",
        align: "left",
      })
      setSelectedId(id)
      setEditingId(id)
      // Stay on the Text tool so the next click adds another text box.
      return
    }

    if (activeTool === "draw") {
      interactionRef.current = { mode: "create-draw", points: [p] }
      return
    }

    if (activeTool === "select") return

    // rect / ellipse / arrow
    interactionRef.current = { mode: "create-box", tool: activeTool, start: p, cur: p }
  }

  const startMove = (event: React.PointerEvent, el: ProposalCanvasElement) => {
    if (readOnly || el.locked) return
    event.stopPropagation()
    event.preventDefault()
    setSelectedId(el.id)
    if (editingId && editingId !== el.id) setEditingId(null)
    interactionRef.current = {
      mode: "move",
      id: el.id,
      startBox: { x: el.x, y: el.y, w: el.w, h: el.h },
      startPointer: toNorm(event.clientX, event.clientY),
    }
  }

  const startResize = (event: React.PointerEvent, el: ProposalCanvasElement, handle: Handle) => {
    event.stopPropagation()
    event.preventDefault()
    interactionRef.current = {
      mode: "resize",
      id: el.id,
      handle,
      start: { left: el.x, right: el.x + el.w, top: el.y, bottom: el.y + el.h },
    }
  }

  const handleAddImageFiles = async (files: File[]) => {
    if (!onUploadImages || files.length === 0) return
    setUploading(true)
    try {
      const results = await onUploadImages(files)
      let z = nextZ(blockRef.current.elements)
      const newEls: ProposalCanvasImageElement[] = results.map((res, index) => {
        const aspect = res.height > 0 ? res.width / res.height : 1.5
        const w = 0.45
        // Keep visual aspect: h(norm) = w(norm) * (1/aspect) * (W/H)
        const h = Math.min(0.9, (w / aspect) * (W / H))
        const offset = index * 0.03
        return {
          id: createId("el"),
          kind: "image",
          x: clamp01(0.28 + offset),
          y: clamp01(0.2 + offset),
          w,
          h,
          z: z++,
          url: res.url,
          media_id: res.media_id,
          file_name: res.file_name,
          objectFit: "cover",
        }
      })
      onChangeRef.current({ ...blockRef.current, elements: [...blockRef.current.elements, ...newEls] })
      if (newEls.length) setSelectedId(newEls[newEls.length - 1].id)
    } finally {
      setUploading(false)
    }
  }

  const addLibraryImage = (url: string) => {
    const w = 0.45
    const h = 0.3
    const id = createId("el")
    addElement({
      id,
      kind: "image",
      x: 0.28,
      y: 0.2,
      w,
      h,
      z: nextZ(blockRef.current.elements),
      url,
      objectFit: "cover",
    })
    setSelectedId(id)
    setShowLibrary(false)
  }

  const reorder = (id: string, dir: "front" | "back") => {
    const els = blockRef.current.elements
    const sorted = [...els].sort((a, b) => a.z - b.z)
    const idx = sorted.findIndex((el) => el.id === id)
    if (idx === -1) return
    const [item] = sorted.splice(idx, 1)
    if (dir === "front") sorted.push(item)
    else sorted.unshift(item)
    onChangeRef.current({ ...blockRef.current, elements: sorted.map((el, i) => ({ ...el, z: i })) })
  }

  const duplicate = (el: ProposalCanvasElement) => {
    const id = createId("el")
    const copy = {
      ...el,
      id,
      x: clamp01(el.x + 0.03),
      y: clamp01(el.y + 0.03),
      z: nextZ(blockRef.current.elements),
    } as ProposalCanvasElement
    addElement(copy)
    setSelectedId(id)
  }

  const toolButton = (tool: CanvasTool, Icon: typeof Square, label: string) => (
    <Button
      type="button"
      variant={activeTool === tool ? "default" : "ghost"}
      size="sm"
      className="h-8"
      onClick={() => {
        setActiveTool((prev) => (prev === tool ? "select" : tool))
        setEditingId(null)
      }}
    >
      <Icon className="mr-1 h-4 w-4" />
      {label}
    </Button>
  )

  return (
    <div ref={containerRef} className={cn("space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3", className)}>
      {!readOnly ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&>*]:shrink-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <Button
              type="button"
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("select")}
            >
              <MousePointer2 className="mr-1 h-4 w-4" />
              Select
            </Button>

            <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />

            {/* Media group: add images from the device or the existing library. */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <Button type="button" variant="ghost" size="sm" className="h-8" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                Image
              </Button>
              {libraryImages && libraryImages.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setShowLibrary((v) => !v)}>
                  Library
                </Button>
              ) : null}
            </div>

            <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />

            {/* Shapes & drawing group. */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {toolButton("text", Type, "Text")}
              {toolButton("rect", Square, "Rectangle")}
              {toolButton("ellipse", Circle, "Circle")}
              {toolButton("arrow", ArrowUpRight, "Arrow")}
              {toolButton("draw", PencilLine, "Draw")}
            </div>

            <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />

            {/* Canvas group: size (type W × H or drag the corner handle) and the
                canvas background color, kept together. */}
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Size</span>
              <DimensionInput label="Canvas width" value={block.width} min={MIN_CANVAS_WIDTH} onCommit={(width) => onChange({ ...block, width })} />
              <span className="text-slate-400">×</span>
              <DimensionInput label="Canvas height" value={block.height} min={MIN_CANVAS_HEIGHT} onCommit={(height) => onChange({ ...block, height })} />
              <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
              <span className="font-medium text-slate-500">Color</span>
              <input
                type="color"
                aria-label="Canvas background color"
                value={block.background ?? "#ffffff"}
                onChange={(e) => onChange({ ...block, background: e.target.value })}
                className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
            <div className="flex items-center rounded-md border border-slate-200 bg-white">
              {([
                { icon: AlignLeft, value: "left" },
                { icon: AlignCenter, value: "center" },
                { icon: AlignRight, value: "right" },
              ] as const).map(({ icon: Icon, value }, i) => {
                const isActive = (block.alignment ?? "left") === value
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "p-1.5 transition",
                      i > 0 && "border-l border-slate-200",
                      isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    )}
                    onClick={() => onChange({ ...block, alignment: value })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                )
              })}
            </div>

            {onFlatten ? (
              <Button
                type="button"
                size="sm"
                className="sm:ml-auto"
                disabled={flattening || block.elements.length === 0}
                onClick={async () => {
                  setFlattening(true)
                  try {
                    await onFlatten()
                  } catch {
                    /* parent surfaces the error toast */
                  } finally {
                    setFlattening(false)
                  }
                }}
              >
                {flattening ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Layers className="mr-1 h-4 w-4" />}
                {flattenLabel}
              </Button>
            ) : null}
          </div>

          {isDrawingTool && activeTool !== "text" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Color
                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Stroke
                <input type="range" min={2} max={16} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
                <span>{strokeWidth}px</span>
              </label>
            </div>
          ) : null}

          {showLibrary && libraryImages && libraryImages.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
              {libraryImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  className="group relative h-16 w-20 overflow-hidden rounded-md border border-slate-200 hover:border-sky-400"
                  onClick={() => addLibraryImage(img.url)}
                  title={img.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {selected ? <SelectedElementPanel el={selected} onChange={updateElement} onRemove={removeElement} onReorder={reorder} onDuplicate={duplicate} setSelectedId={setSelectedId} /> : null}
        </>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          e.target.value = ""
          void handleAddImageFiles(files)
        }}
      />

      <div
        className={cn(
          "flex w-full",
          block.alignment === "center" ? "justify-center" : block.alignment === "right" ? "justify-end" : "justify-start",
        )}
      >
        <div className="space-y-2" style={fillWidth ? { width: "100%" } : { width: `${block.width}px`, maxWidth: "100%" }}>
          <div
            ref={wrapperRef}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm",
              !readOnly && "touch-none select-none",
              isDrawingTool && !readOnly && "cursor-crosshair",
            )}
            style={{ width: "100%", aspectRatio: `${W} / ${H}`, backgroundColor: block.background ?? "#ffffff" }}
          >
            {/* Background layer: deselect on empty click (select mode only). */}
            {!readOnly && !isDrawingTool ? (
              <div
                className="absolute inset-0"
                onPointerDown={() => {
                  setSelectedId(null)
                  setEditingId(null)
                }}
              />
            ) : null}

            {/* Elements */}
            {elements.map((el) => {
              const isSelected = !readOnly && el.id === selectedId
              const isEditing = editingId === el.id && el.kind === "text"
              return (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${el.x * 100}%`,
                    top: `${el.y * 100}%`,
                    width: `${el.w * 100}%`,
                    height: `${el.h * 100}%`,
                    zIndex: el.z + 1,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  }}
                >
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={el.kind === "text" ? el.text : ""}
                      onChange={(e) => updateElement(el.id, { text: e.target.value } as Partial<ProposalCanvasElement>)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="h-full w-full resize-none rounded-md border border-sky-400 bg-white/95 px-1 py-0.5 outline-none"
                      style={{
                        color: (el as ProposalCanvasTextElement).color,
                        fontSize: `${(el as ProposalCanvasTextElement).fontSize * scale}px`,
                        fontWeight: (el as ProposalCanvasTextElement).bold ? 700 : 400,
                        fontStyle: (el as ProposalCanvasTextElement).italic ? "italic" : "normal",
                        textAlign: (el as ProposalCanvasTextElement).align ?? "left",
                        lineHeight: 1.25,
                      }}
                    />
                  ) : (
                    <ElementVisual el={el} W={W} H={H} scale={scale} />
                  )}

                  {!readOnly && !isDrawingTool && !isEditing ? (
                    <ElementHitTarget
                      el={el}
                      W={W}
                      H={H}
                      onPointerDown={(event) => {
                        if (event.detail === 2 && el.kind === "text") {
                          event.stopPropagation()
                          setSelectedId(el.id)
                          setEditingId(el.id)
                          return
                        }
                        startMove(event, el)
                      }}
                    />
                  ) : null}

                  {isSelected && !isEditing ? (
                    <>
                      <div className="pointer-events-none absolute inset-0 rounded-[2px] ring-2 ring-sky-400" />
                      {HANDLES.map((handle) => (
                        <div
                          key={handle}
                          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-500 bg-white shadow"
                          style={{ left: HANDLE_POS[handle].left, top: HANDLE_POS[handle].top, cursor: HANDLE_CURSOR[handle] }}
                          onPointerDown={(event) => startResize(event, el, handle)}
                        />
                      ))}
                    </>
                  ) : null}
                </div>
              )
            })}

            {/* Draft preview while creating */}
            {draft ? (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.w * 100}%`,
                  height: `${draft.h * 100}%`,
                  zIndex: 9999,
                }}
              >
                <ElementVisual el={draft} W={W} H={H} scale={scale} />
              </div>
            ) : null}

            {/* Create/capture overlay while a drawing tool is active. Suppressed
                while editing a text box so the textarea stays interactive even
                though the Text tool remains selected. */}
            {!readOnly && isDrawingTool && !editingId ? (
              <div className="absolute inset-0 z-[9998]" style={{ cursor: "crosshair" }} onPointerDown={startCreate} />
            ) : null}

            {/* Whole-canvas resize handle */}
            {!readOnly ? (
              <button
                type="button"
                className="absolute bottom-2 right-2 z-[9999] h-5 w-5 rounded-full border border-white/80 bg-slate-900/80 shadow"
                aria-label="Resize canvas"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  interactionRef.current = {
                    mode: "resize-block",
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

          {!readOnly ? (
            <Input
              value={block.caption ?? ""}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              placeholder="Caption"
              className="bg-white text-sm"
            />
          ) : block.caption?.trim() ? (
            <p className="px-1 text-center text-sm italic leading-6 text-slate-500">{block.caption}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-element property panel
// ---------------------------------------------------------------------------

function SelectedElementPanel({
  el,
  onChange,
  onRemove,
  onReorder,
  onDuplicate,
  setSelectedId,
}: {
  el: ProposalCanvasElement
  onChange: (id: string, patch: Partial<ProposalCanvasElement>) => void
  onRemove: (id: string) => void
  onReorder: (id: string, dir: "front" | "back") => void
  onDuplicate: (el: ProposalCanvasElement) => void
  setSelectedId: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      {el.kind === "text" ? <TextControls el={el} onChange={onChange} /> : null}
      {el.kind === "shape" ? <ShapeControls el={el} onChange={onChange} /> : null}
      {(el.kind === "arrow" || el.kind === "draw") ? <StrokeControls el={el} onChange={onChange} /> : null}
      {el.kind === "image" ? <ImageControls el={el} onChange={onChange} /> : null}

      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" title="Bring to front" onClick={() => onReorder(el.id, "front")}>
          <BringToFront className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Send to back" onClick={() => onReorder(el.id, "back")}>
          <SendToBack className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Duplicate" onClick={() => onDuplicate(el)}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
          title="Delete"
          onClick={() => {
            onRemove(el.id)
            setSelectedId(null)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function TextControls({ el, onChange }: { el: ProposalCanvasTextElement; onChange: (id: string, patch: Partial<ProposalCanvasElement>) => void }) {
  return (
    <>
      <Input
        value={el.text}
        onChange={(e) => onChange(el.id, { text: e.target.value } as Partial<ProposalCanvasElement>)}
        className="max-w-[200px]"
        placeholder="Text"
      />
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Size
        <input
          type="number"
          min={8}
          max={96}
          value={el.fontSize}
          onChange={(e) => onChange(el.id, { fontSize: Number(e.target.value) || 24 } as Partial<ProposalCanvasElement>)}
          className="w-16 rounded-md border border-slate-200 px-2 py-1"
        />
      </label>
      <input type="color" value={el.color} onChange={(e) => onChange(el.id, { color: e.target.value } as Partial<ProposalCanvasElement>)} title="Color" />
      <Button type="button" variant={el.bold ? "default" : "outline"} size="icon-sm" onClick={() => onChange(el.id, { bold: !el.bold } as Partial<ProposalCanvasElement>)}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant={el.italic ? "default" : "outline"} size="icon-sm" onClick={() => onChange(el.id, { italic: !el.italic } as Partial<ProposalCanvasElement>)}>
        <Italic className="h-4 w-4" />
      </Button>
      <div className="flex items-center rounded-md border border-slate-200">
        {([
          { icon: AlignLeft, value: "left" },
          { icon: AlignCenter, value: "center" },
          { icon: AlignRight, value: "right" },
        ] as const).map(({ icon: Icon, value }, i) => (
          <button
            key={value}
            type="button"
            className={cn("p-1.5 transition", i > 0 && "border-l border-slate-200", (el.align ?? "left") === value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
            onClick={() => onChange(el.id, { align: value } as Partial<ProposalCanvasElement>)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant={el.background ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(el.id, { background: el.background ? null : "rgba(15, 23, 42, 0.65)" } as Partial<ProposalCanvasElement>)}
      >
        Pill
      </Button>
    </>
  )
}

function ShapeControls({ el, onChange }: { el: ProposalCanvasShapeElement; onChange: (id: string, patch: Partial<ProposalCanvasElement>) => void }) {
  return (
    <>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Stroke
        <input type="color" value={el.stroke} onChange={(e) => onChange(el.id, { stroke: e.target.value } as Partial<ProposalCanvasElement>)} />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Width
        <input
          type="range"
          min={0}
          max={16}
          value={el.strokeWidth}
          onChange={(e) => onChange(el.id, { strokeWidth: Number(e.target.value) } as Partial<ProposalCanvasElement>)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Fill
        <input
          type="color"
          value={el.fill || "#3b82f6"}
          onChange={(e) => onChange(el.id, { fill: e.target.value, fillOpacity: el.fillOpacity ?? 0.3 } as Partial<ProposalCanvasElement>)}
        />
      </label>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(el.id, { fill: null } as Partial<ProposalCanvasElement>)}>
        No fill
      </Button>
    </>
  )
}

function StrokeControls({
  el,
  onChange,
}: {
  el: ProposalCanvasArrowElement | ProposalCanvasDrawElement
  onChange: (id: string, patch: Partial<ProposalCanvasElement>) => void
}) {
  return (
    <>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Color
        <input type="color" value={el.color} onChange={(e) => onChange(el.id, { color: e.target.value } as Partial<ProposalCanvasElement>)} />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Width
        <input type="range" min={2} max={16} value={el.width} onChange={(e) => onChange(el.id, { width: Number(e.target.value) } as Partial<ProposalCanvasElement>)} />
        <span>{el.width}px</span>
      </label>
      {el.kind === "arrow" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(el.id, { variant: el.variant === "line" ? "arrow" : "line" } as Partial<ProposalCanvasElement>)}
        >
          {el.variant === "line" ? <ArrowUpRight className="mr-1 h-4 w-4" /> : <Minus className="mr-1 h-4 w-4" />}
          {el.variant === "line" ? "Arrow head" : "Line"}
        </Button>
      ) : null}
    </>
  )
}

function ImageControls({ el, onChange }: { el: ProposalCanvasImageElement; onChange: (id: string, patch: Partial<ProposalCanvasElement>) => void }) {
  return (
    <>
      <span className="max-w-[160px] truncate text-sm text-slate-500">{el.file_name || "Image"}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(el.id, { objectFit: el.objectFit === "contain" ? "cover" : "contain" } as Partial<ProposalCanvasElement>)}
      >
        {el.objectFit === "contain" ? "Fit" : "Fill"}
      </Button>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Radius
        <input
          type="range"
          min={0}
          max={40}
          value={el.radius ?? 0}
          onChange={(e) => onChange(el.id, { radius: Number(e.target.value) } as Partial<ProposalCanvasElement>)}
        />
      </label>
    </>
  )
}
