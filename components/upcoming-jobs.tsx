import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function UpcomingJobs() {
  const jobs = [
    {
      id: 1,
      client: "John Smith",
      service: "Weekly Mowing",
      date: "Today",
      time: "2:00 PM",
      location: "123 Oak Street",
      status: "confirmed",
    },
    {
      id: 2,
      client: "Lisa Brown",
      service: "Hedge Trimming",
      date: "Tomorrow",
      time: "10:00 AM",
      location: "456 Maple Ave",
      status: "confirmed",
    },
    {
      id: 3,
      client: "Tom Wilson",
      service: "Mulch Installation",
      date: "Thu, Oct 19",
      time: "9:00 AM",
      location: "789 Pine Road",
      status: "pending",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Jobs</h2>
        <Button variant="ghost" size="sm" asChild>
          <a href="/calendar">View All</a>
        </Button>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-none">{job.client}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{job.service}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {job.date} at {job.time}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {job.location}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
