import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function RecentLeads() {
  const leads = [
    {
      id: 1,
      name: "Sarah Johnson",
      service: "Lawn Maintenance",
      status: "new",
      time: "2 hours ago",
      phone: "(555) 123-4567",
    },
    {
      id: 2,
      name: "Mike Chen",
      service: "Tree Removal",
      status: "contacted",
      time: "5 hours ago",
      phone: "(555) 234-5678",
    },
    {
      id: 3,
      name: "Emily Davis",
      service: "Garden Design",
      status: "quoted",
      time: "1 day ago",
      phone: "(555) 345-6789",
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
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Leads</h2>
        <Button variant="ghost" size="sm" asChild>
          <a href="/leads">View All</a>
        </Button>
      </div>
      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-semibold">{lead.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-none">{lead.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{lead.service}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{lead.time}</span>
                <span>{lead.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
