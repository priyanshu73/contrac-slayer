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
    const start = new Date(first)
    start.setDate(first.getDate() - firstDayOfWeek)

    const out: Array<{ date: Date; inMonth: boolean; key: string }> = []
    for (let i = 0; i < 35; i++) {
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

  const today = useMemo(() => new Date(), [])
  const isToday = (d: Date) => isSameDay(d, today)

  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-6 sm:p-7 lg:p-8",
        "shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base sm:text-lg font-semibold leading-tight text-[#1E293B] dark:text-foreground">{title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(first, -1))}
            aria-label="Previous month"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(first, 1))}
            aria-label="Next month"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border-[#E2E8F0] dark:border-border hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid: equal columns, constrained width so cells stay compact with more padding */}
      <div className="grid grid-cols-7 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0 [&>button]:min-w-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="pb-2 sm:pb-2.5 text-center text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            {d.slice(0, 1)}
            <span className="hidden sm:inline">{d.slice(1)}</span>
          </div>
        ))}
        {cells.map(({ date, inMonth, key }) => {
          const count = getCount ? getCount(date) : 0
          const isSelected = selected ? isSameDay(date, selected) : false
          const hasBookings = count > 0
          const todayCell = inMonth && isToday(date)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex aspect-square w-full min-w-0 rounded-lg sm:rounded-xl transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "items-center justify-center",
                inMonth
                  ? "border border-[#E2E8F0] dark:border-border/50 bg-slate-50/60 sm:bg-slate-50/80 dark:bg-slate-800/20 sm:dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-border cursor-pointer"
                  : "border border-transparent bg-slate-50/30 sm:bg-slate-50/40 dark:bg-slate-800/10 cursor-pointer",
                todayCell && !isSelected && "border border-primary/40 bg-primary/5 dark:bg-primary/10",
                isSelected && "bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary shadow-sm hover:shadow-md",
                hasBookings && !isSelected && inMonth && "border-primary/30 dark:border-primary/40",
                !inMonth && "opacity-50",
                !isSelected && inMonth && "text-foreground"
              )}
              aria-pressed={isSelected}
            >
              {/* Meeting count — top corner, responsive */}
              {hasBookings && inMonth && (
                <div
                  className={cn(
                    "absolute top-0 right-0 flex items-center justify-center rounded-full font-semibold tabular-nums shadow-sm bg-primary text-primary-foreground",
                    "h-[18px] w-[18px] min-w-[18px] text-[9px] leading-none",
                    "sm:h-5 sm:w-5 sm:min-w-5 sm:text-[10px]",
                    "md:h-6 md:w-6 md:min-w-6 md:text-xs"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </div>
              )}
              {/* Day number — centered */}
              <span
                className={cn(
                  "flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg text-sm sm:text-base font-medium tabular-nums transition-all pointer-events-none",
                  isSelected && "text-primary font-semibold",
                  todayCell && !isSelected && "bg-primary/10 text-primary dark:bg-primary/20",
                  !inMonth && "text-muted-foreground/70",
                  !isSelected && inMonth && !todayCell && "text-foreground"
                )}
              >
                {date.getDate()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}



