"use client"

import { useState, useEffect, useMemo } from "react"
import {
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  isSameDay,
  format,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  /** Optional array of dates that have events (used to show dot indicators). */
  eventDates?: Date[]
  /** Called when the user clicks a day. */
  onDayClick?: (date: Date) => void
  /** Currently selected date (controlled). */
  selectedDate?: Date | null
  /** If true, past days are not clickable (defaults to false). */
  disablePast?: boolean
  className?: string
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarView({
  eventDates = [],
  onDayClick,
  selectedDate: controlledSelected,
  disablePast = false,
  className,
}: CalendarViewProps = {}) {
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(today)
  const [internalSelected, setInternalSelected] = useState<Date | null>(null)

  const selectedDate = controlledSelected !== undefined ? controlledSelected : internalSelected

  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch jobs/calendar events from API when endpoint is available
    setLoading(false)
    setJobs([])
  }, [])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    const leadingBlanks = getDay(start)
    return { days, leadingBlanks }
  }, [currentMonth])

  const eventDateKeys = useMemo(
    () => new Set(eventDates.map((d) => format(d, "yyyy-MM-dd"))),
    [eventDates]
  )

  const handleDayClick = (day: Date) => {
    if (disablePast && isBefore(day, today)) return
    if (controlledSelected === undefined) setInternalSelected(day)
    onDayClick?.(day)
  }

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-200 shadow-sm p-7", className)}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">
          <span>{format(currentMonth, "MMMM")}</span>{" "}
          <span className="text-gray-400 font-normal">{format(currentMonth, "yyyy")}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            disabled={disablePast && isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:pointer-events-none transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {/* Day buttons */}
        {calendarDays.days.map((day) => {
          const isPast = disablePast && isBefore(day, today)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isToday = isSameDay(day, today)
          const hasEvent = eventDateKeys.has(format(day, "yyyy-MM-dd"))

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={isPast}
              aria-pressed={isSelected}
              aria-label={format(day, "EEEE MMMM d")}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isPast && "text-gray-200 cursor-not-allowed",
                !isPast && !isSelected && "text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer",
                isSelected && "bg-blue-600 text-white shadow-md shadow-blue-200",
                isToday && !isSelected && "ring-1 ring-blue-300 text-blue-600"
              )}
            >
              {format(day, "d")}

              {/* Today indicator dot */}
              {isToday && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}

              {/* Event indicator dot (shown when not selected, not today-only dot) */}
              {hasEvent && !isToday && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
