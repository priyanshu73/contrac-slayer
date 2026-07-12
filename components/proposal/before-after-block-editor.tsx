"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import type { BeforeAfterImagePair } from "@/components/before-after-panel"
import { cn } from "@/lib/utils"
import type { ProjectMedia, ProposalBeforeAfterBlock } from "@/lib/types"

export function BeforeAfterBlockEditor({
  block,
  readOnly,
  onChange,
  className,
}: {
  block: ProposalBeforeAfterBlock
  readOnly: boolean
  onChange: (block: ProposalBeforeAfterBlock) => void
  className?: string
}) {
  const t = useTranslations("proposals")
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50/80 p-3", className)}>
      {!readOnly ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <Input
            value={block.beforeLabel ?? ""}
            onChange={(event) => onChange({ ...block, beforeLabel: event.target.value })}
            placeholder={t("imageEditor.before")}
            className="bg-white text-sm"
          />
          <Input
            value={block.afterLabel ?? ""}
            onChange={(event) => onChange({ ...block, afterLabel: event.target.value })}
            placeholder={t("imageEditor.after")}
            className="bg-white text-sm"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <img
            src={block.beforeUrl}
            alt={block.beforeLabel ?? t("imageEditor.before")}
            className="aspect-[4/3] w-full object-cover"
            draggable={false}
          />
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm print:bg-slate-900 print:[backdrop-filter:none]">
            {block.beforeLabel ?? t("imageEditor.before")}
          </span>
        </div>

        {/* After */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
          <img
            src={block.afterUrl}
            alt={block.afterLabel ?? t("imageEditor.after")}
            className="aspect-[4/3] w-full object-cover"
            draggable={false}
          />
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm print:bg-emerald-600 print:[backdrop-filter:none]">
            {block.afterLabel ?? t("imageEditor.after")}
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

export function buildBeforeAfterPairsFromMedia(mediaItems: ProjectMedia[] = []): BeforeAfterImagePair[] {
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
