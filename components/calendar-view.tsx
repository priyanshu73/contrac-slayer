"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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

  const getJobsForDay = (day: number) => {
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
    <Card className="p-5">
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square p-2" />
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
              className={`aspect-square rounded-lg border p-2 ${
                isToday ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{day}</div>
              <div className="mt-1 space-y-1">
                {dayJobs.slice(0, 2).map((job, idx) => (
                  <div
                    key={idx}
                    className="truncate rounded bg-primary/10 px-1 py-0.5 text-xs text-primary"
                    title={`${job.time} - ${job.client}`}
                  >
                    {job.time}
                  </div>
                ))}
                {dayJobs.length > 2 && <div className="text-xs text-muted-foreground">+{dayJobs.length - 2} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
