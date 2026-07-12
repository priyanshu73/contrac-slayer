"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Circle, Highlighter, Paintbrush, PencilLine, Ruler, Square, Trash2, Type, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createId } from "@/components/proposal/utils"
import type {
  ProposalAnnotationPoint,
  ProposalImageAnnotation,
  ProposalImageAnnotationStroke,
  ProposalImageArrowAnnotation,
  ProposalImageBlock,
  ProposalImageMeasurementAnnotation,
  ProposalImageShapeAnnotation,
} from "@/lib/types"

function StrokePath({
  stroke,
  width,
  height,
}: {
  stroke: ProposalImageAnnotationStroke
  width: number
  height: number
}) {
  const d = getStrokePath(stroke, width, height)

  return <path d={d} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
}

function getStrokePath(stroke: ProposalImageAnnotationStroke, width: number, height: number) {
  return stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * width} ${point.y * height}`)
    .join(" ")
}

function ArrowPath({
  arrow,
  width,
  height,
  markerId,
}: {
  arrow: ProposalImageArrowAnnotation
  width: number
  height: number
  markerId: string
}) {
  const startX = arrow.start.x * width
  const startY = arrow.start.y * height
  const endX = arrow.end.x * width
  const endY = arrow.end.y * height

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="4"
          markerHeight="4"
          refX="3.6"
          refY="2"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 4 2 L 0 4 z" fill={arrow.color} />
        </marker>
      </defs>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={arrow.color}
        strokeWidth={arrow.width}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    </g>
  )
}

function LineSelection({
  start,
  end,
  width,
  height,
  strokeWidth,
  dashed = false,
}: {
  start: ProposalAnnotationPoint
  end: ProposalAnnotationPoint
  width: number
  height: number
  strokeWidth: number
  dashed?: boolean
}) {
  return (
    <line
      x1={start.x * width}
      y1={start.y * height}
      x2={end.x * width}
      y2={end.y * height}
      stroke="#0ea5e9"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? "8 6" : undefined}
      opacity={0.85}
    />
  )
}

function MeasurementAnnotation({
  annotation,
  width,
  height,
}: {
  annotation: ProposalImageMeasurementAnnotation
  width: number
  height: number
}) {
  const startX = annotation.start.x * width
  const startY = annotation.start.y * height
  const endX = annotation.end.x * width
  const endY = annotation.end.y * height
  const labelX = (startX + endX) / 2
  const labelY = (startY + endY) / 2
  const label = annotation.label.trim()

  return (
    <g>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={annotation.color}
        strokeWidth={annotation.width}
        strokeLinecap="round"
      />
      {label ? (
        <text
          x={labelX}
          y={labelY}
          fill={annotation.color}
          fontSize={16}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="middle"
          paintOrder="stroke"
          stroke="white"
          strokeWidth={4}
          strokeLinejoin="round"
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}

function AnnotationSelection({
  annotation,
  width,
  height,
}: {
  annotation: ProposalImageAnnotation
  width: number
  height: number
}) {
  if (!annotation.type || annotation.type === "stroke") {
    return (
      <path
        d={getStrokePath(annotation, width, height)}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={Math.max(annotation.width + 4, 6)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    )
  }

  if (annotation.type === "arrow" || annotation.type === "measurement") {
    return (
      <LineSelection
        start={annotation.start}
        end={annotation.end}
        width={width}
        height={height}
        strokeWidth={Math.max(annotation.width + 4, 6)}
        dashed={annotation.type === "measurement"}
      />
    )
  }

  if (annotation.type !== "rect" && annotation.type !== "ellipse" && annotation.type !== "highlight") {
    return null
  }

  const x = annotation.x * width
  const y = annotation.y * height
  const w = annotation.w * width
  const h = annotation.h * height
  const offset = Math.max(annotation.width / 2 + 4, 6)

  if (annotation.type === "ellipse") {
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2 + offset}
        ry={h / 2 + offset}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={3}
        strokeDasharray="8 6"
      />
    )
  }

  return (
    <rect
      x={x - offset}
      y={y - offset}
      width={w + offset * 2}
      height={h + offset * 2}
      fill="none"
      stroke="#0ea5e9"
      strokeWidth={3}
      strokeDasharray="8 6"
    />
  )
}

function AnnotationHitTarget({
  annotation,
  width,
  height,
}: {
  annotation: ProposalImageAnnotation
  width: number
  height: number
}) {
  if (!annotation.type || annotation.type === "stroke") {
    return (
      <path
        d={getStrokePath(annotation, width, height)}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(annotation.width + 14, 18)}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
      />
    )
  }

  if (annotation.type === "arrow" || annotation.type === "measurement") {
    return (
      <line
        x1={annotation.start.x * width}
        y1={annotation.start.y * height}
        x2={annotation.end.x * width}
        y2={annotation.end.y * height}
        stroke="transparent"
        strokeWidth={Math.max(annotation.width + 14, 18)}
        strokeLinecap="round"
        pointerEvents="stroke"
      />
    )
  }

  if (annotation.type !== "rect" && annotation.type !== "ellipse" && annotation.type !== "highlight") {
    return null
  }

  const x = annotation.x * width
  const y = annotation.y * height
  const w = annotation.w * width
  const h = annotation.h * height

  if (annotation.type === "ellipse") {
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2}
        ry={h / 2}
        fill="transparent"
        stroke="transparent"
        strokeWidth={Math.max(annotation.width + 14, 18)}
        pointerEvents="all"
      />
    )
  }

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="transparent"
      stroke="transparent"
      strokeWidth={Math.max(annotation.width + 14, 18)}
      pointerEvents="all"
    />
  )
}

function getAnnotationBounds(start: ProposalAnnotationPoint, end: ProposalAnnotationPoint) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  }
}

function ShapeAnnotation({
  annotation,
  width,
  height,
}: {
  annotation: ProposalImageShapeAnnotation
  width: number
  height: number
}) {
  const x = annotation.x * width
  const y = annotation.y * height
  const w = annotation.w * width
  const h = annotation.h * height

  if (annotation.type === "ellipse") {
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2}
        ry={h / 2}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.width}
      />
    )
  }

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={annotation.type === "highlight" ? annotation.fill ?? annotation.color : "none"}
      fillOpacity={annotation.type === "highlight" ? annotation.opacity ?? 0.28 : undefined}
      stroke={annotation.color}
      strokeWidth={annotation.width}
      strokeLinejoin="round"
    />
  )
}

export function ImageBlockEditor({
  block,
  readOnly,
  onChange,
  className,
}: {
  block: ProposalImageBlock
  readOnly: boolean
  onChange: (block: ProposalImageBlock) => void
  className?: string
}) {
  const t = useTranslations("proposals")
  const arrowMarkerPrefix = useId().replace(/:/g, "")
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const drawStateRef = useRef<{ pointerId: number; points: ProposalAnnotationPoint[] } | null>(null)
  const resizeStateRef = useRef<{ pointerId: number; startX: number; startY: number; width: number; height: number } | null>(null)
  const dragStateRef = useRef<{ pointerId: number; overlayId: string } | null>(null)
  type ImageTool = "select" | "draw" | "arrow" | "rect" | "ellipse" | "highlight" | "measurement"

  const [activeTool, setActiveTool] = useState<ImageTool>("select")
  const drawMode = activeTool === "draw"
  const arrowMode = activeTool === "arrow"
  const measurementMode = activeTool === "measurement"
  const shapeMode = activeTool === "rect" || activeTool === "ellipse" || activeTool === "highlight"
  const annotationMode = drawMode || arrowMode || shapeMode || measurementMode
  const [strokeColor, setStrokeColor] = useState("#dc2626")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [draftPoints, setDraftPoints] = useState<ProposalAnnotationPoint[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  useEffect(() => {
    if (readOnly) setActiveTool("select")
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
        const points = drawMode ? [...drawStateRef.current.points, point] : [drawStateRef.current.points[0], point]
        drawStateRef.current = { ...drawStateRef.current, points }
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

        if (finishedPoints.length >= 2 && drawMode) {
          const id = createId("stroke")

          onChange({
            ...block,
            annotations: [
              ...block.annotations,
              {
                id,
                type: "stroke",
                color: strokeColor,
                width: strokeWidth,
                points: finishedPoints,
              },
            ],
          })
          setSelectedAnnotationId(id)
          setSelectedOverlayId(null)
          setSelectedMeasurementId(null)
        }

        if (finishedPoints.length >= 2 && arrowMode) {
          const id = createId("arrow")

          onChange({
            ...block,
            annotations: [
              ...block.annotations,
              {
                id,
                type: "arrow",
                color: strokeColor,
                width: strokeWidth,
                start: finishedPoints[0],
                end: finishedPoints[finishedPoints.length - 1],
              },
            ],
          })
          setSelectedAnnotationId(id)
          setSelectedOverlayId(null)
          setSelectedMeasurementId(null)
        }

        if (finishedPoints.length >= 2 && shapeMode) {
          const bounds = getAnnotationBounds(finishedPoints[0], finishedPoints[finishedPoints.length - 1])

          if (bounds.w > 0 && bounds.h > 0) {
            const id = createId(activeTool)

            onChange({
              ...block,
              annotations: [
                ...block.annotations,
                {
                  id,
                  type: activeTool,
                  color: strokeColor,
                  width: strokeWidth,
                  ...bounds,
                  ...(activeTool === "highlight" ? { fill: strokeColor, opacity: 0.28 } : {}),
                },
              ],
            })
            setSelectedAnnotationId(id)
            setSelectedOverlayId(null)
            setSelectedMeasurementId(null)
          }
        }

        if (finishedPoints.length >= 2 && measurementMode) {
          const id = createId("measurement")

          onChange({
            ...block,
            annotations: [
              ...block.annotations,
              {
                id,
                type: "measurement",
                color: strokeColor,
                width: strokeWidth,
                start: finishedPoints[0],
                end: finishedPoints[finishedPoints.length - 1],
                label: "Measurement",
              },
            ],
          })
          setSelectedAnnotationId(id)
          setSelectedMeasurementId(id)
          setSelectedOverlayId(null)
        }
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [activeTool, arrowMode, block, drawMode, measurementMode, onChange, shapeMode, strokeColor, strokeWidth])

  const selectedOverlay = block.textOverlays.find((overlay) => overlay.id === selectedOverlayId) || null
  const selectedAnnotation = block.annotations.find((annotation) => annotation.id === selectedAnnotationId) || null
  const selectedMeasurement = block.annotations.find(
    (annotation): annotation is ProposalImageMeasurementAnnotation =>
      annotation.type === "measurement" && annotation.id === selectedMeasurementId,
  ) || null

  return (
    <div className={cn("space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3", className)}>
      {!readOnly ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [&>*]:shrink-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
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
                    isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                  onClick={() => onChange({ ...block, alignment: value })}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>
          <Button
            type="button"
            variant={drawMode ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(drawMode ? "select" : "draw")
            }
          >
            <PencilLine className="mr-1 h-4 w-4" />
            {drawMode ? t("imageEditor.drawing") : t("imageEditor.draw")}
          </Button>
          <Button
            type="button"
            variant={arrowMode ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(arrowMode ? "select" : "arrow")
            }
          >
            <ArrowUpRight className="mr-1 h-4 w-4" />
            Arrow
          </Button>
          <Button
            type="button"
            variant={activeTool === "rect" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(activeTool === "rect" ? "select" : "rect")
            }
          >
            <Square className="mr-1 h-4 w-4" />
            Rectangle
          </Button>
          <Button
            type="button"
            variant={activeTool === "ellipse" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(activeTool === "ellipse" ? "select" : "ellipse")
            }
          >
            <Circle className="mr-1 h-4 w-4" />
            Circle
          </Button>
          <Button
            type="button"
            variant={activeTool === "highlight" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(activeTool === "highlight" ? "select" : "highlight")
            }
          >
            <Highlighter className="mr-1 h-4 w-4" />
            Highlight
          </Button>
          <Button
            type="button"
            variant={measurementMode ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setActiveTool(measurementMode ? "select" : "measurement")
            }
          >
            <Ruler className="mr-1 h-4 w-4" />
            Measurement
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const overlay = {
                id: createId("label"),
                text: t("imageEditor.textOverlay"),
                x: 0.5,
                y: 0.88,
                fontSize: 18,
                color: "#ffffff",
                bold: true,
              }
              onChange({ ...block, textOverlays: [...block.textOverlays, overlay] })
              setSelectedOverlayId(overlay.id)
              setSelectedMeasurementId(null)
              setSelectedAnnotationId(null)
            }}
          >
            <Type className="mr-1 h-4 w-4" />
            {t("imageEditor.addLabel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={block.annotations.length === 0}
            onClick={() => onChange({ ...block, annotations: block.annotations.slice(0, -1) })}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            {t("imageEditor.undo")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={block.annotations.length === 0}
            onClick={() => onChange({ ...block, annotations: [] })}
          >
            <Paintbrush className="mr-1 h-4 w-4" />
            {t("imageEditor.clear")}
          </Button>
        </div>
      ) : null}

      {!readOnly && annotationMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t("imageEditor.color")}
            <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t("imageEditor.stroke")}
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
            {t("imageEditor.size")}
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
            {t("imageEditor.color")}
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
            {t("imageEditor.bold")}
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
            {t("imageEditor.deleteLabel")}
          </Button>
        </div>
      ) : null}

      {!readOnly && selectedAnnotation ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t("imageEditor.color")}
            <input
              type="color"
              value={selectedAnnotation.color}
              onChange={(event) =>
                onChange({
                  ...block,
                  annotations: block.annotations.map((annotation) =>
                    annotation.id === selectedAnnotation.id
                      ? {
                          ...annotation,
                          color: event.target.value,
                          ...(annotation.type === "highlight" ? { fill: event.target.value } : {}),
                        }
                      : annotation,
                  ),
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t("imageEditor.stroke")}
            <input
              type="range"
              min={2}
              max={16}
              value={selectedAnnotation.width}
              onChange={(event) =>
                onChange({
                  ...block,
                  annotations: block.annotations.map((annotation) =>
                    annotation.id === selectedAnnotation.id ? { ...annotation, width: Number(event.target.value) } : annotation,
                  ),
                })
              }
            />
            <span>{selectedAnnotation.width}px</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              onChange({ ...block, annotations: block.annotations.filter((annotation) => annotation.id !== selectedAnnotation.id) })
              setSelectedAnnotationId(null)
              if (selectedMeasurementId === selectedAnnotation.id) setSelectedMeasurementId(null)
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete annotation
          </Button>
        </div>
      ) : null}

      {!readOnly && selectedMeasurement ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Input
            value={selectedMeasurement.label}
            onChange={(event) =>
              onChange({
                ...block,
                annotations: block.annotations.map((annotation) =>
                  annotation.type === "measurement" && annotation.id === selectedMeasurement.id
                    ? { ...annotation, label: event.target.value }
                    : annotation,
                ),
              })
            }
            className="max-w-xs"
          />
        </div>
      ) : null}

      <div className={cn(
        "flex w-full",
        block.alignment === "center" ? "justify-center" : block.alignment === "right" ? "justify-end" : "justify-start"
      )}>
        <div className="space-y-2" style={{ width: `${block.width}px`, maxWidth: "100%" }}>
          <div
            ref={wrapperRef}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
              !readOnly && "touch-none select-none",
              annotationMode && !readOnly && "cursor-crosshair",
            )}
            // aspectRatio (not fixed px height) so the box scales proportionally
            // when the column narrows on mobile instead of distorting/overflowing.
            style={{ width: "100%", aspectRatio: `${block.width} / ${block.height}` }}
            onPointerDown={(event) => {
              if (readOnly || !wrapperRef.current) return
              if (!annotationMode) {
                setSelectedAnnotationId(null)
                setSelectedMeasurementId(null)
                return
              }
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

          <svg
            className={cn(
              "absolute inset-0 h-full w-full",
              !readOnly && !annotationMode ? "pointer-events-auto" : "pointer-events-none",
            )}
            viewBox={`0 0 ${block.width} ${block.height}`}
            preserveAspectRatio="none"
          >
            {block.annotations.map((annotation) => {
              const isSelected = selectedAnnotationId === annotation.id
              const selectAnnotation = (event: React.PointerEvent<SVGGElement>) => {
                if (readOnly || annotationMode) return
                event.stopPropagation()
                event.preventDefault()
                setSelectedAnnotationId(annotation.id)
                setSelectedOverlayId(null)
                setSelectedMeasurementId(annotation.type === "measurement" ? annotation.id : null)
              }

              if (!annotation.type || annotation.type === "stroke") {
                return (
                  <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                    <StrokePath
                      stroke={annotation}
                      width={block.width}
                      height={block.height}
                    />
                    {isSelected ? <AnnotationSelection annotation={annotation} width={block.width} height={block.height} /> : null}
                    <AnnotationHitTarget
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                  </g>
                )
              }

              if (annotation.type === "arrow") {
                return (
                  <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                    <ArrowPath
                      arrow={annotation}
                      width={block.width}
                      height={block.height}
                      markerId={`${arrowMarkerPrefix}-${annotation.id}`}
                    />
                    {isSelected ? <AnnotationSelection annotation={annotation} width={block.width} height={block.height} /> : null}
                    <AnnotationHitTarget
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                  </g>
                )
              }

              if (annotation.type === "rect" || annotation.type === "ellipse" || annotation.type === "highlight") {
                return (
                  <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                    <ShapeAnnotation
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                    {isSelected ? <AnnotationSelection annotation={annotation} width={block.width} height={block.height} /> : null}
                    <AnnotationHitTarget
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                  </g>
                )
              }

              if (annotation.type === "measurement") {
                return (
                  <g key={annotation.id} className="cursor-pointer" onPointerDown={selectAnnotation}>
                    <MeasurementAnnotation
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                    {isSelected ? <AnnotationSelection annotation={annotation} width={block.width} height={block.height} /> : null}
                    <AnnotationHitTarget
                      annotation={annotation}
                      width={block.width}
                      height={block.height}
                    />
                  </g>
                )
              }

              return null
            })}
            {draftPoints.length >= 2 && drawMode ? (
              <path
                d={draftPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * block.width} ${point.y * block.height}`).join(" ")}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {draftPoints.length >= 2 && arrowMode ? (
              <ArrowPath
                arrow={{
                  id: "draft",
                  type: "arrow",
                  color: strokeColor,
                  width: strokeWidth,
                  start: draftPoints[0],
                  end: draftPoints[draftPoints.length - 1],
                }}
                width={block.width}
                height={block.height}
                markerId={`${arrowMarkerPrefix}-draft`}
              />
            ) : null}
            {draftPoints.length >= 2 && shapeMode ? (
              <ShapeAnnotation
                annotation={{
                  id: "draft",
                  type: activeTool,
                  color: strokeColor,
                  width: strokeWidth,
                  ...getAnnotationBounds(draftPoints[0], draftPoints[draftPoints.length - 1]),
                  ...(activeTool === "highlight" ? { fill: strokeColor, opacity: 0.28 } : {}),
                }}
                width={block.width}
                height={block.height}
              />
            ) : null}
            {draftPoints.length >= 2 && measurementMode ? (
              <MeasurementAnnotation
                annotation={{
                  id: "draft",
                  type: "measurement",
                  color: strokeColor,
                  width: strokeWidth,
                  start: draftPoints[0],
                  end: draftPoints[draftPoints.length - 1],
                  label: "",
                }}
                width={block.width}
                height={block.height}
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
                if (readOnly || annotationMode) return
                event.stopPropagation()
                event.preventDefault()
                setSelectedOverlayId(overlay.id)
                setSelectedMeasurementId(null)
                setSelectedAnnotationId(null)
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
          {!readOnly ? (
            <Input
              value={block.caption ?? ""}
              onChange={(event) => onChange({ ...block, caption: event.target.value })}
              placeholder="Caption"
              className="bg-white text-sm"
            />
          ) : block.caption?.trim() ? (
            <p className="px-1 text-center text-sm italic leading-6 text-slate-500">
              {block.caption}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
