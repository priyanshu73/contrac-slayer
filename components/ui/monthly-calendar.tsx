"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export type MonthlyCalendarProps = {
  month: Date
  selected?: Date
  onSelect: (day: Date) => void
  onMonthChange: (month: Date) => void
  getCount?: (day: Date) => number
  className?: string
}

export function MonthlyCalendar({
  month,
  selected,
  onSelect,
  onMonthChange,
  getCount,
  className,
}: MonthlyCalendarProps) {
  const first = useMemo(() => startOfMonth(month), [month])
  const title = useMemo(
    () =>
      first.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [first]
  )

  const cells = useMemo(() => {
    const firstDayOfWeek = first.getDay() // 0=Sun
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
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

    // If month starts late and has 28 days, last row is often empty; keep it stable anyway.
    // But ensure we at least represent all days.
    if (daysInMonth <= 28 && firstDayOfWeek === 0) {
      return out.slice(0, 35)
    }
    return out
  }, [first])

  return (
    <div
      className={cn(
        "rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-5 md:p-6",
        "shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">Bookings</div>
          <div className="truncate text-lg font-semibold leading-tight text-[#1E293B] dark:text-foreground">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(first, -1))}
            aria-label="Previous month"
            className="h-9 w-9 rounded-lg border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(first, 1))}
            aria-label="Next month"
            className="h-9 w-9 rounded-lg border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="grid h-8 place-items-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map(({ date, inMonth, key }) => {
          const count = getCount ? getCount(date) : 0
          const isSelected = selected ? isSameDay(date, selected) : false
          const hasBookings = count > 0

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-lg text-sm font-medium transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                inMonth ? "text-foreground" : "text-muted-foreground/50",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] shadow-md"
                  : "hover:bg-muted/80 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]",
                !isSelected && hasBookings ? "ring-1 ring-primary/20" : ""
              )}
              aria-pressed={isSelected}
            >
              <span>{date.getDate()}</span>
              {hasBookings ? (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-0.5 text-[10px] font-semibold tabular-nums shadow-sm",
                    isSelected ? "bg-white dark:bg-card text-primary" : "bg-primary text-primary-foreground"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}



