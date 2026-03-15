"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircleIcon, Calendar as CalendarIcon, CheckIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon, Eye, HelpCircleIcon, MapPin, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, Video, XIcon } from "lucide-react"
import { api } from "@/lib/api"
import { AvailabilityTab } from "@/components/availability-tab"
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
  const raw = b?.start
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
  const customTitle = b?.title || b?.name
  if (customTitle && typeof customTitle === "string") return customTitle
  
  const clientDisplayName = (() => {
    const name = b?.client_name
    if (!name || typeof name !== "string") return null
    const parsed = parseBookingNameAndLocation(name)
    return (parsed.displayName || name).trim() || null
  })()
  if (clientDisplayName) {
    return `Meeting with ${clientDisplayName}`
  }
  return "Booking"
}

  const getBookingStatusText = (booking: Booking) => {
    return booking?.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Confirmed"
  }

  const getBookingVirtualLink = (booking: Booking) => {
    return booking?.meet_link || null
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
  // Direct location field (native bookings from our API)
  if (b?.location && typeof b.location === 'string' && b.location.trim()) {
    return b.location.trim()
  }
  // "Name @ Location" stored in b.name (manual + automation)
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
  // Native bookings store phone directly
  if (b?.client_phone && typeof b.client_phone === 'string' && b.client_phone.trim()) {
    return b.client_phone.trim()
  }
  // Legacy metadata path (NeetoCal / AI agent bookings)
  if (b?.metadata && typeof b.metadata === 'object') {
    const originalRequest = (b.metadata as any)?.original_request
    if (originalRequest && typeof originalRequest === 'object') {
      const phone = originalRequest.client_phone
      if (phone && typeof phone === 'string' && phone.trim()) {
        return phone.trim()
      }
    }
  }
  // Fallback: try to extract from placeholder email (legacy NeetoCal SMS bookings)
  const emailField = b?.client_email || b?.email
  if (emailField && isPlaceholderEmail(emailField)) {
    const match = emailField.match(/^sms_(\d+)@call\.placeholder\.local$/)
    if (match && match[1]) {
      return `+${match[1]}`
    }
  }
  return null
}

function bookingTimeLabel(b: Booking) {
  const dt = bookingStartDate(b)
  if (!dt || isNaN(dt.getTime())) return "Time TBD"
  const tz = b?.time_zone || undefined
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: tz })
}

  const getBookingEndTime = (booking: Booking) => {
    const dt = booking?.end ? new Date(booking.end) : null
    if (!dt || isNaN(dt.getTime())) return ""
    const tz = booking?.time_zone || undefined
    return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: tz })
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

