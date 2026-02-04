"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircleIcon, Calendar as CalendarIcon, CheckIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon, Eye, HelpCircleIcon, MapPin, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react"
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cn, formatPhoneForDisplay } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"

type Booking = Record<string, any>

const NEETOCAL_TEAM_MEMBER_CACHE_KEY = "neetocal_team_member"

function getCachedTeamMember(): { team_member_id?: string; email?: string; time_zone?: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(NEETOCAL_TEAM_MEMBER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { team_member_id?: string; email?: string; time_zone?: string }
    return parsed && (parsed.team_member_id || parsed.time_zone) ? parsed : null
  } catch {
    return null
  }
}

function setCachedTeamMember(obj: { team_member_id?: string; email?: string; time_zone?: string } | null) {
  if (typeof window === "undefined") return
  try {
    if (obj && (obj.team_member_id != null || obj.time_zone != null)) {
      window.localStorage.setItem(NEETOCAL_TEAM_MEMBER_CACHE_KEY, JSON.stringify(obj))
    } else {
      window.localStorage.removeItem(NEETOCAL_TEAM_MEMBER_CACHE_KEY)
    }
  } catch {
    // ignore
  }
}

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

/** Parse NeetoCal slot start_time (e.g. "09:00", "09:00:00", or "2025-01-15T09:00:00Z") to HH:MM. */
function parseSlotStartToHHMM(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null
  const s = raw.trim()
  const match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/) || s.match(/T(\d{1,2}):(\d{2})/)
  if (match) {
    const hh = parseInt(match[1], 10)
    const mm = parseInt(match[2], 10)
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return `${pad2(hh)}:${pad2(mm)}`
  }
  return null
}

function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function bookingStartDate(b: Booking): Date | null {
  // NeetoCal list-bookings returns `starts_at` (and sometimes `starts_at_for_client`)
  const raw =
    b?.starts_at ||
    b?.starts_at_for_client ||
    b?.start_time ||
    b?.start_at ||
    b?.start ||
    b?.scheduled_at
  if (!raw) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** Parse "Name @ Location" from booking name; returns display name and location for UI. */
function parseBookingNameAndLocation(name: string | undefined | null): { displayName: string; location: string | null } {
  if (!name || typeof name !== "string") return { displayName: name || "", location: null }
  const atIndex = name.lastIndexOf(" @ ")
  if (atIndex === -1) return { displayName: name.trim(), location: null }
  return {
    displayName: name.slice(0, atIndex).trim(),
    location: name.slice(atIndex + 3).trim() || null,
  }
}

function getInitials(name: string | undefined | null): string {
  const s = (name || "").trim()
  const parts = s.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase() || "?"
}

const BOOKING_AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
] as const
function getBookingAvatarColor(idx: number): string {
  return BOOKING_AVATAR_COLORS[idx % BOOKING_AVATAR_COLORS.length]
}

function bookingTitle(b: Booking) {
  const clientDisplayName = (() => {
    const name = b?.name
    if (!name || typeof name !== "string") return null
    const parsed = parseBookingNameAndLocation(name)
    return (parsed.displayName || name).trim() || null
  })()
  if (clientDisplayName) {
    return `Meeting with ${clientDisplayName}`
  }
  const raw =
    b?.meeting?.name ||
    b?.title ||
    b?.event_name ||
    b?.meeting_name ||
    b?.name ||
    "Booking"
  return typeof raw === "string" ? raw : String(raw)
}

function isPlaceholderEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return email.startsWith("sms_") && email.endsWith("@call.placeholder.local")
}

function extractLocationFromNotes(notes: string | undefined | null): string | null {
  if (!notes) return null
  // Parse "Location: [location]" format
  const locationMatch = notes.match(/Location:\s*(.+?)(?:\n|$)/i)
  return locationMatch ? locationMatch[1].trim() : null
}

