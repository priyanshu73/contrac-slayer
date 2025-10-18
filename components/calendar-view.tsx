"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 17)) // Oct 17, 2025

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

  // Mock jobs data
  const jobs = [
    { date: 17, client: "John Smith", time: "2:00 PM", service: "Weekly Mowing" },
    { date: 17, client: "Sarah Johnson", time: "4:00 PM", service: "Garden Design" },
    { date: 18, client: "Lisa Brown", time: "10:00 AM", service: "Hedge Trimming" },
    { date: 19, client: "Tom Wilson", time: "9:00 AM", service: "Mulch Installation" },
    { date: 20, client: "Mike Chen", time: "1:00 PM", service: "Tree Removal" },
    { date: 21, client: "Emily Davis", time: "11:00 AM", service: "Lawn Maintenance" },
  ]

  const getJobsForDay = (day: number) => {
    return jobs.filter((job) => job.date === day)
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
          const isToday = day === 17

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
