"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronRight, FilePlus2, FolderPlus, UserPlus, CalendarPlus, BarChart3 } from "lucide-react"
import { api } from "@/lib/api"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { DashboardWorkspaceDrawer } from "@/components/dashboard/dashboard-workspace-drawer"
import { DashboardFrontline } from "@/components/dashboard/dashboard-frontline"
import type { ActionQueueResponse, DashboardSummary } from "@/lib/types/dashboard"

type Appointment = { id: string | number; source: "native" | "google"; title: string; start: string; client_name?: string | null }
type JobStats = Awaited<ReturnType<typeof api.getJobStats>>
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

/** Native Home's order and mobile cards, using the PWA's existing authenticated data sources. */
export function MobileHome({ summary, queue, queueLoading, onRefresh }: {
  summary: DashboardSummary | null
  queue: ActionQueueResponse | null
  queueLoading: boolean
  onRefresh: () => void
}) {
  const locale = useLocale()
  const t = useTranslations("dashboardHome")
  const router = useRouter()
  const [stats, setStats] = useState<JobStats | null>(null)
  const [statsFailed, setStatsFailed] = useState(false)
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [calendarFailed, setCalendarFailed] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  useEffect(() => {
    let active = true
    api.getJobStats().then(value => { if (active) setStats(value) }).catch(() => { if (active) setStatsFailed(true) })
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const months = [now, next].map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    Promise.all(months.map(month => api.getCalendarBookings(month))).then(results => {
      if (!active) return
      const cutoff = Date.now() - 60 * 60 * 1000
      setCalendarLoading(false)
      setUpcoming(results.flatMap(result => result.events ?? [])
        .filter(event => event.start && !Number.isNaN(Date.parse(event.start)) && Date.parse(event.start) >= cutoff)
        .sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3))
    }).catch(() => { if (active) { setCalendarFailed(true); setCalendarLoading(false) } })
    return () => { active = false }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const quick = [
    { label: "Add Project", icon: FolderPlus, tint: "bg-orange-50 text-orange-600", onClick: () => setNewProjectOpen(true) },
    { label: "Add Quote", icon: FilePlus2, tint: "bg-sky-50 text-sky-600", onClick: () => router.push(`/${locale}/quotes/new`) },
    { label: "Add Client", icon: UserPlus, tint: "bg-violet-50 text-violet-600", onClick: () => router.push(`/${locale}/clients/new`) },
    { label: "Calendar", icon: CalendarPlus, tint: "bg-emerald-50 text-emerald-600", onClick: () => router.push(`/${locale}/calendar`) },
  ]
  return <div className="space-y-5 px-4 pb-6 pt-5">
    <h1 className="text-[25px] font-bold leading-tight tracking-tight text-slate-900">{greeting}</h1>

    <section aria-label="Pipeline overview" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-xs font-semibold text-slate-500">Revenue</p>
          <p className="mt-1 text-[31px] font-bold tracking-tight text-slate-900">{stats ? dollars(stats.total_revenue) : statsFailed ? "Unavailable" : "Loading..."}</p>
        </div>
        <Link href={`/${locale}/reports`} className="flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"><BarChart3 size={14} /> Full report <ChevronRight size={13} /></Link>
      </div>
      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
        {[
          { label: t("stageLeads"), count: summary?.leads.new_last_7d, color: "bg-slate-800" },
          { label: t("stageQuoted"), count: summary?.quotes.awaiting_reply_count, color: "bg-sky-500" },
          { label: t("stageAccepted"), count: stats?.accepted_count, color: "bg-emerald-500" },
          { label: t("stageInProgress"), count: stats?.in_progress_count, color: "bg-amber-500" },
        ].map(row => <div key={row.label}>
          <div className="flex justify-between text-xs text-slate-600"><span>{row.label}</span><span className="font-semibold text-slate-900">{row.count ?? "-"}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${Math.min(100, ((row.count ?? 0) / Math.max(summary?.leads.new_last_7d ?? 0, summary?.quotes.awaiting_reply_count ?? 0, stats?.accepted_count ?? 0, stats?.in_progress_count ?? 0, 1)) * 100)}%` }} /></div>
        </div>)}
      </div>
    </section>

    <section aria-label="Quick actions" className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm">
      {quick.map(action => <button key={action.label} type="button" onClick={action.onClick} className="flex min-w-0 flex-col items-center gap-2 rounded-xl px-0.5 py-1 text-center text-[10px] font-semibold text-slate-600 active:bg-slate-50"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tint}`}><action.icon size={19} /></span><span className="leading-tight">{action.label}</span></button>)}
    </section>

    <NeedsYouCard queue={queue} loading={queueLoading} onRefresh={onRefresh} />

    <section aria-label="Upcoming appointments">
      <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><CalendarDays size={17} /> Upcoming</h2><Link href={`/${locale}/calendar`} className="text-xs font-semibold text-sky-700">See all</Link></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {calendarLoading ? <p className="p-4 text-sm text-slate-500">Loading appointments...</p> : calendarFailed ? <p className="p-4 text-sm text-slate-500">Calendar unavailable</p> : upcoming.length === 0 ? <p className="p-4 text-sm text-slate-500">Nothing scheduled</p> : upcoming.map(event => <Link key={`${event.source}-${event.id}`} href={`/${locale}/calendar`} className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{event.title || "Appointment"}</span><span className="block truncate text-xs text-slate-500">{new Date(event.start).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{event.client_name ? ` · ${event.client_name}` : ""}</span></span><ChevronRight size={16} className="shrink-0 text-slate-400" /></Link>)}
      </div>
    </section>

    <DashboardWorkspaceDrawer summary={summary} onRefresh={onRefresh} />
    <section aria-label="AI Activity"><h2 className="mb-2 text-base font-bold text-slate-900">AI Activity</h2><DashboardFrontline /></section>
    <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} onProjectCreated={id => { setNewProjectOpen(false); router.push(`/${locale}/projects/${id}`) }} />
  </div>
}
