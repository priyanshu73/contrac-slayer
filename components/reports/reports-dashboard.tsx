"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  differenceInCalendarDays,
} from "date-fns"
import { es as dfEs } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import type { DateRange } from "react-day-picker"
import { ArrowDown, ArrowUp, BarChart3, CalendarDays } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import type {
  AnalyticsGranularity,
  BreakdownRow,
  BreakdownsResponse,
  MetricDelta,
  OverviewResponse,
  PipelineResponse,
  TimeseriesResponse,
} from "@/lib/types/analytics"

// Semantic colour keys → hex, matching the timeline's palette.
const COLOR_HEX: Record<string, string> = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#94a3b8",
}

const COLOR_BAR: Record<string, string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
}

const numLocale = (locale: string) => (locale === "es" ? "es-US" : "en-US")
const dfLocale = (locale: string) => (locale === "es" ? dfEs : undefined)

const currency = (n: number, locale: string) =>
  new Intl.NumberFormat(numLocale(locale), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

const count = (n: number, locale: string) => new Intl.NumberFormat(numLocale(locale)).format(Math.round(n || 0))
const apiDate = (d: Date) => format(d, "yyyy-MM-dd")

type PresetKey = "week" | "month" | "30d" | "custom"

function presetRange(key: Exclude<PresetKey, "custom">): DateRange {
  const today = new Date()
  if (key === "week") return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
  if (key === "month") return { from: startOfMonth(today), to: endOfMonth(today) }
  return { from: subDays(today, 29), to: today }
}

// Pick a sensible bucket size from the span so the trend chart stays readable.
function granularityFor(from: Date, to: Date): AnalyticsGranularity {
  const days = differenceInCalendarDays(to, from)
  if (days <= 31) return "day"
  if (days <= 120) return "week"
  return "month"
}

export function ReportsDashboard() {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  const { user } = useAuth()
  const contractorUuid = user?.contractor_profile?.uuid

  const [preset, setPreset] = useState<PresetKey>("month")
  const [range, setRange] = useState<DateRange>(() => presetRange("month"))

  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null)
  const [breakdowns, setBreakdowns] = useState<BreakdownsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const from = range.from
  const to = range.to ?? range.from
  // Stable primitive keys so the effect only refires on an actual range change.
  const fromKey = from ? apiDate(from) : ""
  const toKey = to ? apiDate(to) : ""

  useEffect(() => {
    if (!contractorUuid || !fromKey || !toKey) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const granularity = granularityFor(new Date(fromKey), new Date(toKey))
        const [ov, pl, ts, bd] = await Promise.all([
          api.getAnalyticsOverview({ from: fromKey, to: toKey }),
          api.getAnalyticsPipeline({ from: fromKey, to: toKey }),
          api.getAnalyticsTimeseries({ from: fromKey, to: toKey, granularity }),
          api.getAnalyticsBreakdowns({ from: fromKey, to: toKey }),
        ])
        if (cancelled) return
        setOverview(ov)
        setPipeline(pl)
        setTimeseries(ts)
        setBreakdowns(bd)
      } catch (err) {
        if (!cancelled) setError(t("loadError"))
        if (process.env.NODE_ENV === "development") console.error("reports load failed", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [contractorUuid, fromKey, toKey, t])

  const rangeLabel =
    from && to
      ? `${format(from, t("dateFormat"), { locale: dfLocale(locale) })} – ${format(to, t("dateFormat"), { locale: dfLocale(locale) })}`
      : t("selectRange")

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      {/* Header + range controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <PresetButton label={t("thisWeek")} active={preset === "week"} onClick={() => { setPreset("week"); setRange(presetRange("week")) }} />
          <PresetButton label={t("thisMonth")} active={preset === "month"} onClick={() => { setPreset("month"); setRange(presetRange("month")) }} />
          <PresetButton label={t("last30")} active={preset === "30d"} onClick={() => { setPreset("30d"); setRange(presetRange("30d")) }} />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={preset === "custom" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
              >
                <CalendarDays className="h-4 w-4" />
                {t("custom")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                locale={dfLocale(locale)}
                mode="range"
                selected={range}
                onSelect={(r) => {
                  if (r) {
                    setPreset("custom")
                    setRange(r)
                  }
                }}
                numberOfMonths={2}
                defaultMonth={from}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card>
      )}

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title={t("quotesSent")} metric={overview?.quotes_sent} format="count" loading={loading} />
        <KpiCard title={t("quotesAccepted")} metric={overview?.quotes_accepted} format="count" loading={loading} />
        <KpiCard title={t("winRate")} metric={overview?.win_rate} format="percent" loading={loading} />
        <KpiCard title={t("avgEstimateValue")} metric={overview?.avg_quote_value} format="currency" loading={loading} />
        <KpiCard title={t("projectsCompleted")} metric={overview?.projects_completed} format="count" loading={loading} />
        <KpiCard title={t("invoicesSent")} metric={overview?.invoices_sent_amount} format="currency" loading={loading} subtitle={overview ? t("invoicesCount", { count: overview.invoices_sent_count.value }) : undefined} />
        <KpiCard title={t("revenueCollected")} metric={overview?.revenue_collected} format="currency" accent="emerald" loading={loading} />
        <KpiCard title={t("outstandingAr")} metric={overview?.outstanding_ar} format="currency" accent="rose" invertDelta loading={loading} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline funnel */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">{t("salesPipeline")}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t("funnelHint")}</p>
          <PipelineFunnel pipeline={pipeline} loading={loading} />
        </Card>

        {/* Revenue / quotes trend */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">{t("invoicedVsCollected")}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t("invoicedHint")}</p>
          <RevenueTrend timeseries={timeseries} loading={loading} />
        </Card>
      </div>

      {/* Quotes trend */}
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">{t("estimatesSentVsAccepted")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("estimatesHint")}</p>
        <QuotesTrend timeseries={timeseries} loading={loading} />
      </Card>

      {/* Breakdowns */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BreakdownPanel title={t("byLeadSource")} rows={breakdowns?.by_lead_source} loading={loading} valueKind="count" />
        <BreakdownPanel title={t("byTeamMember")} rows={breakdowns?.by_team_member} loading={loading} valueKind="currency" />
        <BreakdownPanel title={t("byEstimateTier")} rows={breakdowns?.by_quote_tier} loading={loading} valueKind="currency" />
      </section>

      {/* Caveats */}
      {overview?.caveats?.length ? (
        <div className="space-y-1 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-muted-foreground">
          {overview.caveats.map((c, i) => (
            <p key={i}>* {c}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PresetButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>
      {label}
    </Button>
  )
}

type ValueFormat = "count" | "currency" | "percent" | "days"

function formatValue(v: number, f: ValueFormat, locale: string): string {
  if (f === "currency") return currency(v, locale)
  if (f === "percent") return `${(v ?? 0).toFixed(1)}%`
  if (f === "days") return `${(v ?? 0).toFixed(1)}d`
  return count(v, locale)
}

function KpiCard({
  title,
  metric,
  format: fmt,
  subtitle,
  accent,
  invertDelta,
  loading,
}: {
  title: string
  metric?: MetricDelta
  format: ValueFormat
  subtitle?: string
  accent?: "emerald" | "rose"
  invertDelta?: boolean
  loading: boolean
}) {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  const accentText = accent === "emerald" ? "text-emerald-600" : accent === "rose" ? "text-rose-600" : "text-slate-900"
  const delta = metric?.delta_pct
  // For metrics where down is good (A/R), invert which direction reads as positive.
  const positive = delta == null ? null : invertDelta ? delta < 0 : delta > 0

  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
      {loading || !metric ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <>
          <p className={cn("mt-1 text-2xl font-bold tracking-tight tabular-nums", accentText)}>
            {formatValue(metric.value, fmt, locale)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {delta == null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className={cn("inline-flex items-center gap-0.5 font-medium", positive ? "text-emerald-600" : "text-rose-600")}>
                {delta > 0 ? <ArrowUp className="h-3 w-3" /> : delta < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {subtitle ? <span className="truncate text-muted-foreground">· {subtitle}</span> : <span className="text-muted-foreground">{t("vsPrev")}</span>}
          </div>
        </>
      )}
    </Card>
  )
}

function PipelineFunnel({ pipeline, loading }: { pipeline: PipelineResponse | null; loading: boolean }) {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  if (loading || !pipeline) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    )
  }
  const max = Math.max(1, ...pipeline.stages.map((s) => s.count))
  return (
    <div className="space-y-2.5">
      {pipeline.stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs font-medium text-slate-600">{labelFor(t, "stages", s.stage)}</span>
          <div className="relative h-7 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className={cn("flex h-full items-center rounded transition-all", COLOR_BAR[s.color] ?? COLOR_BAR.slate)}
              style={{ width: `${Math.max((s.count / max) * 100, s.count > 0 ? 6 : 0)}%` }}
            >
              <span className="px-2 text-xs font-semibold text-white tabular-nums">{count(s.count, locale)}</span>
            </div>
          </div>
          {s.amount > 0 && <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{currency(s.amount, locale)}</span>}
        </div>
      ))}
      {pipeline.note && <p className="pt-1 text-[11px] text-muted-foreground">{pipeline.note}</p>}
    </div>
  )
}

const revenueConfig = (t: (k: string) => string) =>
  ({
    invoiced_amount: { label: t("invoiced"), color: COLOR_HEX.sky },
    collected_amount: { label: t("collected"), color: COLOR_HEX.emerald },
  }) satisfies ChartConfig

const estimatesConfig = (t: (k: string) => string) =>
  ({
    quotes_sent: { label: t("sent"), color: COLOR_HEX.sky },
    quotes_accepted: { label: t("accepted"), color: COLOR_HEX.emerald },
  }) satisfies ChartConfig

// Backend-provided labels (funnel stages, tiers, lead sources) are looked up by exact
// name; unknown values fall through unchanged.
function labelFor(t: any, group: string, raw: string | null | undefined): string {
  const v = raw ?? ""
  return v && t.has(`${group}.${v}`) ? t(`${group}.${v}`) : v
}

function ChartSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded bg-slate-100" />
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] w-full items-center justify-center rounded border border-dashed border-slate-200 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function tickLabel(d: string, locale: string, pattern: string) {
  return format(new Date(d), pattern, { locale: dfLocale(locale) })
}

function RevenueTrend({ timeseries, loading }: { timeseries: TimeseriesResponse | null; loading: boolean }) {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  const tick = (d: string) => tickLabel(d, locale, t("tickFormat"))
  if (loading || !timeseries) return <ChartSkeleton />
  const hasData = timeseries.buckets.some((b) => b.invoiced_amount > 0 || b.collected_amount > 0)
  if (!hasData) return <EmptyChart label={t("noInvoicing")} />
  return (
    <ChartContainer config={revenueConfig(t)} className="h-[260px] w-full">
      <AreaChart data={timeseries.buckets} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v) => currency(Number(v), locale)} tickLine={false} axisLine={false} width={56} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => tick(String(l))} />} />
        <Area type="monotone" dataKey="invoiced_amount" stroke="var(--color-invoiced_amount)" fill="var(--color-invoiced_amount)" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="collected_amount" stroke="var(--color-collected_amount)" fill="var(--color-collected_amount)" fillOpacity={0.2} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}

function QuotesTrend({ timeseries, loading }: { timeseries: TimeseriesResponse | null; loading: boolean }) {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  const tick = (d: string) => tickLabel(d, locale, t("tickFormat"))
  if (loading || !timeseries) return <ChartSkeleton />
  const hasData = timeseries.buckets.some((b) => b.quotes_sent > 0 || b.quotes_accepted > 0)
  if (!hasData) return <EmptyChart label={t("noEstimating")} />
  return (
    <ChartContainer config={estimatesConfig(t)} className="h-[240px] w-full">
      <BarChart data={timeseries.buckets} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => tick(String(l))} />} />
        <Bar dataKey="quotes_sent" fill="var(--color-quotes_sent)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="quotes_accepted" fill="var(--color-quotes_accepted)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

function BreakdownPanel({
  title,
  rows,
  loading,
  valueKind,
}: {
  title: string
  rows?: BreakdownRow[]
  loading: boolean
  valueKind: "count" | "currency"
}) {
  const t = useTranslations("reportsPage")
  const locale = useLocale()
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {loading || !rows ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(0, 8).map((r, i) => {
            const max = Math.max(1, ...rows.map((x) => (valueKind === "currency" ? x.amount : x.count)))
            const v = valueKind === "currency" ? r.amount : r.count
            return (
              <div key={r.key ?? r.label ?? i}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="truncate text-slate-700">{labelFor(t, "breakdownLabels", r.label)}</span>
                  <span className="shrink-0 font-medium tabular-nums text-slate-900">
                    {valueKind === "currency" ? currency(r.amount, locale) : count(r.count, locale)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
    }
