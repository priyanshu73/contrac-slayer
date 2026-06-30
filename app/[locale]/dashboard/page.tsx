"use client"

import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { CalendarPlus2, FilePlus2, FileText, Phone, UserPlus, Link2 } from "lucide-react"

import {
  DashboardActionQueue,
  MOCK_ACTION_ITEMS,
} from "@/components/dashboard/dashboard-action-queue"
import { DashboardFrontline } from "@/components/dashboard/dashboard-frontline"
import { DashboardInvoices } from "@/components/dashboard/dashboard-invoices"
import { DashboardTasks } from "@/components/dashboard/dashboard-tasks"
import { DashboardProjects } from "@/components/dashboard-projects"
import { DashboardWeekStrip } from "@/components/dashboard-week-strip"
import { RecentQuotesReal } from "@/components/recent-quotes-real"
import { OpsAiNumberSetupPrompt } from "@/components/ops-ai-number-setup-prompt"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"
import { formatPhoneForDisplay } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const locale = useLocale()
  const { number: twilioNumber } = useContractorOpsNumber()

  const actions = [
    {
      label: twilioNumber ? formatPhoneForDisplay(twilioNumber) : "AI phone line",
      icon: Phone,
      tone: "sky" as const,
      onClick: () => router.push(`/${locale}/frontline`),
    },
    {
      label: "Quote request link",
      icon: Link2,
      tone: "sky" as const,
      onClick: () => router.push(`/${locale}/leads`),
    },
    {
      label: "Create quote",
      icon: FilePlus2,
      tone: "sky" as const,
      onClick: () => router.push(`/${locale}/quotes/new`),
    },
    {
      label: "Create proposal",
      icon: FileText,
      tone: "indigo" as const,
      onClick: () => router.push(`/${locale}/proposals/new`),
    },
    {
      label: "Schedule",
      icon: CalendarPlus2,
      tone: "emerald" as const,
      onClick: () => router.push(`/${locale}/calendar`),
    },
    {
      label: "Add client",
      icon: UserPlus,
      tone: "amber" as const,
      onClick: () => router.push(`/${locale}/clients/new`),
    },
  ]

  const toneClasses: Record<string, string> = {
    sky: "border-sky-200 text-sky-700 hover:bg-sky-50",
    indigo: "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    emerald: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    amber: "border-amber-200 text-amber-700 hover:bg-amber-50",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-sky-50/40 pb-24 md:pb-6">
      <main className="container mx-auto px-4 pt-3 pb-6">
        <div className="space-y-5">
          {/* Onboarding nudge — self-gated: only renders when the contractor has
              access but hasn't provisioned an AI phone number yet. */}
          <OpsAiNumberSetupPrompt />

          {/* Slim action toolbar */}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${toneClasses[a.tone]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              )
            })}
          </div>

          {/* Row 1 — week-at-a-glance calendar (full width) */}
          <DashboardWeekStrip />

          {/* Active projects + recent quotes — right below the calendar */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <DashboardProjects />
            </div>
            <div className="min-w-0">
              <RecentQuotesReal />
            </div>
          </div>

          {/* Needs attention + Frontline — 1 row, 2 columns */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <DashboardActionQueue items={MOCK_ACTION_ITEMS} loading={false} />
            </div>
            <div className="min-w-0">
              <DashboardFrontline />
            </div>
          </div>

          {/* Tasks + Invoices — 1 row, 2 columns */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <DashboardTasks />
            </div>
            <div className="min-w-0">
              <DashboardInvoices />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
