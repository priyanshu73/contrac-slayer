"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ClientDetail({ clientId }: { clientId: string }) {
  // Mock data - would come from database
  const client = {
    id: clientId,
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "(555) 123-4567",
    address: "123 Oak Street, Springfield, IL 62701",
    status: "active",
    since: "Jan 2024",
    totalJobs: 12,
    totalRevenue: 1850,
    notes: "Prefers morning appointments. Gate code: 1234. Dog in backyard.",
  }

  const jobs = [
    {
      id: "1",
      service: "Weekly Mowing",
      date: "Oct 17, 2025",
      status: "completed",
      amount: "$75.00",
    },
    {
      id: "2",
      service: "Weekly Mowing",
      date: "Oct 10, 2025",
      status: "completed",
      amount: "$75.00",
    },
    {
      id: "3",
      service: "Hedge Trimming",
      date: "Oct 3, 2025",
      status: "completed",
      amount: "$125.00",
    },
  ]

  const invoices = [
    {
      id: "INV-001",
      date: "Oct 15, 2025",
      amount: "$75.00",
      status: "paid",
    },
    {
      id: "INV-002",
      date: "Oct 8, 2025",
      amount: "$75.00",
      status: "paid",
    },
    {
      id: "INV-003",
      date: "Oct 1, 2025",
      amount: "$125.00",
      status: "paid",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "active":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Client Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-2xl font-semibold">{client.name.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{client.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Client since {client.since}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(client.status)}`}
              >
                {client.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-sm">{client.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="text-sm">{client.address}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="mt-1 text-2xl font-bold">{client.totalJobs}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold">${client.totalRevenue}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm">{client.notes}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <a href={`tel:${client.phone}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`mailto:${client.email}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/calendar/new?clientId=${client.id}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Schedule Job
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/quotes/new?clientId=${client.id}`}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Create Invoice
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Jobs and Invoices Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="jobs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">Jobs History</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4 space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{job.service}</p>
                    <p className="text-sm text-muted-foreground">{job.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  <span className="font-semibold">{job.amount}</span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">#{invoice.id}</p>
                    <p className="text-sm text-muted-foreground">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                  <span className="font-semibold">{invoice.amount}</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/invoices/${invoice.id}`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