/** Booking ID used for cancel/reschedule API — accepts numeric (native DB) or string (legacy NeetoCal) IDs. */
function bookingSid(b: Booking): string | undefined {
  const sid = b?.sid ?? b?.booking_sid ?? b?.id
  if (typeof sid === "number" && Number.isFinite(sid)) return String(sid)
  if (typeof sid === "string" && sid.trim()) return sid.trim()
  return undefined
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
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500 text-center">
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

            const clientName = b?.client_name || parseBookingNameAndLocation(b?.name).displayName || null
            const clientEmail = b?.client_email || b?.email
            const showEmail = clientEmail && !isPlaceholderEmail(clientEmail as string)
            const clientPhone = getBookingClientPhone(b)
            const location = b?.location || getBookingLocation(b)
            const isPhysical = b?.type === "physical" || b?.preferred_meeting_spot === "physical"
            const endTime = getBookingEndTime(b)

            return (
              <div key={idx} className="absolute left-[72px] right-2" style={{ top }}>
                <div className="flex items-start gap-2.5">
                  {/* Timeline dot */}
                  <div className={cn(
                    "mt-3 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-sm",
                    isPhysical ? "bg-orange-400" : "bg-indigo-500"
                  )} />

                  <button
                    type="button"
                    onClick={() => onBookingClick?.(b)}
                    className={cn(
                      "group min-w-0 w-full rounded-xl text-left transition-all duration-150 overflow-hidden",
                      "border bg-white shadow-sm",
                      isPhysical
                        ? "border-orange-100 hover:border-orange-300 hover:shadow-md hover:shadow-orange-100/50"
                        : "border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50",
                      onBookingClick
                        ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 cursor-pointer"
                        : "cursor-default"
                    )}
                  >
                    {/* Colored left accent bar */}
                    <div className="flex">
                      <div className={cn(
                        "w-1 shrink-0",
                        isPhysical ? "bg-orange-400" : "bg-indigo-500"
                      )} />
                      <div className="flex-1 p-3 min-w-0">

                        {/* Row 1: title + type badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-[13px] font-semibold text-slate-900 leading-snug flex-1 min-w-0">
                            {bookingTitle(b)}
                          </div>
                          <span className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                            isPhysical
                              ? "bg-orange-50 text-orange-700 ring-orange-200"
                              : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isPhysical ? "bg-orange-400" : "bg-indigo-500"
                            )} />
                            {isPhysical ? "In-person" : "Virtual"}
                          </span>
                        </div>

                        {/* Row 2: time range */}
                        <div className="mt-0.5 text-[11px] font-medium text-slate-400 tabular-nums">
                          {bookingTimeLabel(b)}{endTime ? ` – ${endTime}` : ""}
                        </div>

                        {/* Divider */}
                        {(clientName || location || clientPhone) && (
                          <div className="my-2 h-px bg-slate-100" />
                        )}

                        {/* Client name + email */}
                        {clientName && (
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-700">
                            <svg className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="truncate font-medium">{clientName}</span>
                            {showEmail && (
                              <span className="truncate text-[11px] text-slate-400 font-normal hidden sm:inline">
                                · {clientEmail}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Address – in-person meetings */}
                        {isPhysical && location && (
                          <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-orange-50 px-2 py-1.5 text-[12px] text-orange-800">
                            <svg className="h-3 w-3 shrink-0 mt-0.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="leading-snug">{location}</span>
                          </div>
                        )}

                        {/* Phone – virtual with no location */}
                        {!isPhysical && clientPhone && (
                          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                            <svg className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{formatPhoneForDisplay(clientPhone)}</span>
                          </div>
                        )}

                        {/* Non-confirmed status badge */}
                        {b?.status && String(b.status) !== "confirmed" && (
                          <div className="mt-2">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 capitalize">
                              {String(b.status)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const [notice, setNotice] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [regeneratingSchedulingLink, setRegeneratingSchedulingLink] = useState(false)
  const [schedulingLinkViewOpen, setSchedulingLinkViewOpen] = useState(false)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [clients, setClients] = useState<Array<{ id: number; name: string; email: string; address?: string }>>([])

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

  const [profile, setProfile] = useState<{ email?: string; calendar_link?: string; company_name?: string; time_zone?: string } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeAvailabilityId, setActiveAvailabilityId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"calendar" | "availability">("calendar")

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

  // Availability has been extracted to AvailabilityTab

  const calendarSlug = profile?.calendar_link as string | undefined
  const frontendBase =
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  const calendarLink = calendarSlug ? `${frontendBase}/book/${calendarSlug}` : undefined

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

  const currentMonthStr = useMemo(() => dateKeyLocal(month).slice(0, 7), [month])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [allBookings, setAllBookings] = useState<Booking[]>([])

  const fetchBookings = useCallback(async (targetMonthStr: string) => {
    try {
      setLoadingBookings(true)
      const res = await api.getCalendarBookings(targetMonthStr)
      // Expecting { events: [...] }
      const events = Array.isArray(res?.events) ? res.events : []
      if (events.length > 0) {
        setAllBookings(events)
      } else {
        setAllBookings([])
      }
    } catch (err) {
      console.warn("Error fetching bookings:", err)
      setAllBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings(currentMonthStr)
  }, [currentMonthStr, fetchBookings])

  useEffect(() => {
    // Filter bookings for the current month view
    const filtered = allBookings.filter(b => {
      const startDate = bookingStartDate(b)
      return startDate && isSameMonth(startDate, month)
    })
    setBookings(filtered)
    setBookingsLoading(loadingBookings)
  }, [allBookings, month, loadingBookings])

  const refetchClients = useCallback(() => {
    api.getClients(0, 500).then((data: any) => {
      const list = Array.isArray(data) ? data : []
      setClients(list.map((c: any) => ({
        id: c.id,
        name: c.name || "",
        email: c.email || "",
        address: c.address_data?.formatted_address?.trim() || c.address?.trim() || undefined,
      })))
    }).catch(() => setClients([]))
  }, [])

  useEffect(() => {
    if (!createAppointmentOpen) return
    refetchClients()
  }, [createAppointmentOpen, refetchClients])

  // Load contractor profile on mount (needed for scheduling link + save button)
  useEffect(() => {
    api.getMyProfile().then((p: any) => {
      setProfile({
        email: p?.email,
        calendar_link: p?.calendar_link,
        company_name: p?.company_name,
        time_zone: p?.time_zone,
      })
    }).catch(() => {})

    api.getGmailStatus().then((res) => {
      setGoogleConnected(res.connected)
    }).catch(() => setGoogleConnected(false))
  }, [])

  const onCopyLink = async () => {
    if (!calendarLink) {
      toast({ title: "No public booking link found", variant: "destructive" })
      return
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(calendarLink)
        .then(() => toast({ title: "Copied!", description: "Public booking link copied to clipboard." }))
        .catch(() => toast({ title: "Failed to copy", variant: "destructive" }))
    }
  }

  const onRegenerateSchedulingLink = async () => {
    try {
      setRegeneratingSchedulingLink(true)
      const res = await api.regenerateSchedulingLink()
      const nextLink = res?.calendar_link || ""
      if (!nextLink) throw new Error(tCalendar("regenerateLinkFailed"))
      setProfile((prev) => ({ ...(prev || {}), calendar_link: nextLink }))
      toast({ title: tCalendar("regenerateLinkSuccess") })
    } catch (err: any) {
      toast({
        title: tCalendar("regenerateLinkFailed"),
        description: err?.message || tCalendar("regenerateLinkFailed"),
        variant: "destructive",
      })
    } finally {
      setRegeneratingSchedulingLink(false)
    }
  }

  const handleOpenLink = () => {
    if (!calendarLink) return
    window.open(calendarLink, "_blank", "noopener,noreferrer")
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
      await api.cancelBooking(activeBooking.id)
      toast({ title: "Cancelled", description: "The meeting has been cancelled." })
      setCancelConfirmOpen(false)
      setBookingDialogOpen(false)
      setActiveBooking(null)
      fetchBookings(currentMonthStr)
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
      .getAvailableSlots({
        timezone: rescheduleTimeZone,
        date: rescheduleDate,
        duration_minutes: 30
      })
      .then((res: any) => {
        const rawSlots = res?.slots ?? []
        const startTimes = new Set<string>()
        rawSlots.forEach((isoString: string) => {
          const slotDt = new Date(isoString)
          const hhmm = pad2(slotDt.getHours()) + ":" + pad2(slotDt.getMinutes())
          startTimes.add(hhmm)
        })
        const finalSlots = Array.from(startTimes).sort()
        setRescheduleSlotTimeOptions(finalSlots.map((v: string) => ({ value: v, label: hhmmToLabel(v) })))
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
    const displayName = activeBooking?.client_name || (activeBooking?.name ? parseBookingNameAndLocation(activeBooking.name).displayName : "Client")
    const email = (() => {
      const e = activeBooking?.client_email || activeBooking?.email
      return e && !isPlaceholderEmail(e) ? String(e) : ""
    })()
    if (!email) {
      toast({ description: "Client email is required to reschedule.", variant: "destructive" as any })
      return
    }
    setRescheduleError("")
    setRescheduling(true)
    try {
      await api.rescheduleBooking(activeBooking.id, {
        slot_date: rescheduleDate,
        slot_start_time: rescheduleTime,
        time_zone: timeZoneToUse,
      })
      toast({ title: "Rescheduled!", description: "The meeting has been updated." })
      setRescheduleDialogOpen(false)
      setBookingDialogOpen(false)
      setActiveBooking(null)
      fetchBookings(currentMonthStr)
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

  const renderRightSidebar = () => (
          <div className="min-w-0 space-y-4 sm:space-y-6 lg:sticky lg:top-24 self-start rounded-2xl border border-gray-200 bg-white dark:bg-card dark:border-border p-4 sm:p-6 shadow-sm">
            {bookingsLoading ? (
              <>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg shrink-0" />
                    <Skeleton className="h-9 sm:h-10 w-40 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>

                <div className="mt-8">
                  <Skeleton className="h-[120px] w-full rounded-xl" />
                </div>
              </>
            ) : (
            <>
              {/* Header: actions on left, then date below */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchBookings(currentMonthStr)}
                    disabled={bookingsLoading || googleConnected === false}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg shrink-0 border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
                    aria-label={tCommon("refresh")}
                  >
                    <RefreshCwIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCreateAppointmentOpen(true)}
                    disabled={!calendarLink || googleConnected === false}
                    className="rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.08)] h-9 sm:h-10 px-3 sm:px-4 font-medium min-w-0 flex-1 sm:flex-initial"
                    aria-label={tCalendar("createAppointment")}
                  >
                    <PlusIcon className="h-4 w-4 mr-1.5 shrink-0" />
                    <span className="hidden sm:inline">{tCalendar("createAppointment")}</span>
                    <span className="sm:hidden">New</span>
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
                  <div className="rounded-xl border border-dashed border-[#E2E8F0] dark:border-border bg-[#FAFBFD] dark:bg-muted/20 py-6 sm:py-10 px-3 sm:px-4 text-center shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tCommon("nothingScheduled")}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      No more bookings today — add one?
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      className="mt-3 sm:mt-4 rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                      onClick={() => setCreateAppointmentOpen(true)}
                      disabled={!calendarLink || googleConnected === false}
                    >
                      <PlusIcon className="h-4 w-4 mr-2 shrink-0" />
                      <span className="hidden sm:inline">{tCalendar("createAppointment")}</span>
                      <span className="sm:hidden">New</span>
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
                        const isPhysical = b?.type === "physical" || b?.preferred_meeting_spot === "physical"
                        
                        let displayLocation = ""
                        if (isPhysical && location) {
                          // Take everything before the first comma to shorten the address
                          displayLocation = location.split(",")[0].trim()
                        }

                        let subtitle = ""
                        if (isPhysical && displayLocation) {
                          if (clientPhone) {
                            subtitle = `Meeting with ${clientPhone} at ${displayLocation}`
                          } else {
                            subtitle = `Meeting at ${displayLocation}`
                          }
                        } else if (!isPhysical) {
                          if (clientPhone) {
                            subtitle = `Virtual Meeting — ${clientPhone}`
                          } else {
                            subtitle = "Virtual Meeting"
                          }
                        } else {
                            subtitle = clientPhone ? `Meeting with ${clientPhone}` : (clientName + (showEmail ? ` (${b.email})` : ""))
                        }

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
                                      <div className="flex items-start gap-1.5 mt-1.5 text-sm text-muted-foreground w-full">
                                        {isPhysical ? (
                                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-orange-400" />
                                        ) : (
                                          <Video className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                                        )}
                                        <p className="line-clamp-2 break-words leading-tight text-left flex-1">
                                          {subtitle}
                                        </p>
                                      </div>
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
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {tCalendar("linkInactiveRegenerate")}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={onRegenerateSchedulingLink}
                            disabled={regeneratingSchedulingLink || googleConnected === false}
                          >
                            {regeneratingSchedulingLink
                              ? tCalendar("regeneratingLink")
                              : tCalendar("regenerateLink")}
                          </Button>
                        </div>
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

  )

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
                  {/* Meeting type badge */}
                  {(() => {
                    const isPhysical = activeBooking?.type === "physical" || activeBooking?.preferred_meeting_spot === "physical"
                    const label = isPhysical ? "In-person" : "Virtual"
                    return (
                      <div className="flex py-3 border-b border-border/50">
                        <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Type</span>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                          isPhysical
                            ? "bg-orange-50 text-orange-700 ring-orange-200"
                            : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", isPhysical ? "bg-orange-400" : "bg-indigo-500")} />
                          {label}
                        </span>
                      </div>
                    )
                  })()}
                  <div className="flex py-3 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Client</span>
                    <span className="text-sm text-foreground">
                      {activeBooking?.client_name || parseBookingNameAndLocation(activeBooking?.name).displayName || "—"}
                      {(() => {
                        const email = activeBooking?.client_email || activeBooking?.email
                        return email && !isPlaceholderEmail(email) ? ` (${String(email)})` : null
                      })()}
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
                  const joinUrl = getBookingVirtualLink(activeBooking)
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
          clients={clients.map((c) => ({ id: c.id, name: c.name || "", email: c.email || "", address: c.address }))}
          profile={profile ? { time_zone: profile.time_zone, calendar_link: profile.calendar_link } : null}
          onSuccess={() => fetchBookings(currentMonthStr)}
          onClientCreated={refetchClients}
        />

        <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] dark:bg-muted/20">
          <div className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6 sm:py-6 min-w-0">
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

              {googleConnected === false ? (
                <Alert className="bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800">
                  <AlertCircleIcon className="text-indigo-600 dark:text-indigo-400" />
                  <AlertDescription className="flex items-center justify-between text-indigo-800 dark:text-indigo-200">
                    <span>You must connect your Google Account to enable calendar features.</span>
                    <Button variant="outline" size="sm" asChild className="ml-4 shrink-0 bg-white dark:bg-transparent">
                      <a href="/settings?tab=integrations">Connect Google Account</a>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4 sm:mt-6">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <TabsList className="h-auto min-w-0 flex-1 sm:flex-initial gap-0.5 sm:gap-1 rounded-lg bg-[#F1F5F9] dark:bg-muted p-1">
                  <TabsTrigger
                    value="calendar"
                    className="rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#1E293B] data-[state=active]:shadow-[0_2px_6px_rgba(0,0,0,0.08)] data-[state=active]:border data-[state=active]:border-[#E2E8F0] dark:data-[state=active]:bg-card dark:data-[state=active]:text-foreground dark:data-[state=active]:border-border flex-1 sm:flex-initial"
                  >
                    {tCalendar("title")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="availability"
                    className="rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#1E293B] data-[state=active]:shadow-[0_2px_6px_rgba(0,0,0,0.08)] data-[state=active]:border data-[state=active]:border-[#E2E8F0] dark:data-[state=active]:bg-card dark:data-[state=active]:text-foreground dark:data-[state=active]:border-border flex-1 sm:flex-initial"
                  >
                    {tCalendar("setAvailability")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calendar" className="mt-4 sm:mt-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] min-w-0">
              {bookingsLoading ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
                  {/* Header skeleton */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-20 rounded-md" />
                      <Skeleton className="h-5 w-10 rounded-md" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </div>
                  {/* Day-of-week labels skeleton */}
                  <div className="grid grid-cols-7 mb-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={`h-${i}`} className="h-4 w-5 mx-auto rounded" />
                    ))}
                  </div>
                  {/* Day cells skeleton — compact circles matching the new design */}
                  <div className="grid grid-cols-7">
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div key={`d-${i}`} className="flex items-center justify-center py-1">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
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
                </div>
              )}

              {renderRightSidebar()}
            </div>
          </TabsContent>
          <TabsContent value="availability" className="mt-4 sm:mt-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] min-w-0">
              <div className="min-w-0">
                <AvailabilityTab onAvailabilityChanged={() => fetchBookings(currentMonthStr)} />
              </div>
              {renderRightSidebar()}
            </div>
          </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
