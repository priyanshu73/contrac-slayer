"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { FilePlus2, FolderPlus, Plus, UserPlus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GlobalSearch } from "@/components/dashboard/global-search"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import type { ActionQueueResponse, DashboardSummary } from "@/lib/types/dashboard"

export function TodayHeader({
  summary,
  queue,
  showSearch = false,
}: {
  summary: DashboardSummary | null
  queue: ActionQueueResponse | null
  showSearch?: boolean
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("dashboardHome")
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const today = new Date()
  const dateLabel = today.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const parts: string[] = []
  if (queue) parts.push(t("thingsNeedYou", { count: queue.items.length }))
  if (summary) {
    if (summary.money.past_due_count > 0)
      parts.push(t("invoicesPastDue", { count: summary.money.past_due_count }))
    parts.push(
      summary.schedule.booked_today === 0
        ? t("nothingOnCalendar")
        : t("onCalendarToday", { count: summary.schedule.booked_today })
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1
          className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif',
          }}
        >
          {dateLabel}
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {parts.length ? parts.join(" · ") : " "}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {showSearch && <GlobalSearch />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-700">
              {t("new")}
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => router.push(`/${locale}/quotes/new`)}>
              <FilePlus2 className="h-4 w-4" /> {t("newEstimate")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewProjectOpen(true)}>
              <FolderPlus className="h-4 w-4" /> {t("newProject")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${locale}/clients/new`)}>
              <UserPlus className="h-4 w-4" /> {t("newClient")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onProjectCreated={(projectId) => {
          setNewProjectOpen(false)
          router.push(`/${locale}/projects/${projectId}`)
        }}
      />
    </div>
  )
}
