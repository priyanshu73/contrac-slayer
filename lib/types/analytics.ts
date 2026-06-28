/**
 * Sales & Money reports (analytics) types — mirror of the backend `/analytics`
 * response schemas. All dates are ISO `YYYY-MM-DD` strings; money is a number.
 */

export type AnalyticsGranularity = "day" | "week" | "month"

/** A KPI with its prior-period comparison. `delta_pct` is null when undefined. */
export interface MetricDelta {
  value: number
  previous_value: number
  delta_pct: number | null
}

export interface OverviewResponse {
  range_from: string
  range_to: string
  quotes_sent: MetricDelta
  quotes_accepted: MetricDelta
  win_rate: MetricDelta
  avg_quote_value: MetricDelta
  avg_days_to_accept: MetricDelta
  projects_completed: MetricDelta
  invoices_sent_count: MetricDelta
  invoices_sent_amount: MetricDelta
  invoices_paid_count: MetricDelta
  invoices_paid_amount: MetricDelta
  revenue_collected: MetricDelta
  outstanding_ar: MetricDelta
  caveats: string[]
}

/** Semantic colour key, shared with the timeline. */
export type AnalyticsColor = "emerald" | "sky" | "amber" | "rose" | "slate"

export interface FunnelStage {
  stage: string
  count: number
  amount: number
  color: AnalyticsColor
}

export interface PipelineResponse {
  range_from: string
  range_to: string
  stages: FunnelStage[]
  note?: string | null
}

export interface TimeseriesBucket {
  date: string
  quotes_sent: number
  quotes_accepted: number
  invoiced_amount: number
  collected_amount: number
}

export interface TimeseriesResponse {
  range_from: string
  range_to: string
  granularity: AnalyticsGranularity
  buckets: TimeseriesBucket[]
}

export interface BreakdownRow {
  key?: string | null
  label: string
  count: number
  amount: number
  accepted_count?: number | null
  conversions?: number | null
}

export interface BreakdownsResponse {
  range_from: string
  range_to: string
  by_lead_source: BreakdownRow[]
  by_team_member: BreakdownRow[]
  by_quote_tier: BreakdownRow[]
}

export interface AnalyticsParams {
  from: string
  to: string
}

export interface AnalyticsTimeseriesParams extends AnalyticsParams {
  granularity?: AnalyticsGranularity
}
