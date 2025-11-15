import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function LeadsList() {
  const leads = [
    {
      id: "1",
      name: "Sarah Johnson",
      service: "Landscaping - Patio Installation",
      status: "new",
      time: "2 hours ago",
      phone: "(555) 123-4567",
      email: "sarah.j@email.com",
      address: "123 Oak Street, Springfield, IL 62701",
      notes: "Looking to install a new patio in backyard. 20x15 feet area with natural stone pavers.",
    },
    {
      id: "2",
      name: "Mike Chen",
      service: "Tree Removal",
      status: "contacted",
      time: "5 hours ago",
      phone: "(555) 234-5678",
      email: "mike.chen@email.com",
      address: "456 Maple Ave",
      notes: "Large oak tree in backyard, needs estimate",
    },
    {
      id: "3",
      name: "Emily Davis",
      service: "Garden Design",
      status: "quoted",
      time: "1 day ago",
      phone: "(555) 345-6789",
      email: "emily.d@email.com",
      address: "789 Pine Road",
      notes: "Sent quote for $2,500, waiting for response",
    },
    {
      id: "4",
      name: "Robert Taylor",
      service: "Irrigation System",
      status: "new",
      time: "1 day ago",
      phone: "(555) 456-7890",
      email: "r.taylor@email.com",
      address: "321 Birch Lane",
      notes: "Needs new sprinkler system installed",
    },
    {
      id: "5",
      name: "Jennifer Lee",
      service: "Landscape Lighting",
      status: "contacted",
      time: "2 days ago",
      phone: "(555) 567-8901",
      email: "jen.lee@email.com",
      address: "654 Cedar Court",
      notes: "Interested in outdoor lighting for front yard",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-[var(--status-new)]/10 text-[var(--status-new)]"
      case "contacted":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "quoted":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <Card key={lead.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{lead.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-none">{lead.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{lead.service}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(lead.status)}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <span>{lead.address}</span>
                </div>
                <p className="text-muted-foreground">{lead.notes}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={`/leads/${lead.id}`}>View Details</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <Button size="sm" variant="outline" asChild>
                  <a href={`/quotes/new?leadId=${lead.id}`}>
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Quote
                  </a>
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">{lead.time}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
