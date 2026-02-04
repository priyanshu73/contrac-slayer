"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export function ClientsSearch({
  showArchived = false,
  onToggleArchived,
  onShowArchivedChange,
}: {
  showArchived?: boolean
  onToggleArchived?: () => void
  onShowArchivedChange?: (showArchived: boolean) => void
}) {
  const t = useTranslations('search')
  const tFilters = useTranslations('filters')
  
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-input bg-background p-0.5">
        <Button
          type="button"
          size="sm"
          variant={!showArchived ? "secondary" : "ghost"}
          className="h-8 px-3"
          onClick={() => (onShowArchivedChange ? onShowArchivedChange(false) : onToggleArchived?.())}
        >
          {tFilters("active")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showArchived ? "secondary" : "ghost"}
          className="h-8 px-3"
          onClick={() => (onShowArchivedChange ? onShowArchivedChange(true) : onToggleArchived?.())}
        >
          {tFilters("archived")}
        </Button>
      </div>
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input placeholder={t('searchClients')} className="pl-10" />
      </div>
    </div>
  )
}
