"use client"

import type { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, MoveDown, MoveUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Wraps a proposal block as a @dnd-kit sortable item and renders a single,
 * consistent structural-control rail (drag · move up · move down · delete) for
 * EVERY block type. The rail floats just above the block and is revealed on
 * hover/focus (always visible on touch/small screens, which have no hover), so
 * the editing canvas stays uncluttered and reads like a document.
 *
 * Block editors render only their own *content* controls (image tools, labels,
 * rich-text toolbar) — structural controls live here so they're identical
 * across text, image, and before/after blocks.
 */
export function SortableBlock({
  id,
  disabled,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
  moveUpLabel,
  moveDownLabel,
  deleteLabel,
  dragLabel,
  children,
}: {
  id: string
  /** Read-only mode: no rail, not draggable. */
  disabled?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  moveUpLabel?: string
  moveDownLabel?: string
  deleteLabel?: string
  dragLabel?: string
  children: ReactNode
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative transition", isDragging && "z-10 opacity-70")}
    >
      {!disabled ? (
        <div
          className={cn(
            "absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-0.5 shadow-sm",
            "opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100",
            // Touch/small screens have no hover — keep the rail visible there.
            "max-sm:opacity-100",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-slate-400 hover:text-slate-700 active:cursor-grabbing"
            aria-label={dragLabel ?? "Drag to reorder"}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
            aria-label={moveUpLabel ?? "Move up"}
          >
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
            aria-label={moveDownLabel ?? "Move down"}
          >
            <MoveDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-red-400 hover:bg-red-50 hover:text-red-600"
            aria-label={deleteLabel ?? "Delete block"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      {children}
    </div>
  )
}
