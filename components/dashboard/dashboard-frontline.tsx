"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import {
  CalendarCheck,
  ChevronRight,
  PhoneCall,
  PhoneMissed,
  UserPlus2,
  MessageSquare,
  PhoneForwarded,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { cn, formatPhoneForDisplay } from "@/lib/utils"
import type { FrontlineActivityEvent, FrontlineStats } from "@/lib/types/frontline"

function relativeTime(iso?: string | null): string {
  if (!iso) return ""
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""
  const diffMs = Date.now() - then.getTime()
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d`
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Map an event's status/type to an icon + accent. The frontline feed uses
// free-form status strings, so match on keywords defensively.
function eventVisual(event: FrontlineActivityEvent): { icon: LucideIcon; tint: string } {
  const key = `${event.event_type ?? ""} ${event.status ?? ""} ${event.title ?? ""}`.toLowerCase()
  if (/(book|appoint|schedul)/.test(key)) return { icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-600" }
  if (/(lead|new)/.test(key)) return { icon: UserPlus2, tint: "bg-sky-50 text-sky-600" }
  if (/(miss|voicemail|no.?answer)/.test(key)) return { icon: PhoneMissed, tint: "bg-rose-50 text-rose-600" }
  if (/(handoff|transfer|sent.?to)/.test(key)) return { icon: PhoneForwarded, tint: "bg-amber-50 text-amber-600" }
  if (/(text|sms|message)/.test(key)) return { icon: MessageSquare, tint: "bg-violet-50 text-violet-600" }
  return { icon: PhoneCall, tint: "bg-slate-100 text-slate-600" }
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1">
      <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  )
}

export function DashboardFrontline() {
  const locale = useLocale()
  const [stats, setStats] = useState<FrontlineStats | null>(null)
  const [events, setEvents] = useState<FrontlineActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const tz =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    Promise.allSettled([api.getFrontlineStats(tz), api.getFrontlineActivity(8)])
      .then(([s, a]) => {
        if (cancelled) return
        if (s.status === "fulfilled") setStats(s.value)
        if (a.status === "fulfilled") setEvents(a.value?.events ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // "Today" from the weekly bucket if present, else fall back to 30-day totals.
  const todayKey = new Date().toISOString().slice(0, 10)
  const today = stats?.weekly_calls?.find((d) => d.date === todayKey)
  const callsToday = today ? today.answered + today.sent_to_you : null
  const sentToYou = today?.sent_to_you ?? stats?.last_30d.handoffs ?? 0

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            Your Frontline
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">Calls your AI line handled for you</p>
        </div>
        <Link
          href={`/${locale}/frontline`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          Open <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stat row */}
      {loading ? (
        <div className="mb-3 h-12 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <div className="mb-3 flex items-stretch gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
          <Stat value={callsToday ?? stats?.last_30d.calls_handled ?? 0} label={callsToday != null ? "calls today" : "calls · 30d"} />
          <div className="w-px bg-slate-200" />
          <Stat value={stats?.last_30d.texts_handled ?? 0} label="texts · 30d" />
          <div className="w-px bg-slate-200" />
          <Stat value={sentToYou} label="sent to you" />
        </div>
      )}

      {/* Recent activity */}
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-50">
              <PhoneCall className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">No calls yet</p>
            <p className="text-xs text-muted-foreground">Activity from your AI line shows here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 5).map((event) => {
              const { icon: Icon, tint } = eventVisual(event)
              const sub = event.detail || (event.customer_number ? formatPhoneForDisplay(event.customer_number) : "")
              return (
                <div key={event.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tint)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight text-slate-900">{event.title}</p>
                    {sub ? <p className="truncate text-xs leading-tight text-slate-500">{sub}</p> : null}
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{relativeTime(event.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