function getBookingLocation(b: Booking): string | null {
  // First: "Name @ Location" stored in b.name (manual + automation)
  const fromName = parseBookingNameAndLocation(b?.name).location
  if (fromName) return fromName
  // Try metadata.original_request.meeting_location (legacy / automation)
  if (b?.metadata && typeof b.metadata === 'object') {
    const originalRequest = (b.metadata as any)?.original_request
    if (originalRequest && typeof originalRequest === 'object') {
      const location = originalRequest.meeting_location
      if (location && typeof location === 'string' && location.trim()) {
        return location.trim()
      }
    }
    const location = (b.metadata as any)?.location
    if (location && typeof location === 'string' && location.trim()) {
      return location.trim()
    }
  }
  if (b?.internal_notes) {
    const location = extractLocationFromNotes(b.internal_notes)
    if (location) return location
  }
  return null
}

function getBookingClientPhone(b: Booking): string | null {
  // Try metadata.original_request.client_phone first
  if (b?.metadata && typeof b.metadata === 'object') {
    const originalRequest = (b.metadata as any)?.original_request
    if (originalRequest && typeof originalRequest === 'object') {
      const phone = originalRequest.client_phone
      if (phone && typeof phone === 'string' && phone.trim()) {
        return phone.trim()
      }
    }
  }
  // Fallback: try to extract from placeholder email
  if (b?.email && isPlaceholderEmail(b.email)) {
    // Extract phone from "sms_12232728916@call.placeholder.local"
    const match = b.email.match(/^sms_(\d+)@call\.placeholder\.local$/)
    if (match && match[1]) {
      return `+${match[1]}`
    }
  }
  return null
}

