"use client"

import { ImagePlus, Plus, Type } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * A thin, hover-revealed "+" that lives in the gap between blocks so the user
 * can insert a block at that exact position (not only append at the end).
 * Always visible on touch/small screens, which have no hover.
 */
export function InsertBlockBar({
  onAddText,
  onAddImage,
  addTextLabel,
  addImageLabel,
  insertLabel,
  className,
}: {
  onAddText: () => void
  onAddImage: () => void
  addTextLabel: string
  addImageLabel: string
  insertLabel: string
  className?: string
}) {
  return (
    <div className={cn("group/insert relative flex h-4 items-center justify-center", className)}>
      <span className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-sky-300 opacity-0 transition-opacity group-hover/insert:opacity-100" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={insertLabel}
            className={cn(
              "relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-sky-300 bg-white text-sky-500 shadow-sm transition",
              "opacity-0 hover:bg-sky-50 group-hover/insert:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
              "data-[state=open]:opacity-100",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-44">
          <DropdownMenuItem onClick={onAddText}>
            <Type className="mr-2 h-4 w-4" />
            {addTextLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddImage}>
            <ImagePlus className="mr-2 h-4 w-4" />
            {addImageLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
