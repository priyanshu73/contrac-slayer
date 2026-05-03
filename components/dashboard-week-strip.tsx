"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Booking = Record<string, any>

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const EVENT_STYLES = [
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-amber-100 text-amber-800 border-amber-200",
] as const

function startOfWeekMonday(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function addWeeks(date: Date, amount: number) {
  return addDays(date, amount * 7)
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function bookingStartDate(booking: Booking): Date | null {
  const raw =
    booking?.starts_at ||
    booking?.starts_at_for_client ||
    booking?.start_time ||
    booking?.start_at ||
    booking?.start ||
    booking?.scheduled_at

  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseBookingName(name: string | undefined | null) {
  if (!name || typeof name !== "string") return ""
  const atIndex = name.lastIndexOf(" @ ")
  return atIndex === -1 ? name.trim() : name.slice(0, atIndex).trim()
}

function bookingTitle(booking: Booking) {
  if (typeof booking?.title === "string" && booking.title.trim()) return booking.title.trim()
  if (typeof booking?.client_name === "string" && booking.client_name.trim()) return booking.client_name.trim()
  if (typeof booking?.name === "string" && booking.name.trim()) return parseBookingName(booking.name)
  return "Meeting"
}

function formatWeekLabel(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startMonth = start.toLocaleDateString("en-US", { month: "short" })
  const endMonth = end.toLocaleDateString("en-US", { month: "short" })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = end.getFullYear()

  return sameMonth
    ? `${startMonth} ${startDay}-${endDay}, ${year}`
    : `${startMonth} ${startDay}-${endMonth} ${endDay}, ${year}`
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).replace(":00", "")
}

export function DashboardWeekStrip() {
  const locale = useLocale()
  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  )

  useEffect(() => {
    let cancelled = false

    const loadBookings = async () => {
      setLoading(true)
      try {
        const keys = Array.from(new Set(weekDays.map((day) => monthKey(day))))
        const responses = await Promise.all(keys.map((key) => api.getBookings({ month: key, sorting_order: "asc" })))
        const merged = new Map<string, Booking>()

        responses.forEach((response) => {
          const items = (response as { bookings?: Booking[] })?.bookings ?? []
          items.forEach((booking) => {
            const bookingId = String(booking?.id ?? `${booking?.start ?? ""}-${booking?.title ?? ""}`)
            if (!merged.has(bookingId)) merged.set(bookingId, booking)
          })
        })

        if (!cancelled) setBookings(Array.from(merged.values()))
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch dashboard bookings:", error)
        }
        if (!cancelled) setBookings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadBookings()

    return () => {
      cancelled = true
    }
  }, [weekDays])

  const bookingsByDay = useMemo(() => {
    const grouped = new Map<string, Booking[]>()

    bookings.forEach((booking) => {
      const start = bookingStartDate(booking)
      if (!start) return
      const key = dateKey(start)
      const existing = grouped.get(key) ?? []
      existing.push(booking)
      grouped.set(key, existing)
    })

    grouped.forEach((items, key) => {
      grouped.set(
        key,
        items.sort((left, right) => {
          const leftTime = bookingStartDate(left)?.getTime() ?? 0
          const rightTime = bookingStartDate(right)?.getTime() ?? 0
          return leftTime - rightTime
        })
      )
    })

    return grouped
  }, [bookings])

  const weekEnd = weekDays[6]

  return (
    <Card className="gap-0 overflow-hidden border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setWeekStart((current) => addWeeks(current, -1))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-slate-900">{formatWeekLabel(weekStart, weekEnd)}</p>
            <p className="text-xs text-slate-500">This week at a glance</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setWeekStart((current) => addWeeks(current, 1))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Link
          href={`/${locale}/calendar`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Open calendar
        </Link>
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {weekDays.map((day, dayIndex) => {
          const items = bookingsByDay.get(dateKey(day)) ?? []
          const isToday = sameDay(day, today)

          return (
            <div
              key={dateKey(day)}
              className={`rounded-xl border px-3 py-2.5 ${
                isToday ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{DAY_LABELS[dayIndex]}</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-slate-900">{day.getDate()}</p>
                </div>
                <span className={`h-2 w-2 rounded-full ${isToday ? "bg-sky-500" : "bg-slate-300"}`} />
              </div>

              <div className="space-y-2">
                {loading ? (
                  <>
                    <div className="h-6 rounded-lg bg-slate-200/70" />
                    <div className="h-6 rounded-lg bg-slate-100" />
                  </>
                ) : items.length > 0 ? (
                  items.slice(0, 3).map((booking, itemIndex) => {
                    const start = bookingStartDate(booking)
                    return (
                      <div
                        key={String(booking?.id ?? `${dateKey(day)}-${itemIndex}`)}
                        className={`truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium ${EVENT_STYLES[itemIndex % EVENT_STYLES.length]}`}
                        title={bookingTitle(booking)}
                      >
                        {start ? `${formatTime(start)} · ` : ""}
                        {bookingTitle(booking)}
                      </div>
                    )
                  })
                ) : (
                  <div className="pt-1 text-xs text-slate-500">No meetings</div>
                )}

                {!loading && items.length > 3 ? (
                  <div className="text-xs font-medium text-slate-500">+{items.length - 3} more</div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
