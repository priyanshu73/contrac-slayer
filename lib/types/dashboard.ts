// Types for the dashboard backend endpoints:
//   GET  /dashboard/summary
//   GET  /dashboard/nav-counts
//   GET  /dashboard/action-queue
//   POST /dashboard/action-queue/snooze · DELETE /dashboard/action-queue/snooze/{key}
//   POST /reminders

export interface DashboardMoney {
  unpaid_total: number
  unpaid_count: number
  past_due_total: number
  past_due_count: number
  due_this_month_total: number
  due_later_total: number
  paid_last_30d: number
}

export interface DashboardSummary {
  as_of: string
  tz: string
  money: DashboardMoney
  quotes: {
    awaiting_reply_count: number
    awaiting_reply_total: number
    accepted_no_project_count: number
  }
  leads: { new_last_7d: number }
  schedule: { booked_today: number; booked_this_week: number }
  caveats: string[]
}

export interface NavCounts {
  leads: number
  quotes: number
  clients: number
  invoices_late: number
  projects: number
  tasks_open: number
  crew: number
}

export type ActionSeverity = "money" | "hot" | "warn" | "info"

export type ActionType =
  | "DRAW_READY"
  | "INVOICE_OVERDUE"
  | "QUOTE_VIEWED"
  | "QUOTE_CHANGES_REQUESTED"
  | "QUOTE_ACCEPTED_NO_PROJECT"
  | "QUOTE_EXPIRING"
  | "TRADE_PENDING"
  | "TASK_DUE"
  | "QUOTE_UNVIEWED"
  | "LEAD_UNCONTACTED"

export interface ActionQueueItem {
  key: string
  type: ActionType
  severity: ActionSeverity
  title: string
  subtitle: string
  amount: number | null
  age_days: number | null
  href: string
  entity: { kind: string; id: number }
  primary_action: string | null
}

export interface ActionQueueResponse {
  as_of: string
  tz: string
  items: ActionQueueItem[]
  total_at_stake: number
  counts: { visible: number; snoozed: number; overflow: Record<string, number> }
  degraded_sources: string[]
  caveats: string[]
}
