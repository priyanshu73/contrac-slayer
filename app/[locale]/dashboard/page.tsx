"use client"

import { useCallback, useEffect, useState } from "react"
import { StatsCardsReal } from "@/components/stats-cards-real"
import { DashboardProjects } from "@/components/dashboard-projects"
import { UpcomingJobs } from "@/components/upcoming-jobs"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import { CalendarPlus2, Copy, FilePlus2, Files, UserPlus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tActions = useTranslations('dashboard.actions')
  const locale = useLocale()
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [clients, setClients] = useState<CreateAppointmentClient[]>([])
  const [profile, setProfile] = useState<{ time_zone?: string; calendar_link?: string } | null>(null)

  const refetchClients = useCallback(() => {
    api
      .getClients(0, 500)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : []
        setClients(
          list.map((c: any) => ({
            id: c.id,
            name: c.name || c.full_name || "",
            email: c.email || "",
            address: c.address_data?.formatted_address?.trim() || c.address?.trim() || undefined,
          }))
        )
      })
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    api
      .getMyProfile()
      .then((p: any) => {
        setProfile({
          time_zone: p?.time_zone,
          calendar_link: p?.calendar_link,
        })
      })
      .catch(() => setProfile(null))
  }, [])

  useEffect(() => {
    if (!createAppointmentOpen) return
    refetchClients()
  }, [createAppointmentOpen, refetchClients])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-sky-50/40 pb-24 md:pb-6">

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Stats Overview */}
          <StatsCardsReal />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto min-h-[82px] flex-col items-start gap-2 rounded-xl border-sky-200 bg-sky-50 px-3 py-3 text-left hover:bg-sky-100"
                >
                  <FilePlus2 className="h-4 w-4 text-sky-700" />
                  <span className="text-lg font-semibold text-slate-900">{t('createQuote') || "Create Quote"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1.5" sideOffset={6}>
                <Link
                  href={`/${locale}/quotes/new`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-800 transition-colors"
                >
                  <FilePlus2 className="h-4 w-4 text-sky-600" />
                  New Blank Quote
                </Link>
                <Link
                  href={`/${locale}/quotes/copy`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-800 transition-colors"
                >
                  <Copy className="h-4 w-4 text-sky-600" />
                  Copy Existing Quote
                </Link>
              </PopoverContent>
            </Popover>
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-[82px] flex-col items-start gap-2 rounded-xl border-indigo-200 bg-indigo-50 px-3 py-3 text-left hover:bg-indigo-100"
            >
              <Link href={`/${locale}/quotes`}>
                <Files className="h-4 w-4 text-indigo-700" />
                <span className="text-lg font-semibold text-slate-900">View Quotes</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-[82px] flex-col items-start gap-2 rounded-xl border-emerald-200 bg-emerald-50 px-3 py-3 text-left hover:bg-emerald-100"
              onClick={() => setCreateAppointmentOpen(true)}
            >
              <CalendarPlus2 className="h-4 w-4 text-emerald-700" />
              <span className="text-lg font-semibold text-slate-900">Schedule Appointment</span>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-[82px] flex-col items-start gap-2 rounded-xl border-amber-200 bg-amber-50 px-3 py-3 text-left hover:bg-amber-100"
            >
              <Link href={`/${locale}/clients/new`}>
                <UserPlus className="h-4 w-4 text-amber-700" />
                <span className="text-lg font-semibold text-slate-900">{tActions('addClient') || "Add Client"}</span>
              </Link>
            </Button>
          </div>

          {/* Recent Activity - Quotes and Upcoming Meetings equal width */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <DashboardProjects />
            </div>
            <div className="min-w-0">
              <UpcomingJobs />
            </div>
          </div>
        </div>

        <CreateAppointmentDialog
          open={createAppointmentOpen}
          onOpenChange={setCreateAppointmentOpen}
          clients={clients}
          profile={profile}
          onClientCreated={refetchClients}
        />
      </main>
    </div>
  )
}
