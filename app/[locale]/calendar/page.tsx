"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircleIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon, PlusIcon, XIcon } from "lucide-react"
import { api } from "@/lib/api"
import { MonthlyCalendar } from "@/components/ui/monthly-calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Booking = Record<string, any>

const WEEKDAYS = [
  { key: "sunday", short: "S", label: "Sunday" },
  { key: "monday", short: "M", label: "Monday" },
  { key: "tuesday", short: "T", label: "Tuesday" },
  { key: "wednesday", short: "W", label: "Wednesday" },
  { key: "thursday", short: "Th", label: "Thursday" },
  { key: "friday", short: "F", label: "Friday" },
  { key: "saturday", short: "S", label: "Saturday" },
] as const
type WeekdayKey = (typeof WEEKDAYS)[number]["key"]

type TimeRange = { start: string; end: string }
type WeeklyHours = Record<WeekdayKey, TimeRange[]>

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function minutesToHHMM(m: number) {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

function hhmmToMinutes(hhmm: string): number {
  const m = String(hhmm || "").trim().match(/^(\d{2}):(\d{2})$/)
  if (!m) return 0
  const hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return hh * 60 + mm
}

function hhmmToLabel(hhmm: string): string {
  const mins = hhmmToMinutes(hhmm)
  const hh24 = Math.floor(mins / 60)
  const mm = mins % 60
  const ap = hh24 >= 12 ? "PM" : "AM"
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12
  return `${hh12}:${pad2(mm)} ${ap}`
}

function hhmmToApiTime(hhmm: string): string {
  // NeetoCal expects "HH:MM AM/PM" (2-digit hour).
  const mins = hhmmToMinutes(hhmm)
  const hh24 = Math.floor(mins / 60)
  const mm = mins % 60
  const ap = hh24 >= 12 ? "PM" : "AM"
  const hh12raw = hh24 % 12 === 0 ? 12 : hh24 % 12
  return `${pad2(hh12raw)}:${pad2(mm)} ${ap}`
}

function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function bookingStartDate(b: Booking): Date | null {
  const raw = b?.start_time || b?.start_at || b?.start || b?.scheduled_at
  if (!raw) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function bookingTitle(b: Booking) {
  return b?.title || b?.event_name || b?.meeting_name || "Booking"
}

function bookingTimeLabel(b: Booking) {
  const dt = bookingStartDate(b)
  if (!dt) return ""
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function bookingEndDate(b: Booking): Date | null {
  const raw = b?.end_time || b?.end_at || b?.end
  if (!raw) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function formatMonthTitle(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

function formatDayTitle(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
}

function availabilityId(a: any): string | undefined {
  const id = a?.id || a?.sid || a?.availability_sid || a?.availability_id
  return typeof id === "string" && id.trim() ? id.trim() : undefined
}

function normalizeWday(raw: unknown): WeekdayKey | null {
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase()
    if (WEEKDAYS.some((d) => d.key === (s as any))) return s as WeekdayKey
    // try short forms
    const map: Record<string, WeekdayKey> = {
      mon: "monday",
      tue: "tuesday",
      wed: "wednesday",
      thu: "thursday",
      fri: "friday",
      sat: "saturday",
      sun: "sunday",
    }
    if (map[s]) return map[s]
    return null
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // best-effort: 0=sunday ... 6=saturday
    const idx = Math.max(0, Math.min(6, Math.floor(raw)))
    const map: WeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return map[idx] || null
  }
  return null
}

function normalizeTimeToHHMM(raw: unknown): string {
  const s = String(raw || "").trim()
  if (!s) return ""
  // already 24h time
  if (/^\d{2}:\d{2}$/.test(s)) return s

  // ISO datetime (NeetoCal periods sometimes return full ISO timestamps)
  // Example: "2000-01-01T09:00:00.000Z"
  if (s.includes("T") && (s.endsWith("Z") || s.includes("+") || s.includes("-"))) {
    const dt = new Date(s)
    if (!Number.isNaN(dt.getTime())) {
      const useUtc = s.endsWith("Z")
      const hh = useUtc ? dt.getUTCHours() : dt.getHours()
      const mm = useUtc ? dt.getUTCMinutes() : dt.getMinutes()
      return `${pad2(hh)}:${pad2(mm)}`
    }
  }

  // "9:00 AM" / "09:00 PM"
  const m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (m) {
    const hh = parseInt(m[1] || "0", 10)
    const mm = parseInt(m[2] || "0", 10)
    const ap = (m[3] || "").toUpperCase()
    if (Number.isNaN(hh) || Number.isNaN(mm)) return ""
    const hour24 = ap === "PM" ? (hh % 12) + 12 : hh % 12
    return `${pad2(hour24)}:${pad2(mm)}`
  }
  // fallback: keep as-is (but Input[type=time] expects HH:MM)
  return ""
}

function availabilityDays(a: any): WeekdayKey[] {
  const d1 = a?.days
  const d2 = a?.available_days
  if (Array.isArray(d1)) return d1.map(String).map((x) => normalizeWday(x)).filter(Boolean) as WeekdayKey[]
  if (Array.isArray(d2)) return d2.map(String).map((x) => normalizeWday(x)).filter(Boolean) as WeekdayKey[]
  // NeetoCal PATCH docs talk about periods[{wday,...}]
  const periods = a?.periods
  if (Array.isArray(periods)) {
    return periods
      .map((p: any) => normalizeWday(p?.wday || p?.weekday || p?.day))
      .filter(Boolean) as WeekdayKey[]
  }
  return []
}

function DayPill({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        "bg-white/60 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
        active ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700"
      )}
      aria-pressed={active}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-300")} />
      <span className="font-medium">{label}</span>
    </button>
  )
}

function DayTimeline({
  day,
  bookings,
}: {
  day: Date
  bookings: Booking[]
}) {
  const startHour = 6
  const endHour = 20
  const pxPerHour = 44
  const totalHeight = (endHour - startHour) * pxPerHour

  const items = bookings
    .map((b) => {
      const start = bookingStartDate(b)
      if (!start) return null
      const end = bookingEndDate(b) || new Date(start.getTime() + 30 * 60 * 1000)
      return { b, start, end }
    })
    .filter(Boolean) as Array<{ b: Booking; start: Date; end: Date }>

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Daily view</div>
          <div className="text-sm text-slate-500">{formatDayTitle(day)}</div>
        </div>
        <div className="text-xs text-slate-500 tabular-nums">{bookings.length} event(s)</div>
      </div>

      <Separator className="my-4" />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500">
          Nothing scheduled for this day.
        </div>
      ) : (
        <div className="relative" style={{ height: totalHeight }}>
          {/* hour grid */}
          {Array.from({ length: endHour - startHour + 1 }).map((_, idx) => {
            const hour = startHour + idx
            const top = idx * pxPerHour
            const label = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).toLocaleTimeString([], {
              hour: "numeric",
            })
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                <div className="flex items-center gap-3">
                  <div className="w-14 text-right text-[11px] text-slate-400">{label}</div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              </div>
            )
          })}

          {/* events */}
          {items.map(({ b, start }, idx) => {
            const minutesFromStart = (start.getHours() - startHour) * 60 + start.getMinutes()
            const top = (minutesFromStart / 60) * pxPerHour
            return (
              <div key={idx} className="absolute left-[72px] right-2" style={{ top }}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-indigo-600" />
                  <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{bookingTitle(b)}</div>
                      <div className="whitespace-nowrap text-xs text-slate-500 tabular-nums">{bookingTimeLabel(b)}</div>
                    </div>
                    {b?.status ? <div className="mt-1 text-xs text-slate-500">{String(b.status)}</div> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [notice, setNotice] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeAvailabilityId, setActiveAvailabilityId] = useState<string>("")

  const [month, setMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() => new Date())

  const browserTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const [timeZone, setTimeZone] = useState<string>(() => browserTz || "America/New_York")
  const [timeZoneSource, setTimeZoneSource] = useState<"neetocal" | "browser" | "manual" | "default">(
    () => (browserTz ? "browser" : "default")
  )

  const timeOptions = useMemo(() => {
    const step = 30 // minutes
    const opts: Array<{ value: string; label: string }> = []
    for (let m = 0; m < 24 * 60; m += step) {
      const v = minutesToHHMM(m)
      opts.push({ value: v, label: hhmmToLabel(v) })
    }
    return opts
  }, [])

  const timeZoneOptions = useMemo(() => {
    const fallback = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Toronto",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Kathmandu",
      "Asia/Tokyo",
      "Australia/Sydney",
    ]
    const supported = (Intl as any).supportedValuesOf?.("timeZone")
    const base = Array.isArray(supported) && supported.length ? (supported as string[]) : fallback
    const set = new Set(base)
    const extra: string[] = []
    if (timeZone && !set.has(timeZone)) extra.push(timeZone)
    if (browserTz && !set.has(browserTz)) extra.push(browserTz)
    return [...extra, ...base]
  }, [browserTz, timeZone])

  // Availability editor (weekly hours like NeetoCal)
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => ({
    sunday: [],
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "17:00" }],
    thursday: [{ start: "09:00", end: "17:00" }],
    friday: [{ start: "09:00", end: "17:00" }],
    saturday: [],
  }))
  const [quickDays, setQuickDays] = useState<Record<WeekdayKey, boolean>>(() => ({
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
  }))
  const [quickStart, setQuickStart] = useState("09:00")
  const [quickEnd, setQuickEnd] = useState("17:00")
  const [savingAvailability, setSavingAvailability] = useState(false)

  const calendarLink = profile?.calendar_link as string | undefined

  const bookingsByDay = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    for (const b of bookings) {
      const dt = bookingStartDate(b)
      if (!dt) continue
      const key = dateKeyLocal(dt)
      map[key] = map[key] || []
      map[key].push(b)
    }
    // stable sorting within day
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const da = bookingStartDate(a)?.getTime() ?? 0
        const db = bookingStartDate(b)?.getTime() ?? 0
        return da - db
      })
    }
    return map
  }, [bookings])

  const selectedKey = selectedDay ? dateKeyLocal(selectedDay) : ""
  const selectedDayBookings = selectedKey ? bookingsByDay[selectedKey] || [] : []

  const applyAvailabilityToForm = (a: any) => {
    if (!a) return
    const id = availabilityId(a)
    if (id) setActiveAvailabilityId(id)

    const next: WeeklyHours = {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    }

    const periods = Array.isArray(a?.periods) ? a.periods : null
    if (periods && periods.length) {
      for (const p of periods) {
        const w = normalizeWday(p?.wday || p?.weekday || p?.day)
        const s = normalizeTimeToHHMM(p?.start_time || p?.start || p?.from)
        const e = normalizeTimeToHHMM(p?.end_time || p?.end || p?.to)
        if (!w || !s || !e) continue
        next[w].push({ start: s, end: e })
      }
    } else {
      // Fallback: legacy flat shape
      const ds = availabilityDays(a)
      const start = normalizeTimeToHHMM(a?.start_time || a?.start) || "09:00"
      const end = normalizeTimeToHHMM(a?.end_time || a?.end) || "17:00"
      for (const d of ds) next[d] = [{ start, end }]
    }

    // Sort ranges for nicer UX
    for (const k of Object.keys(next) as WeekdayKey[]) {
      next[k].sort((a, b) => a.start.localeCompare(b.start))
    }
    setWeeklyHours(next)

    const enabledDays = (Object.keys(next) as WeekdayKey[]).filter((k) => next[k].length > 0)
    setQuickDays((prev) => {
      const out = { ...prev } as Record<WeekdayKey, boolean>
      for (const k of Object.keys(out) as WeekdayKey[]) out[k] = false
      for (const k of enabledDays) out[k] = true
      return out
    })

    // If everything is a single identical range, reflect it in quick-set defaults
    const singleRangeDays = enabledDays.filter((k) => next[k].length === 1)
    if (singleRangeDays.length === enabledDays.length && enabledDays.length > 0) {
      const first = enabledDays[0]
      const base = next[first][0]
      const allSame = enabledDays.every((k) => next[k][0].start === base.start && next[k][0].end === base.end)
      if (allSame) {
        setQuickStart(base.start)
        setQuickEnd(base.end)
      }
    }
  }

  const refreshSingleAvailability = async () => {
    const res = await api.getSingleAvailability()
    const data = (res as any)?.data ?? null
    const availability = data?.availability ?? data
    const tz = data?.team_member?.time_zone as string | undefined
    if (tz && tz.trim()) {
      setTimeZone(tz.trim())
      setTimeZoneSource("neetocal")
    }
    if (availability) applyAvailabilityToForm(availability)
    return availability
  }

  const refreshTimeZone = async () => {
    try {
      const res = await api.getAvailabilityTimeZone()
      const tz = (res as any)?.data?.time_zone as string | undefined
      if (tz && typeof tz === "string" && tz.trim()) {
        setTimeZone(tz.trim())
        setTimeZoneSource("neetocal")
      } else if (browserTz) {
        setTimeZone((prev) => (prev ? prev : browserTz))
        setTimeZoneSource("browser")
      }
    } catch {
      if (browserTz) {
        setTimeZone((prev) => (prev ? prev : browserTz))
        setTimeZoneSource("browser")
      }
    }
  }

  const load = async () => {
    setError("")
    setNotice("")
    setLoading(true)
    try {
      const p = await api.getMyProfile()
      setProfile(p)

      const res = await api.getNeetoBookings({ page_size: 200, type: "upcoming" })
      const data = (res as any)?.data ?? res
      const list = Array.isArray(data) ? data : (data?.bookings ?? data?.data ?? [])
      setBookings(Array.isArray(list) ? list : [])

      try {
        await refreshTimeZone()
        await refreshSingleAvailability()
      } catch {
        // keep calendar usable even if availability fetch fails
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSaveAvailability = async () => {
    setError("")
    setNotice("")
    setSavingAvailability(true)
    try {
      const payload = {
        email: profile?.email,
        time_zone: timeZone,
        // NeetoCal canonical shape:
        periods: (Object.keys(weeklyHours) as WeekdayKey[]).flatMap((wday) =>
          (weeklyHours[wday] || [])
            .filter((r) => r.start && r.end)
            .map((r) => ({ wday, start_time: hhmmToApiTime(r.start), end_time: hhmmToApiTime(r.end) }))
        ),
      }

      await api.upsertSingleAvailability(payload)
      setNotice(activeAvailabilityId ? "Availability updated." : "Availability saved.")
      await refreshSingleAvailability()
    } catch (e: any) {
      setError(e?.message || "Failed to save availability")
    } finally {
      setSavingAvailability(false)
    }
  }

  const applyUniformToSelectedDays = () => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      for (const d of WEEKDAYS.map((x) => x.key)) {
        if (quickDays[d]) {
          next[d] = [{ start: quickStart, end: quickEnd }]
        } else {
          // If user didn't select the day, treat it as unavailable for the uniform apply action
          next[d] = []
        }
      }
      return next
    })
    setNotice("Applied uniform hours (not saved yet).")
  }

  const addRangeForDay = (day: WeekdayKey) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      const existing = next[day] || []
      const last = existing[existing.length - 1]
      next[day] = [...existing, { start: last?.start || quickStart, end: last?.end || quickEnd }]
      return next
    })
  }

  const removeRangeForDay = (day: WeekdayKey, idx: number) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      next[day] = (next[day] || []).filter((_, i) => i !== idx)
      return next
    })
  }

  const updateRangeForDay = (day: WeekdayKey, idx: number, field: "start" | "end", value: string) => {
    setWeeklyHours((prev) => {
        const next = { ...prev }
      next[day] = (next[day] || []).map((r, i) => (i === idx ? { ...r, [field]: value } : r))
        return next
      })
    }

  const copyDayToSelectedDays = (from: WeekdayKey) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      const ranges = (prev[from] || []).map((r) => ({ ...r }))
      for (const d of WEEKDAYS.map((x) => x.key)) {
        if (!quickDays[d]) continue
        next[d] = ranges
      }
      return next
    })
    setNotice("Copied hours to selected days (not saved yet).")
  }

  const onCopyLink = async () => {
    if (!calendarLink) return
    try {
      await navigator.clipboard.writeText(calendarLink)
      setCopied(true)
      toast({ description: "Scheduling link copied." })
    } catch {
      toast({ description: "Could not copy link.", variant: "destructive" as any })
    }
  }

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {notice ? (
            <Alert>
              <CheckCircle2Icon />
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Tabs defaultValue="calendar" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="availability">Set availability</TabsTrigger>
            </TabsList>
            </div>

          <TabsContent value="calendar" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              {loading ? (
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-10 w-10 rounded-md" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={`h-${i}`} className="h-8 w-full" />
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                      <Skeleton key={`d-${i}`} className="h-10 w-10 rounded-xl" />
                    ))}
                  </div>
                </Card>
              ) : (
                <MonthlyCalendar
                  month={month}
                selected={selectedDay}
                onMonthChange={setMonth}
                  getCount={(d) => bookingsByDay[dateKeyLocal(d)]?.length ?? 0}
                  onSelect={(d) => {
                    setSelectedDay(d)
                    if (!isSameMonth(d, month)) setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                  }}
                />
              )}

          <div className="space-y-6 lg:sticky lg:top-24 self-start">
            {loading ? (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </Card>
            ) : (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">
                    {selectedDay
                      ? selectedDay.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })
                      : "Bookings"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedDayBookings.length === 0 ? "No bookings." : `${selectedDayBookings.length} booking(s).`}
                  </div>
                </div>
                  <Button variant="outline" onClick={load} disabled={loading}>
                    Refresh
                  </Button>
              </div>

              <Separator className="my-4" />

              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-4">
                  {selectedDayBookings.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nothing scheduled.</div>
                  ) : (
                    selectedDayBookings.map((b, idx) => (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{bookingTitle(b)}</div>
                            <div className="text-sm text-muted-foreground">{bookingTimeLabel(b)}</div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{b?.status || ""}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="text-sm font-medium">Scheduling link</div>
                {calendarLink ? (
                  <div className="flex items-center gap-2">
                    <Input value={calendarLink} readOnly className="text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={onCopyLink}
                        aria-label="Copy scheduling link"
                      >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button asChild type="button" variant="outline" size="icon" aria-label="Open scheduling link">
                      <a href={calendarLink} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No scheduling link saved yet.</div>
                )}
                {copied ? <div className="text-xs text-muted-foreground">Copied.</div> : null}
              </div>
            </Card>
            )}
              </div>
                  </div>
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <Card className="p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xl font-semibold">Weekly hours</div>
                  <div className="text-sm text-muted-foreground">Set when you are typically available for meetings</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={refreshSingleAvailability} disabled={loading}>
                    Reload
                  </Button>
                  <Button type="button" onClick={onSaveAvailability} disabled={savingAvailability || !profile?.email}>
                  {savingAvailability ? "Saving…" : "Save"}
                </Button>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid gap-6">
                <div className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-medium">Apply uniform hours</div>
                      <div className="text-sm text-muted-foreground">Select days and apply the same start/end time.</div>
                    </div>
                    <Button type="button" variant="outline" onClick={applyUniformToSelectedDays}>
                      Apply
                    </Button>
                </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setQuickDays((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                          quickDays[d.key] ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        )}
                      >
                        {d.short}
                      </button>
                    ))}
                </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Start</div>
                      <Select
                        value={quickStart}
                        onValueChange={(v) => {
                          setQuickStart(v)
                          // keep end >= start when possible
                          if (hhmmToMinutes(quickEnd) < hhmmToMinutes(v)) setQuickEnd(v)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">End</div>
                      <Select
                        value={quickEnd}
                        onValueChange={(v) => {
                          setQuickEnd(v)
                          if (hhmmToMinutes(v) < hhmmToMinutes(quickStart)) setQuickStart(v)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Timezone</div>
                      <Select
                        value={timeZone}
                        onValueChange={(v) => {
                          setTimeZone(v)
                          setTimeZoneSource("manual")
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeZoneOptions.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        Using:{" "}
                        <span className="font-mono">
                          {timeZoneSource === "neetocal"
                            ? "NeetoCal"
                            : timeZoneSource === "browser"
                              ? "Browser"
                              : timeZoneSource === "manual"
                                ? "Manual"
                                : "Default"}
                        </span>
                        {" · "}
                        Current: <span className="font-mono">{timeZone}</span>
                        {" · "}
                        Browser: <span className="font-mono">{browserTz || "unknown"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border">
                  {WEEKDAYS.map((d, idx) => {
                    const ranges = weeklyHours[d.key] || []
                    const isUnavailable = ranges.length === 0
                    return (
                      <div key={d.key} className={cn("p-4 md:p-5", idx > 0 ? "border-t" : "")}>
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            {d.short}
                  </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">{d.label}</div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => addRangeForDay(d.key)}
                                aria-label={`Add time range for ${d.label}`}
                              >
                                <PlusIcon className="h-4 w-4" />
                              </Button>
                            </div>

                            {isUnavailable ? (
                              <div className="mt-2 text-sm text-muted-foreground">Unavailable</div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {ranges.map((r, i) => (
                                  <div key={i} className="flex flex-wrap items-center gap-2">
                                    <Select
                                      value={r.start}
                                      onValueChange={(v) => {
                                        updateRangeForDay(d.key, i, "start", v)
                                        if (hhmmToMinutes(r.end) < hhmmToMinutes(v)) updateRangeForDay(d.key, i, "end", v)
                                      }}
                                    >
                                      <SelectTrigger className="w-[160px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions.map((t) => (
                                          <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-muted-foreground">–</span>
                                    <Select
                                      value={r.end}
                                      onValueChange={(v) => {
                                        updateRangeForDay(d.key, i, "end", v)
                                        if (hhmmToMinutes(v) < hhmmToMinutes(r.start)) updateRangeForDay(d.key, i, "start", v)
                                      }}
                                    >
                                      <SelectTrigger className="w-[160px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions.map((t) => (
                                          <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeRangeForDay(d.key, i)}
                                      aria-label={`Remove time range ${i + 1} for ${d.label}`}
                                    >
                                      <XIcon className="h-4 w-4" />
                                    </Button>

                                    {i === ranges.length - 1 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyDayToSelectedDays(d.key)}
                                        aria-label={`Copy ${d.label} hours to selected days`}
                                      >
                                        <CopyIcon className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-xs text-muted-foreground">
                  {activeAvailabilityId ? (
                    <>
                      Loaded availability id: <span className="font-mono">{activeAvailabilityId}</span>
                    </>
                  ) : (
                    <>No existing availability found yet (saving will create one).</>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
