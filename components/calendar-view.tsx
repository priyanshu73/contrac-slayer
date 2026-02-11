"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch jobs/calendar events from API when endpoint is available
    // For now, show empty state
    setLoading(false)
    setJobs([])
  }, [])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const getJobsForDay = (_day: number): Array<{ time: string; client?: string }> => {
    // TODO: Filter jobs by date when API is available
    return []
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  return (
    <Card className="p-6 lg:p-8">
      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Calendar Grid — spacious, full width, responsive gaps */}
      <div className="grid grid-cols-7 gap-3 lg:gap-4 w-full">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="pb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            {day.slice(0, 1)}
            <span className="hidden sm:inline">{day.slice(1)}</span>
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] rounded-xl border border-border/30"
            aria-hidden
          />
        ))}

        {/* Calendar days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const dayJobs = getJobsForDay(day)
          const today = new Date()
          const isToday =
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()

          return (
            <div
              key={day}
              className="relative aspect-square min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] rounded-xl border border-border/30 p-3 sm:p-4 hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col"
            >
              {/* Booking badge — top right */}
              {dayJobs.length > 0 && (
                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-semibold shadow-sm">
                  {dayJobs.length}
                </div>
              )}
              {/* Date number */}
              <div
                className={cn(
                  "inline-flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm sm:text-base font-normal tabular-nums transition-all",
                  isToday
                    ? "bg-blue-500 text-white shadow-md scale-105"
                    : "text-foreground/80 group-hover:text-foreground"
                )}
              >
                {day}
              </div>
              {/* Optional: event dots at bottom when there are jobs */}
              {dayJobs.length > 0 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {dayJobs.slice(0, 3).map((_, idx) => (
                    <div key={idx} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
