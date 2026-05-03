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
    <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
      <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:hidden">
        <button
          type="button"
          onClick={() => handleStatusChange("active")}
          className={`h-10 rounded-md px-3 text-sm font-semibold transition-colors ${
            !showArchived ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600"
          }`}
        >
          {tFilters("active")}
        </button>
        <button
          type="button"
          onClick={() => handleStatusChange("archived")}
          className={`h-10 rounded-md px-3 text-sm font-semibold transition-colors ${
            showArchived ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600"
          }`}
        >
          {tFilters("archived")}
        </button>
      </div>

      {/* Status dropdown remains on larger layouts where it saves horizontal space. */}
      <Select value={statusValue} onValueChange={handleStatusChange}>
        <SelectTrigger className="hidden h-11 min-h-[44px] w-full shrink-0 rounded-lg border-slate-200 bg-white shadow-sm sm:flex sm:h-10 sm:w-[130px] sm:min-h-0 sm:shadow-none">
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
          className="h-12 min-h-[44px] w-full min-w-0 rounded-lg border-slate-200 bg-white pl-10 text-base shadow-sm sm:h-10 sm:min-h-0 sm:text-sm sm:shadow-none"
          value={searchQuery || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
    </div>
  )
}
