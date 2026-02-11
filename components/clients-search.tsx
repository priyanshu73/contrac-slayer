"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

export function ClientsSearch({
  showArchived = false,
  onToggleArchived,
  onShowArchivedChange,
  searchQuery = "",
  onSearchChange,
}: {
  showArchived?: boolean
  onToggleArchived?: () => void
  onShowArchivedChange?: (showArchived: boolean) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}) {
  const t = useTranslations('search')
  const tFilters = useTranslations('filters')
  
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      {/* Filter Tabs */}
      <div className="inline-flex w-fit shrink-0 items-center rounded-lg border border-slate-200 bg-white p-1">
        <Button
          type="button"
          size="sm"
          variant={!showArchived ? "default" : "ghost"}
          className={`h-8 px-4 rounded-md transition-all ${
            showArchived ? "text-slate-500 hover:text-slate-700 hover:bg-slate-50" : ""
          }`}
          onClick={() => (onShowArchivedChange ? onShowArchivedChange(false) : onToggleArchived?.())}
        >
          {tFilters("active")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showArchived ? "default" : "ghost"}
          className={`h-8 px-4 rounded-md transition-all ${
            !showArchived ? "text-slate-500 hover:text-slate-700 hover:bg-slate-50" : ""
          }`}
          onClick={() => (onShowArchivedChange ? onShowArchivedChange(true) : onToggleArchived?.())}
        >
          {tFilters("archived")}
        </Button>
      </div>
      
      {/* Search Input */}
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-slate-400" />
        <Input 
          placeholder={t('searchClients')} 
          className="w-full pl-10 h-10 border-slate-200 bg-white"
          value={searchQuery || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
    </div>
  )
}