function bookingTimeLabel(b: Booking) {
  const dt = bookingStartDate(b)
  if (!dt) return ""
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function bookingDateTimeRangeLabel(b: Booking) {
  const s = bookingStartDate(b)
  if (!s) return ""
  const e = bookingEndDate(b)
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  const startTime = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (!e) return `${date} • ${startTime}`
  const endTime = e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  return `${date} • ${startTime} – ${endTime}`
}

function bookingEndDate(b: Booking): Date | null {
  // NeetoCal list-bookings returns `ends_at` (and sometimes `ends_at_for_client`)
  const raw =
    b?.ends_at ||
    b?.ends_at_for_client ||
    b?.end_time ||
    b?.end_at ||
    b?.end
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

/** NeetoCal booking SID used for cancel/reschedule API. */
function bookingSid(b: Booking): string | undefined {
  const sid = b?.sid ?? b?.booking_sid ?? b?.id
  return typeof sid === "string" && sid.trim() ? sid.trim() : undefined
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
  onBookingClick,
}: {
  day: Date
  bookings: Booking[]
  onBookingClick?: (b: Booking) => void
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
                  <button
                    type="button"
                    onClick={() => onBookingClick?.(b)}
                    className={cn(
                      "min-w-0 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm text-left transition",
                      onBookingClick ? "hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30" : ""
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{bookingTitle(b)}</div>
                      <div className="whitespace-nowrap text-xs text-slate-500 tabular-nums">{bookingTimeLabel(b)}</div>
                    </div>
                    {(() => {
                      const location = getBookingLocation(b)
                      const clientPhone = getBookingClientPhone(b)
                      const clientName = parseBookingNameAndLocation(b?.name).displayName || "—"
                      const showEmail = b?.email && !isPlaceholderEmail(b.email)
                      return (
                        <>
                          <div className="mt-1 text-xs text-slate-600 truncate">
                            {clientName}
                            {showEmail ? ` (${b.email})` : ""}
                          </div>
                          {location && (
                            <div className="mt-0.5 text-xs text-slate-500 truncate">
                              📍 {location}
                            </div>
                          )}
                          {clientPhone && !location && (
                            <div className="mt-0.5 text-xs text-slate-500 truncate">
                              📞 {formatPhoneForDisplay(clientPhone)}
                            </div>
                          )}
                        </>
                      )
                    })()}
                    {b?.status ? <div className="mt-1 text-xs text-slate-500">{String(b.status)}</div> : null}
                  </button>
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
  const tCalendar = useTranslations('calendar')
  const tCommon = useTranslations('common')
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [notice, setNotice] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [schedulingLinkViewOpen, setSchedulingLinkViewOpen] = useState(false)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [clients, setClients] = useState<Array<{ id: number; name: string; email: string }>>([])

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<string>("")
  const [rescheduleTime, setRescheduleTime] = useState<string>("09:00")
  const [rescheduleReason, setRescheduleReason] = useState<string>("")
  const [rescheduleError, setRescheduleError] = useState<string>("")
  const [rescheduleSlotTimeOptions, setRescheduleSlotTimeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeAvailabilityId, setActiveAvailabilityId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"calendar" | "availability">("calendar")
  const [hasLoadedAvailability, setHasLoadedAvailability] = useState(false)

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
    // Keep this list small for performance; include current/browsers tz even if not in the list.
    const base = [
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
      "Asia/Macau",
      "Asia/Tokyo",
      "Australia/Sydney",
    ]
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
    setAvailabilityLoading(true)
    const cached = getCachedTeamMember()
    const res = await api.getSingleAvailability(cached?.team_member_id ?? undefined)
    const data = (res as any)?.data ?? null
    const availability = data?.availability ?? data
    const teamMember = data?.team_member as { team_member_id?: string; email?: string; time_zone?: string } | undefined
    if (teamMember) {
      setCachedTeamMember(teamMember)
      const tz = teamMember?.time_zone as string | undefined
      if (tz && tz.trim()) {
        setTimeZone(tz.trim())
        setTimeZoneSource("neetocal")
      }
    }
    if (availability) applyAvailabilityToForm(availability)
    setHasLoadedAvailability(true)
    setAvailabilityLoading(false)
    return availability
  }

  const load = async () => {
    setError("")
    setNotice("")
    setBookingsLoading(true)
    try {
      // Load profile first so we can explicitly scope bookings to this team member.
      const p = await api.getMyProfile()
      const res = await api.getNeetoBookings({ page_size: 200, type: "upcoming", host_email: p?.email })
      setProfile(p)
      const data = (res as any)?.data ?? res
      const list = Array.isArray(data) ? data : (data?.bookings ?? data?.data ?? [])
      setBookings(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || "Failed to load calendar")
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refetchClients = useCallback(() => {
    api.getClients(0, 500).then((data: any) => {
      const list = Array.isArray(data) ? data : []
      setClients(list.map((c: any) => ({ id: c.id, name: c.name || "", email: c.email || "" })))
    }).catch(() => setClients([]))
  }, [])

  useEffect(() => {
    if (!createAppointmentOpen) return
    refetchClients()
  }, [createAppointmentOpen, refetchClients])

  // Lazy-load availability only when the user opens the tab.
  useEffect(() => {
    if (activeTab !== "availability") return
    if (hasLoadedAvailability) return
    // Hydrate timezone from cache so dropdown shows immediately while we fetch
    const cached = getCachedTeamMember()
    if (cached?.time_zone?.trim()) {
      setTimeZone(cached.time_zone.trim())
      setTimeZoneSource("neetocal")
    }
    refreshSingleAvailability().catch(() => {
      // keep page usable even if availability fetch fails
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasLoadedAvailability])

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

      const res = await api.upsertSingleAvailability(payload)
      const resData = (res as any)?.data ?? null
      const teamMember = resData?.team_member as { team_member_id?: string; email?: string; time_zone?: string } | undefined
      if (teamMember) {
        setCachedTeamMember(teamMember)
        if (teamMember.time_zone?.trim()) {
          setTimeZone(teamMember.time_zone.trim())
          setTimeZoneSource("neetocal")
        }
      }
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
      toast({ description: tCalendar("copiedToClipboard") })
    } catch {
      toast({ description: "Could not copy link.", variant: "destructive" as any })
    }
  }

  const copyText = async (text: string | undefined, label: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast({ description: `${label} copied.` })
    } catch {
      toast({ description: `Could not copy ${label.toLowerCase()}.`, variant: "destructive" as any })
    }
  }

  const openBooking = (b: Booking) => {
    setActiveBooking(b)
    setBookingDialogOpen(true)
  }

  const onCancelBookingConfirm = async () => {
    if (!activeBooking) return
    const sid = bookingSid(activeBooking)
    if (!sid) {
      toast({ description: "Cannot cancel: booking ID missing.", variant: "destructive" as any })
      return
    }
    setCancelling(true)
    try {
      await api.cancelNeetoBooking(sid)
      toast({ description: tCalendar("bookingCancelled") })
      setBookingDialogOpen(false)
      setActiveBooking(null)
      setCancelConfirmOpen(false)
      await load()
    } catch (e: any) {
      toast({ description: e?.message || "Failed to cancel booking", variant: "destructive" as any })
    } finally {
      setCancelling(false)
    }
  }

  const openRescheduleDialog = () => {
    if (!activeBooking) return
    setRescheduleError("")
    const start = bookingStartDate(activeBooking)
    if (start) {
      setRescheduleDate(dateKeyLocal(start))
      const mins = start.getHours() * 60 + start.getMinutes()
      setRescheduleTime(minutesToHHMM(mins))
    } else {
      setRescheduleDate("")
      setRescheduleTime("09:00")
    }
    setRescheduleReason("")
    setRescheduleDialogOpen(true)
  }

  const rescheduleTimeZone = activeBooking?.time_zone || profile?.time_zone || timeZone || browserTz || "America/New_York"
  const hasRescheduleCalendarLink = Boolean(profile?.calendar_link)

  useEffect(() => {
    if (!rescheduleDialogOpen || !rescheduleDate.trim() || !hasRescheduleCalendarLink) {
      setRescheduleSlotTimeOptions([])
      return
    }
    const [y, m, d] = rescheduleDate.split("-").map(Number)
    if (!y || !m) return
    setRescheduleSlotsLoading(true)
    api
      .getNeetoSlots({
        time_zone: rescheduleTimeZone,
        year: String(y),
        month: String(m),
        day: d ? String(d) : undefined,
      })
      .then((res: any) => {
        const rawSlots = res?.slots ?? res?.data?.slots ?? []
        const startTimes = new Set<string>()
        const targetDate = rescheduleDate
        for (const dayEntry of rawSlots) {
          if (dayEntry.date !== targetDate) continue
          const slotMap = dayEntry.slots ?? {}
          for (const slot of Object.values(slotMap) as Array<{ start_time?: string }>) {
            const hhmm = parseSlotStartToHHMM(slot?.start_time ?? "")
            if (hhmm) startTimes.add(hhmm)
          }
        }
        const sorted = Array.from(startTimes).sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b))
        setRescheduleSlotTimeOptions(sorted.map((v) => ({ value: v, label: hhmmToLabel(v) })))
      })
      .catch(() => setRescheduleSlotTimeOptions([]))
      .finally(() => setRescheduleSlotsLoading(false))
  }, [rescheduleDialogOpen, rescheduleDate, hasRescheduleCalendarLink, rescheduleTimeZone])

  useEffect(() => {
    if (!rescheduleDialogOpen) return
    if (rescheduleSlotTimeOptions.length === 0) {
      setRescheduleTime("")
      return
    }
    const currentInList = rescheduleSlotTimeOptions.some((o) => o.value === rescheduleTime)
    if (!currentInList) setRescheduleTime(rescheduleSlotTimeOptions[0].value)
  }, [rescheduleDialogOpen, rescheduleSlotTimeOptions])

  const onRescheduleSubmit = async () => {
    if (!activeBooking) return
    const sid = bookingSid(activeBooking)
    if (!sid) {
      toast({ description: "Cannot reschedule: booking ID missing.", variant: "destructive" as any })
      return
    }
    if (!rescheduleDate.trim()) {
      toast({ description: tCalendar("selectDate"), variant: "destructive" as any })
      return
    }
    if (!rescheduleTime) {
      toast({ description: "Please select an available time.", variant: "destructive" as any })
      return
    }
    const timeZoneToUse = rescheduleTimeZone
    const displayName = activeBooking?.name ? parseBookingNameAndLocation(activeBooking.name).displayName : "Client"
    const email = activeBooking?.email && !isPlaceholderEmail(activeBooking.email) ? String(activeBooking.email) : ""
    if (!email) {
      toast({ description: "Client email is required to reschedule.", variant: "destructive" as any })
      return
    }
    setRescheduleError("")
    setRescheduling(true)
    try {
      await api.rescheduleNeetoBooking(sid, {
        name: displayName,
        email,
        slot_date: rescheduleDate,
        slot_start_time: hhmmToApiTime(rescheduleTime),
        time_zone: timeZoneToUse,
        ...(rescheduleReason.trim() ? { reschedule_reason: rescheduleReason.trim() } : {}),
      })
      toast({ description: tCalendar("bookingRescheduled") })
      setRescheduleDialogOpen(false)
      setBookingDialogOpen(false)
      setActiveBooking(null)
      await load()
    } catch (e: any) {
      const msg = e?.message || "Failed to reschedule"
      setRescheduleError(msg)
      toast({ description: msg, variant: "destructive" as any })
    } finally {
      setRescheduling(false)
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
        <Dialog
          open={bookingDialogOpen}
          onOpenChange={(open) => {
            setBookingDialogOpen(open)
            if (!open) setActiveBooking(null)
          }}
        >
          <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b">
              <DialogTitle className="text-xl font-semibold text-foreground mb-2">
                {activeBooking ? bookingTitle(activeBooking) : "Booking"}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{activeBooking ? bookingDateTimeRangeLabel(activeBooking) : null}</span>
              </div>
            </div>

            {activeBooking ? (
              <div className="px-6 py-5">
                {/* Info Section */}
                <div className="space-y-0 mb-6">
                  <div className="flex py-3 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Client</span>
                    <span className="text-sm text-foreground">
                      {activeBooking?.name ? parseBookingNameAndLocation(activeBooking.name).displayName : "—"}
                      {activeBooking?.email && !isPlaceholderEmail(activeBooking.email) 
                        ? ` (${String(activeBooking.email)})` 
                        : null}
                    </span>
                  </div>
                  {(() => {
                    const location = getBookingLocation(activeBooking)
                    const clientPhone = getBookingClientPhone(activeBooking)
                    return location || clientPhone ? (
                      <>
                        {location && (
                          <div className="flex items-center gap-2 py-3 border-b border-border/50">
                            <span className="text-sm font-medium text-muted-foreground min-w-[100px] shrink-0">Location</span>
                            <span className="text-sm text-foreground min-w-0 flex-1 truncate">{location}</span>
                            <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 rounded-lg p-0" asChild>
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Open location in Google Maps"
                              >
                                <MapPin className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        )}
                        {clientPhone && (
                          <div className="flex py-3 border-b border-border/50">
                            <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Phone</span>
                            <span className="text-sm text-foreground">{formatPhoneForDisplay(clientPhone)}</span>
                          </div>
                        )}
                      </>
                    ) : null
                  })()}
                  <div className="flex py-3 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground capitalize">
                      {String(activeBooking?.status || "—")}
                    </span>
                  </div>
                  {activeBooking?.time_zone ? (
                    <div className="flex py-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Time zone</span>
                      <span className="text-sm text-foreground">{String(activeBooking.time_zone)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Join Meeting Button */}
                {(() => {
                  const joinUrl =
                    activeBooking?.room_url ||
                    activeBooking?.spot_details ||
                    activeBooking?.client_booking_url ||
                    activeBooking?.admin_booking_url
                  return joinUrl ? (
                    <div className="pt-5 border-t">
                      <Button
                        asChild
                        className="w-full h-12 text-[15px] font-medium bg-primary hover:bg-primary/90"
                      >
                        <a href={joinUrl} target="_blank" rel="noreferrer">
                          Join Meeting
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-5 border-t">
                      <div className="text-sm text-muted-foreground text-center py-3">
                        No join link available.
                      </div>
                    </div>
                  )
                })()}

                {/* Cancel & Reschedule */}
                {activeBooking && bookingSid(activeBooking) ? (
                  <div className="pt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={openRescheduleDialog}
                    >
                      {tCalendar("rescheduleBooking")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelConfirmOpen(true)}
                    >
                      {tCalendar("cancelBooking")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tCalendar("cancelBooking")}</AlertDialogTitle>
              <AlertDialogDescription>{tCalendar("cancelBookingConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  onCancelBookingConfirm()
                }}
                disabled={cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelling ? "Saving..." : tCalendar("cancelBooking")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={rescheduleDialogOpen} onOpenChange={(open) => { setRescheduleDialogOpen(open); if (!open) setRescheduleError("") }}>
          <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">{tCalendar("rescheduleBookingTitle")}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{tCalendar("rescheduleBookingDescription")}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {rescheduleError ? (
                <Alert variant="destructive" className="mb-0">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertDescription className="text-sm">{rescheduleError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium">{tCalendar("newDate")}</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleError("") }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{tCalendar("newTime")}</label>
                <Select
                  value={rescheduleTime || undefined}
                  onValueChange={(v) => { setRescheduleTime(v || ""); setRescheduleError("") }}
                  disabled={!hasRescheduleCalendarLink || rescheduleSlotsLoading || !rescheduleDate.trim()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !rescheduleDate.trim()
                          ? tCalendar("selectDate")
                          : rescheduleSlotsLoading
                            ? "Loading..."
                            : rescheduleSlotTimeOptions.length === 0
                              ? "No available slots"
                              : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {rescheduleSlotTimeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{tCalendar("rescheduleReason")}</label>
                <Input
                  type="text"
                  placeholder=""
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setRescheduleDialogOpen(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={onRescheduleSubmit}
                  disabled={
                    rescheduling ||
                    rescheduleSlotsLoading ||
                    !rescheduleTime ||
                    (Boolean(rescheduleDate.trim()) && rescheduleSlotTimeOptions.length === 0)
                  }
                >
                  {rescheduling ? tCommon("saving") : tCalendar("rescheduleBooking")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <CreateAppointmentDialog
          open={createAppointmentOpen}
          onOpenChange={setCreateAppointmentOpen}
          clients={clients.map((c) => ({ id: c.id, name: c.name || "", email: c.email || "" }))}
          profile={profile ? { time_zone: profile.time_zone, calendar_link: profile.calendar_link } : null}
          onSuccess={load}
          onClientCreated={refetchClients}
        />

        <div className="min-h-screen bg-[#F8FAFC] dark:bg-muted/20">
          <div className="mx-auto max-w-[1320px] px-6 py-6">
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

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <TabsList className="h-auto gap-1 rounded-lg bg-[#F1F5F9] dark:bg-muted p-1">
                  <TabsTrigger
                    value="calendar"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#1E293B] data-[state=active]:shadow-[0_2px_6px_rgba(0,0,0,0.08)] data-[state=active]:border data-[state=active]:border-[#E2E8F0] dark:data-[state=active]:bg-card dark:data-[state=active]:text-foreground dark:data-[state=active]:border-border"
                  >
                    {tCalendar("title")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="availability"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#1E293B] data-[state=active]:shadow-[0_2px_6px_rgba(0,0,0,0.08)] data-[state=active]:border data-[state=active]:border-[#E2E8F0] dark:data-[state=active]:bg-card dark:data-[state=active]:text-foreground dark:data-[state=active]:border-border"
                  >
                    {tCalendar("setAvailability")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calendar" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              {bookingsLoading ? (
                <Card className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-5 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]">
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

          <div className="space-y-6 lg:sticky lg:top-24 self-start rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]">
            {bookingsLoading ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              </>
            ) : (
            <>
              {/* Header: actions on left, then date below */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-start gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={load}
                    disabled={bookingsLoading}
                    className="h-10 w-10 rounded-lg shrink-0 border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
                    aria-label={tCommon("refresh")}
                  >
                    <RefreshCwIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCreateAppointmentOpen(true)}
                    disabled={!calendarLink}
                    className="rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.08)] h-10 px-4 font-medium"
                    aria-label={tCalendar("createAppointment")}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {tCalendar("createAppointment")}
                  </Button>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarIcon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-foreground break-words">
                      {selectedDay
                        ? selectedDay.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })
                        : tCalendar("bookings")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedDayBookings.length === 0
                        ? tCalendar("noBookings")
                        : selectedDay
                          ? `${selectedDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${selectedDayBookings.length} ${selectedDayBookings.length === 1 ? "booking" : "bookings"}`
                          : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Booking cards */}
              <div className="space-y-3">
                {selectedDayBookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E2E8F0] dark:border-border bg-[#FAFBFD] dark:bg-muted/20 py-10 px-4 text-center shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tCommon("nothingScheduled")}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      No more bookings today — add one?
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      className="mt-4 rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                      onClick={() => setCreateAppointmentOpen(true)}
                      disabled={!calendarLink}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      {tCalendar("createAppointment")}
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-3">
                      {selectedDayBookings.map((b, idx) => {
                        const location = getBookingLocation(b)
                        const clientPhone = getBookingClientPhone(b)
                        const clientName = parseBookingNameAndLocation(b?.name).displayName || "—"
                        const showEmail = b?.email && !isPlaceholderEmail(b.email)
                        const subtitle =
                          location && clientPhone
                            ? `Meeting with ${clientPhone} at ${location}`
                            : location
                              ? `Meeting at ${location}`
                              : clientPhone
                                ? `Meeting with ${clientPhone}`
                                : clientName + (showEmail ? ` (${b.email})` : "")
                        const status = (b?.status as string) || "confirmed"
                        const isConfirmed = String(status).toLowerCase() === "confirmed"
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openBooking(b)}
                            className="w-full rounded-lg border border-border bg-background p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label={`Open booking details for ${bookingTitle(b)}`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar
                                className={cn(
                                  "h-10 w-10 shrink-0 rounded-full",
                                  getBookingAvatarColor(idx)
                                )}
                              >
                                <AvatarFallback className="text-sm font-semibold">
                                  {getInitials(clientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-base font-semibold text-primary truncate">
                                    {bookingTitle(b)}
                                  </h3>
                                  <span className="shrink-0 rounded-full p-1 text-muted-foreground" aria-hidden>
                                    <MoreHorizontalIcon className="h-4 w-4" />
                                  </span>
                                </div>
                                {subtitle ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 break-words">
                                        {subtitle}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      {subtitle}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : null}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {bookingTimeLabel(b)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    {isConfirmed ? (
                                      <>
                                        <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden />
                                        Confirmed
                                      </>
                                    ) : (
                                      <span className="capitalize">{status}</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Your Scheduling Link — card per designer spec */}
              <div className="pt-4 border-t border-border/60">
                <Card className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-base font-semibold text-foreground">
                          {tCalendar("yourSchedulingLink")}
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-hidden>
                              <HelpCircleIcon className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px]">
                            {tCalendar("schedulingLinkTooltip")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {calendarLink ? (
                        <div
                          className="flex min-h-10 items-stretch gap-0 rounded-md border-b-2 border-primary/30 bg-transparent focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                          role="group"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              onCopyLink()
                            }
                          }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="font-mono text-sm text-primary min-w-0 flex-1 truncate py-2.5 pr-2 cursor-default"
                                aria-label="Scheduling link URL"
                              >
                                {calendarLink}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[min(90vw,28rem)] font-mono text-xs break-all">
                              {calendarLink}
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex items-center gap-0.5 pr-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  onClick={onCopyLink}
                                  aria-label="Copy scheduling link"
                                >
                                  {copied ? (
                                    <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
                                  ) : (
                                    <CopyIcon className="h-4 w-4" aria-hidden />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{copied ? tCalendar("copiedToClipboard") : "Copy"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  onClick={() => setSchedulingLinkViewOpen(true)}
                                  aria-label="View scheduling link"
                                >
                                  <Eye className="h-4 w-4" aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  asChild
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  aria-label="Open scheduling link in new tab"
                                >
                                  <a href={calendarLink} target="_blank" rel="noreferrer">
                                    <ExternalLinkIcon className="h-4 w-4" aria-hidden />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {tCalendar("linkInactiveRegenerate")}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* View scheduling link dialog */}
                <Dialog open={schedulingLinkViewOpen} onOpenChange={setSchedulingLinkViewOpen}>
                  <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0" showCloseButton={false}>
                    <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-border">
                      <DialogTitle className="text-base font-semibold">
                        {tCalendar("yourSchedulingLink")}
                      </DialogTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setSchedulingLinkViewOpen(false)}
                        aria-label="Close"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {calendarLink ? (
                      <iframe
                        src={calendarLink}
                        title="Scheduling link preview"
                        className="w-full flex-1 min-h-0 rounded-b-lg"
                      />
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            </>
            )}
              </div>
                  </div>
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <Card className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]">
              {availabilityLoading || !hasLoadedAvailability ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-7 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-20" />
                      <Skeleton className="h-10 w-20" />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid gap-6">
                    <div className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                        <Skeleton className="h-10 w-20" />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 w-9 rounded-full" />
                        ))}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-2">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border">
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <div key={idx} className={cn("p-4 md:p-5", idx > 0 ? "border-t" : "")}>
                          <div className="flex items-start gap-4">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-9 w-9 rounded-md" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-10 w-[160px]" />
                                  <Skeleton className="h-4 w-4" />
                                  <Skeleton className="h-10 w-[160px]" />
                                  <Skeleton className="h-9 w-9 rounded-md" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Skeleton className="h-4 w-64" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xl font-semibold">Weekly hours</div>
                      <div className="text-sm text-muted-foreground">Set when you are typically available for meetings</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="rounded-lg hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]" onClick={refreshSingleAvailability} disabled={availabilityLoading}>
                        Reload
                      </Button>
                      <Button type="button" className="rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.08)]" onClick={onSaveAvailability} disabled={savingAvailability || availabilityLoading || !profile?.email}>
                        {savingAvailability ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid gap-6">
                <div className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]">
                  <div>
                    <div className="text-sm font-semibold text-[#1E293B] dark:text-foreground">Apply uniform hours</div>
                    <div className="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">Select days and apply the same start/end time.</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setQuickDays((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                          quickDays[d.key] ? "bg-primary text-primary-foreground border-primary" : "border-[#E5E7EB] dark:border-border bg-transparent hover:bg-muted/70"
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
                  <div className="grid gap-2 sm:flex sm:flex-col sm:justify-end">
                    <label className="text-sm font-medium">Current time zone</label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={timeZone}
                        onValueChange={(v) => {
                          setTimeZone(v)
                          setTimeZoneSource("manual")
                        }}
                      >
                        <SelectTrigger className="w-full min-w-0">
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
                      <Button type="button" variant="outline" className="rounded-lg shrink-0 h-10" onClick={applyUniformToSelectedDays}>
                        Apply
                      </Button>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden">
                  {WEEKDAYS.map((d, idx) => {
                    const ranges = weeklyHours[d.key] || []
                    const isUnavailable = ranges.length === 0
                    return (
                      <div
                        key={d.key}
                        className={cn(
                          "py-5 px-4 md:py-6 md:px-5 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-muted/20",
                          idx > 0 ? "border-t border-[#F3F4F6] dark:border-border" : ""
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
                              isUnavailable
                                ? "border-2 border-[#E5E7EB] dark:border-border bg-transparent text-muted-foreground"
                                : "bg-primary text-primary-foreground"
                            )}
                          >
                            {d.short}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-foreground">{d.label}</div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-[#E5E7EB] dark:border-border text-muted-foreground hover:text-foreground"
                                onClick={() => addRangeForDay(d.key)}
                                aria-label={`Add time range for ${d.label}`}
                              >
                                <PlusIcon className="h-3.5 w-3.5 stroke-[2]" />
                              </Button>
                            </div>

                            {isUnavailable ? (
                              <div className="mt-2 text-sm text-muted-foreground">Unavailable</div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {ranges.map((r, i) => (
                                  <div key={i} className="flex flex-wrap items-center gap-3">
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
                                    <span className="text-muted-foreground opacity-50 select-none">–</span>
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
                                    <div className="inline-flex items-center gap-0.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground hover:text-foreground"
                                        onClick={() => removeRangeForDay(d.key, i)}
                                        aria-label={`Remove time range ${i + 1} for ${d.label}`}
                                      >
                                        <XIcon className="h-3.5 w-3.5" />
                                      </Button>

                                      {i === ranges.length - 1 ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground hover:text-foreground"
                                          onClick={() => copyDayToSelectedDays(d.key)}
                                          aria-label={`Copy ${d.label} hours to selected days`}
                                        >
                                          <CopyIcon className="h-3.5 w-3.5" />
                                        </Button>
                                      ) : null}
                                    </div>
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

                {!activeAvailabilityId && (
                  <div className="text-xs text-muted-foreground">
                    No existing availability found yet (saving will create one).
                  </div>
                )}
              </div>
                </>
              )}
            </Card>
          </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
