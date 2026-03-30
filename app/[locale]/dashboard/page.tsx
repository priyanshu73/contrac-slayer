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
import { CalendarPlus2, FilePlus2, Files, UserPlus } from "lucide-react"

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tActions = useTranslations('dashboard.actions')
  const tNav = useTranslations('navigation')
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
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-[82px] flex-col items-start gap-2 rounded-xl border-sky-200 bg-sky-50 px-3 py-3 text-left hover:bg-sky-100"
            >
              <Link href={`/${locale}/quotes/new`}>
                <FilePlus2 className="h-4 w-4 text-sky-700" />
                <span className="text-lg font-semibold text-slate-900">{t('createQuote') || "Create Quote"}</span>
              </Link>
            </Button>
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
              <Link href={`/${locale}/contacts/new`}>
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

      {/* Mobile Bottom Navigation is now in Navbar component */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Link href={`/${locale}/dashboard`} className="flex flex-col items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs font-medium">{tNav('dashboard')}</span>
          </Link>
          <Link
            href={`/${locale}/leads`}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="text-xs font-medium">{tNav('leads')}</span>
          </Link>
          <Link
            href={`/${locale}/contacts`}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-xs font-medium">Contacts</span>
          </Link>
          <Link
            href={`/${locale}/invoices`}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs font-medium">{tNav('invoices')}</span>
          </Link>
          <Link
            href={`/${locale}/settings`}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs font-medium">{tNav('settings')}</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
