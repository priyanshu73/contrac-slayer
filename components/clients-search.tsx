"use client"

import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  const statusValue = showArchived ? "archived" : "active"

  const handleStatusChange = (value: string) => {
    const archived = value === "archived"
    onShowArchivedChange ? onShowArchivedChange(archived) : onToggleArchived?.()
  }

  return (
    <div className="flex w-full sm:w-auto min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {/* Status dropdown - Active as default */}
      <Select value={statusValue} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[110px] sm:w-[130px] h-11 sm:h-10 min-h-[44px] sm:min-h-0 border-slate-200 bg-white shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{tFilters("active")}</SelectItem>
          <SelectItem value="archived">{tFilters("archived")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input - full width on mobile, min 44px height for touch */}
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-slate-400" />
        <Input
          placeholder={t("searchClients")}
          className="w-full min-w-0 pl-10 h-11 sm:h-10 min-h-[44px] sm:min-h-0 border-slate-200 bg-white text-base sm:text-sm"
          value={searchQuery || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
    </div>
  )
}
