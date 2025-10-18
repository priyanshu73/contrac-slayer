import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function InvoicesList() {
  const invoices = [
    {
      id: "INV-001",
      client: "John Smith",
      service: "Weekly Mowing",
      amount: "$75.00",
      status: "paid",
      date: "Oct 15, 2025",
      dueDate: "Oct 22, 2025",
    },
    {
      id: "INV-002",
      client: "Sarah Johnson",
      service: "Garden Design",
      amount: "$2,500.00",
      status: "pending",
      date: "Oct 14, 2025",
      dueDate: "Oct 28, 2025",
    },
    {
      id: "INV-003",
      client: "Mike Chen",
      service: "Tree Removal",
      amount: "$850.00",
      status: "pending",
      date: "Oct 12, 2025",
      dueDate: "Oct 26, 2025",
    },
    {
      id: "INV-004",
      client: "Lisa Brown",
      service: "Hedge Trimming",
      amount: "$125.00",
      status: "overdue",
      date: "Oct 5, 2025",
      dueDate: "Oct 12, 2025",
    },
    {
      id: "INV-005",
      client: "Tom Wilson",
      service: "Mulch Installation",
      amount: "$1,200.00",
      status: "pending",
      date: "Oct 10, 2025",
      dueDate: "Oct 24, 2025",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "overdue":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold leading-none">{invoice.client}</h3>
                    <span className="text-xs text-muted-foreground">#{invoice.id}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{invoice.service}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{invoice.amount}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Issued: {invoice.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Due: {invoice.dueDate}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={`/invoices/${invoice.id}`}>View Details</a>
                </Button>
                {invoice.status === "pending" && (
                  <Button size="sm" variant="outline">
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Send Reminder
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
