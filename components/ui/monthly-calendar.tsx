"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isBefore(a: Date, b: Date) {
  return (
    a.getFullYear() < b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
  )
}

export type MonthlyCalendarProps = {
  month: Date
  selected?: Date
  onSelect: (day: Date) => void
  onMonthChange: (month: Date) => void
  getCount?: (day: Date) => number
  /** If true, days before today are dimmed and non-interactive */
  disablePast?: boolean
  className?: string
}

export function MonthlyCalendar({
  month,
  selected,
  onSelect,
  onMonthChange,
  getCount,
  disablePast = false,
  className,
}: MonthlyCalendarProps) {
  const first = useMemo(() => startOfMonth(month), [month])
  const today = useMemo(() => new Date(), [])

  const monthLabel = useMemo(
    () => first.toLocaleDateString(undefined, { month: "long" }),
    [first]
  )
  const yearLabel = useMemo(
    () => first.toLocaleDateString(undefined, { year: "numeric" }),
    [first]
  )

  const cells = useMemo(() => {
    const firstDayOfWeek = first.getDay()
    const start = new Date(first)
    start.setDate(first.getDate() - firstDayOfWeek)

    const out: Array<{ date: Date; inMonth: boolean; key: string }> = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({
        date: d,
        inMonth: d.getMonth() === first.getMonth(),
        key: dateKeyLocal(d),
      })
    }
    return out
  }, [first])

  const canGoPrev = !isBefore(addMonths(first, -1), startOfMonth(today))

  return (
    <div className={cn("w-full", className)}>

      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          {monthLabel}{" "}
          <span className="font-normal text-gray-400">{yearLabel}</span>
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(first, -1))}
            disabled={disablePast && !canGoPrev}
            aria-label="Previous month"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:pointer-events-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(first, 1))}
            aria-label="Next month"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-gray-400 py-1 select-none"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — each column centers a fixed-size button so cells never stretch */}
      <div className="grid grid-cols-7">
        {cells.map(({ date, inMonth, key }) => {
          const count = getCount ? getCount(date) : 0
          const isSelected = selected ? isSameDay(date, selected) : false
          const isToday = isSameDay(date, today)
          const isPast =
            disablePast &&
            !isToday &&
            date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const hasCount = count > 0 && inMonth
          const countLabel = count > 99 ? "99+" : String(count)

          return (
            <div key={key} className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={() => !isPast && inMonth && onSelect(date)}
                disabled={isPast || !inMonth}
                aria-pressed={isSelected}
                aria-label={date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                className={cn(
                  // Fixed compact size — never stretches with container
                  "relative w-9 h-9 flex items-center justify-center rounded-xl",
                  "text-sm font-medium transition-all select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",

                  // Out-of-month
                  !inMonth && "text-gray-200 pointer-events-none",

                  // Past in-month
                  inMonth && isPast && "text-gray-300 pointer-events-none",

                  // Normal in-month
                  inMonth && !isPast && !isSelected && !isToday &&
                  "text-gray-700 hover:bg-primary/5 hover:text-primary cursor-pointer",

                  // Today — thin ring, no fill
                  isToday &&
                  "ring-1 ring-primary/30 text-primary font-semibold cursor-pointer hover:bg-primary/5",

                  // Selected — solid theme color, no oversized shadow
                  isSelected && !isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {date.getDate()}

                {/* Today dot */}
                {isToday && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}

                {/* Count badge */}
                {hasCount && (
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                      "rounded-full font-semibold tabular-nums",
                      "h-4 min-w-4 px-0.5 text-[9px] leading-none",
                      (isSelected && !isToday)
                        ? "bg-primary-foreground/30 text-primary-foreground"
                        : isToday
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary"
                    )}
                  >
                    {countLabel}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}