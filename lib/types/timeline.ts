/**
 * Portfolio timeline (Gantt) types — mirror of the backend `/timeline`
 * TimelineResponse schema. All dates are ISO strings (date or datetime).
 */

export type TimelineLane = "project" | "tasks" | "billing" | "quote" | "appointments"
export type TimelineKind = "bar" | "milestone" | "event"
export type TimelineColor = "emerald" | "sky" | "amber" | "rose" | "slate"
export type TimelineLinkKind = "project" | "quote" | "invoice" | "booking"

export interface TimelineItem {
  id: string
  entity: "project" | "task" | "quote" | "payment" | "invoice" | "appointment"
  lane: TimelineLane
  kind: TimelineKind
  label: string
  start?: string | null
  end?: string | null
  date?: string | null
  status?: string | null
  color: TimelineColor
  link_kind?: TimelineLinkKind | null
  link_id?: number | null
  detail?: string | null
}

export interface TimelineGroup {
  id: string
  kind: "project" | "quotes" | "appointments"
  project_id?: number | null
  name: string
  status?: string | null
  start?: string | null
  end?: string | null
  items: TimelineItem[]
}

export interface TimelineResponse {
  range_from: string
  range_to: string
  groups: TimelineGroup[]
  /** Things that couldn't be placed (e.g. undated draws), keyed reason → count. */
  omitted: Record<string, number>
}

export interface TimelineParams {
  from?: string
  to?: string
  projectId?: number
}
