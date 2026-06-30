"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  Eye,
  HardHat,
  Send,
  UserPlus2,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Shape of one item in the dashboard "needs attention" feed. This mirrors the
 * proposed backend `GET /dashboard/summary -> action_items[]` contract so the
 * mock data below can be swapped for a live fetch with no component changes.
 */
export type ActionType =
  | "DRAW_READY" // payment-schedule line triggered, not yet invoiced
  | "INVOICE_OVERDUE" // invoice past due_date, balance_due > 0
  | "QUOTE_VIEWED" // customer_viewed_at set, not accepted (hot)
  | "QUOTE_UNVIEWED" // SENT, no customer_viewed_at after N days
  | "QUOTE_EXPIRING" // quote_expiration_date within N days
  | "LEAD_UNCONTACTED" // lead NEW, no last_contacted_at
  | "TRADE_PENDING" // ProjectTrade PENDING_ACCEPTANCE blocking a start

export type Severity = "money" | "hot" | "warn" | "info"

export interface ActionItem {
  id: string
  type: ActionType
  severity: Severity
  title: string
  subtitle: string
  amount?: number | null
  ageDays?: number | null
  href: string
}

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

const TYPE_META: Record<ActionType, { icon: LucideIcon; label: string }> = {
  DRAW_READY: { icon: BadgeDollarSign, label: "Draw ready to bill" },
  INVOICE_OVERDUE: { icon: AlertTriangle, label: "Invoice overdue" },
  QUOTE_VIEWED: { icon: Eye, label: "Quote viewed" },
  QUOTE_UNVIEWED: { icon: Send, label: "Quote unopened" },
  QUOTE_EXPIRING: { icon: CalendarClock, label: "Quote expiring" },
  LEAD_UNCONTACTED: { icon: UserPlus2, label: "New lead" },
  TRADE_PENDING: { icon: HardHat, label: "Trade unaccepted" },
}

const SEVERITY_STYLES: Record<
  Severity,
  { dot: string; chip: string; iconWrap: string; rail: string }
> = {
  money: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconWrap: "bg-emerald-50 text-emerald-600",
    rail: "bg-emerald-500",
  },
  hot: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    iconWrap: "bg-rose-50 text-rose-600",
    rail: "bg-rose-500",
  },
  warn: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    iconWrap: "bg-amber-50 text-amber-600",
    rail: "bg-amber-400",
  },
  info: {
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconWrap: "bg-sky-50 text-sky-600",
    rail: "bg-sky-400",
  },
}

const SEVERITY_RANK: Record<Severity, number> = { money: 0, hot: 1, warn: 2, info: 3 }

function ageLabel(days?: number | null) {
  if (days == null) return null
  if (days <= 0) return "today"
  if (days === 1) return "1 day"
  return `${days} days`
}

function ActionRow({ item }: { item: ActionItem }) {
  const locale = useLocale()
  const meta = TYPE_META[item.type]
  const styles = SEVERITY_STYLES[item.severity]
  const Icon = meta.icon
  const age = ageLabel(item.ageDays)

  return (
    <Link
      href={`/${locale}${item.href}`}
      className="group relative flex items-center gap-3 rounded-lg border border-slate-100 bg-white py-2.5 pl-3 pr-2.5 transition-all hover:border-slate-300 hover:bg-slate-50"
    >
      <span className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full", styles.rail)} />
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.iconWrap)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
          <span
            className={cn(
              "hidden shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-medium sm:inline-block",
              styles.chip
            )}
          >
            {meta.label}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">
          {item.subtitle}
          {age ? <span className="text-slate-400"> · {age}</span> : null}
        </p>
      </div>
      {item.amount != null ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{currency(item.amount)}</span>
      ) : null}
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
    </Link>
  )
}

export function DashboardActionQueue({
  items,
  loading,
}: {
  items: ActionItem[]
  loading: boolean
}) {
  const sorted = [...items].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (b.amount ?? 0) - (a.amount ?? 0)
  )
  const totalAtStake = items
    .filter((i) => i.severity === "money" || i.type === "INVOICE_OVERDUE")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            Needs your attention
            {!loading && items.length > 0 ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {items.length}
              </span>
            ) : null}
          </h2>
          {!loading && totalAtStake > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600">{currency(totalAtStake)}</span> billable or overdue
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Prioritized by money and momentum</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">You&apos;re all caught up</p>
          <p className="text-xs text-muted-foreground">No quotes, invoices, or leads need action right now.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((item) => (
            <ActionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}

/**
 * Mock feed for the prototype. Replace with `summary.action_items` from
 * `GET /dashboard/summary` once the endpoint exists — same shape.
 */
export const MOCK_ACTION_ITEMS: ActionItem[] = [
  {
    id: "draw-1",
    type: "DRAW_READY",
    severity: "money",
    title: "Hartman kitchen — 50% completion draw",
    subtitle: "Schedule triggered on completion · not yet invoiced",
    amount: 18400,
    ageDays: 2,
    href: "/quotes/148",
  },
  {
    id: "inv-1",
    type: "INVOICE_OVERDUE",
    severity: "hot",
    title: "INV-0112 · Ryan Dias",
    subtitle: "Net 30 elapsed · balance due",
    amount: 6250,
    ageDays: 14,
    href: "/invoices",
  },
  {
    id: "quote-viewed-1",
    type: "QUOTE_VIEWED",
    severity: "hot",
    title: "John Smith opened your quote 3×",
    subtitle: "Viewed, not accepted — follow up to close",
    amount: 11790,
    ageDays: 1,
    href: "/quotes/147",
  },
  {
    id: "draw-2",
    type: "DRAW_READY",
    severity: "money",
    title: "Patio install — deposit on acceptance",
    subtitle: "Accepted · deposit draw ready to bill",
    amount: 4050,
    ageDays: 0,
    href: "/quotes/146",
  },
  {
    id: "quote-exp-1",
    type: "QUOTE_EXPIRING",
    severity: "warn",
    title: "Bathroom remodel quote expires Friday",
    subtitle: "Sent to M. Alvarez · expiring in 2 days",
    amount: 9800,
    ageDays: 5,
    href: "/quotes/145",
  },
  {
    id: "trade-1",
    type: "TRADE_PENDING",
    severity: "warn",
    title: "Electrical scope unaccepted — Kitchen remodel",
    subtitle: "Blocks rough-in start · awaiting subcontractor",
    amount: null,
    ageDays: 4,
    href: "/projects",
  },
  {
    id: "quote-unviewed-1",
    type: "QUOTE_UNVIEWED",
    severity: "info",
    title: "Quote to Ryan Dias still unopened",
    subtitle: "Sent 4 days ago · no views yet",
    amount: 81,
    ageDays: 4,
    href: "/quotes",
  },
  {
    id: "lead-1",
    type: "LEAD_UNCONTACTED",
    severity: "info",
    title: "New lead from AI phone line",
    subtitle: "Deck rebuild · phone call · not contacted",
    amount: null,
    ageDays: 1,
    href: "/leads",
  },
]
