import { CalendarHeader } from "@/components/calendar-header"
import { CalendarView } from "@/components/calendar-view"
import { UpcomingJobsList } from "@/components/upcoming-jobs-list"

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background">
      <CalendarHeader />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CalendarView />
          </div>
          <div>
            <UpcomingJobsList />
          </div>
        </div>
      </main>
    </div>
  )
}
