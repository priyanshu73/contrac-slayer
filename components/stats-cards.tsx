import { Card } from "@/components/ui/card"

export function StatsCards() {
  const stats = [
    {
      label: "New Leads",
      value: "12",
      change: "+3 today",
      trend: "up" as const,
    },
    {
      label: "Active Jobs",
      value: "8",
      change: "2 this week",
      trend: "up" as const,
    },
    {
      label: "Pending Invoices",
      value: "$4,250",
      change: "5 unpaid",
      trend: "neutral" as const,
    },
    {
      label: "This Month",
      value: "$18,500",
      change: "+12% vs last",
      trend: "up" as const,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className={`text-sm ${stat.trend === "up" ? "text-[var(--status-active)]" : "text-muted-foreground"}`}>
              {stat.change}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
