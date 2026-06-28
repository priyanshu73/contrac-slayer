"use client"

/**
 * Portfolio timeline (Gantt). Read-only swimlanes across projects, tasks,
 * quote events, billing milestones, and appointments. Pure Tailwind + date-fns
 * — no charting dependency. Bars span start→end; milestones/events are single
 * points. Everything is absolutely positioned over a day-indexed grid.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  isValid,
  parseISO,
} from "date-fns"
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderKanban,
  ListTodo,
  Loader2,
  Search,
} from "lucide-react"
import { api } from "@/lib/api"
import type {
  TimelineColor,
  TimelineGroup,
  TimelineItem,
  TimelineLane,
  TimelineResponse,
} from "@/lib/types/timeline"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Visual constants ─────────────────────────────────────────────────────────

const LEFT_WIDTH = 240 // px, sticky label column
const TRACK_H = 26 // px, height of a single packed track within a lane
const ROW_PAD = 8 // px, vertical padding added to a lane's packed height
const HEADER_ROW_H = 40 // px, group header row

type ZoomKey = "weeks" | "months" | "quarter"
const ZOOM: Record<ZoomKey, { label: string; pxPerDay: number }> = {
  weeks: { label: "Weeks", pxPerDay: 26 },
  months: { label: "Months", pxPerDay: 8.5 },
  quarter: { label: "Quarter", pxPerDay: 3.4 },
}

const LANE_META: Record<
  TimelineLane,
  { label: string; icon: typeof ListTodo; order: number }
> = {
  project: { label: "Project", icon: FolderKanban, order: 0 },
  tasks: { label: "Tasks", icon: ListTodo, order: 1 },
  appointments: { label: "Appointments", icon: Calendar, order: 2 },
  quote: { label: "Quote", icon: FileText, order: 3 },
  billing: { label: "Billing", icon: CircleDollarSign, order: 4 },
}

const SUB_LANES: TimelineLane[] = ["tasks", "appointments", "quote", "billing"]

const COLOR_BAR: Record<TimelineColor, string> = {
  emerald: "bg-emerald-500/90 border-emerald-600 text-white",
  sky: "bg-sky-500/90 border-sky-600 text-white",
  amber: "bg-amber-400/90 border-amber-500 text-amber-950",
  rose: "bg-rose-500/90 border-rose-600 text-white",
  slate: "bg-slate-400/90 border-slate-500 text-white",
}
const COLOR_DOT: Record<TimelineColor, string> = {
  emerald: "bg-emerald-500 border-emerald-700",
  sky: "bg-sky-500 border-sky-700",
  amber: "bg-amber-400 border-amber-600",
  rose: "bg-rose-500 border-rose-700",
  slate: "bg-slate-400 border-slate-600",
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function parse(d?: string | null): Date | null {
  if (!d) return null
  const parsed = parseISO(d)
  return isValid(parsed) ? parsed : null
}

function shiftWindow(from: string, to: string, months: number): { from: string; to: string } {
  const f = parse(from)!
  const t = parse(to)!
  const mk = (base: Date) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() + months)
    return format(d, "yyyy-MM-dd")
  }
  return { from: mk(f), to: mk(t) }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PortfolioTimeline({ projectId }: { projectId?: number }) {
  const locale = useLocale()
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [zoom, setZoom] = useState<ZoomKey>("months")
  const [search, setSearch] = useState("")
  const [enabledLanes, setEnabledLanes] = useState<Set<TimelineLane>>(
    new Set(SUB_LANES),
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Controlled window; null until first load fills it from the response.
  const [viewWindow, setViewWindow] = useState<{ from: string; to: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.getTimeline({
          projectId,
          from: viewWindow?.from,
          to: viewWindow?.to,
        })
        if (cancelled) return
        setData(res)
        if (!viewWindow) setViewWindow({ from: res.range_from, to: res.range_to })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load timeline")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, viewWindow?.from, viewWindow?.to])

  const pxPerDay = ZOOM[zoom].pxPerDay

  const axis = useMemo(() => {
    const start = parse(data?.range_from ?? null)
    const end = parse(data?.range_to ?? null)
    if (!start || !end) {
      return { start: null as Date | null, totalDays: 0, width: 0, ticks: [], today: null as number | null }
    }
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
    const width = totalDays * pxPerDay
    const interval = { start, end }
    const points = zoom === "weeks" ? eachWeekOfInterval(interval) : eachMonthOfInterval(interval)
    const ticks = points.map((d) => {
      const offset = differenceInCalendarDays(d, start)
      return {
        x: offset * pxPerDay,
        label: zoom === "weeks" ? format(d, "MMM d") : format(d, "MMM yyyy"),
        key: d.toISOString(),
      }
    })
    const todayOffset = differenceInCalendarDays(new Date(), start)
    const today = todayOffset >= 0 && todayOffset <= totalDays ? todayOffset * pxPerDay : null
    return { start, totalDays, width, ticks, today }
  }, [data?.range_from, data?.range_to, pxPerDay, zoom])

  const groups = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.groups.filter((g) => !q || g.name.toLowerCase().includes(q))
  }, [data, search])

  function toggleLane(lane: TimelineLane) {
    setEnabledLanes((prev) => {
      const next = new Set(prev)
      next.has(lane) ? next.delete(lane) : next.add(lane)
      return next
    })
  }

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function navigate(item: TimelineItem) {
    if (!item.link_kind || !item.link_id) return
    const base = `/${locale}`
    const routes: Record<string, string> = {
      project: `${base}/projects/${item.link_id}`,
      quote: `${base}/quotes/${item.link_id}`,
      invoice: `${base}/invoices/${item.link_id}`,
      booking: `${base}/calendar/${item.link_id}`,
    }
    const url = routes[item.link_kind]
    if (url) window.location.href = url
  }

  // ── Layout: pack a lane's items into non-overlapping vertical tracks ────────
  // Overlapping items (a bar's span, or a point marker plus its label width)
  // get pushed onto separate tracks so labels never collide. The lane row then
  // grows to fit however many tracks it needs.

  function itemExtent(item: TimelineItem): { left: number; right: number } | null {
    if (!axis.start) return null
    if (item.kind === "bar") {
      const s = parse(item.start)
      const e = parse(item.end) ?? s
      if (!s) return null
      const left = differenceInCalendarDays(s, axis.start) * pxPerDay
      const days = Math.max(0, differenceInCalendarDays(e!, s)) + 1
      return { left, right: left + Math.max(days * pxPerDay, 8) }
    }
    const d = parse(item.date)
    if (!d) return null
    const left = differenceInCalendarDays(d, axis.start) * pxPerDay
    // marker (~14px) + gap + estimated label width (~6px per char at text-[11px]).
    const labelW = 20 + item.label.length * 6
    return { left, right: left + labelW }
  }

  function layoutLane(items: TimelineItem[]): {
    placed: { item: TimelineItem; top: number }[]
    trackCount: number
  } {
    const withExtent = items
      .map((item) => ({ item, ext: itemExtent(item) }))
      .filter((x): x is { item: TimelineItem; ext: { left: number; right: number } } => x.ext !== null)
      .sort((a, b) => a.ext.left - b.ext.left)

    const trackRight: number[] = [] // right edge currently occupied per track
    const placed: { item: TimelineItem; top: number }[] = []
    const GAP = 8
    for (const { item, ext } of withExtent) {
      let track = trackRight.findIndex((r) => ext.left >= r + GAP)
      if (track === -1) {
        track = trackRight.length
        trackRight.push(ext.right)
      } else {
        trackRight[track] = ext.right
      }
      placed.push({ item, top: track * TRACK_H })
    }
    return { placed, trackCount: Math.max(1, trackRight.length) }
  }

  // ── Item renderers (positioned by packed track `top`) ───────────────────────

  function renderBar(item: TimelineItem, top: number) {
    if (!axis.start) return null
    const s = parse(item.start)
    const e = parse(item.end) ?? s
    if (!s) return null
    const left = differenceInCalendarDays(s, axis.start) * pxPerDay
    const days = Math.max(0, differenceInCalendarDays(e!, s)) + 1
    const width = Math.max(days * pxPerDay, 8)
    const tip = [item.label, item.detail, item.status].filter(Boolean).join(" · ")
    return (
      <button
        key={item.id}
        type="button"
        title={tip}
        onClick={() => navigate(item)}
        className={`absolute h-5 rounded-md border px-2 text-[11px] leading-5 truncate text-left shadow-sm transition hover:brightness-95 ${COLOR_BAR[item.color]}`}
        style={{ left, width, top: top + (TRACK_H - 20) / 2 }}
      >
        {item.label}
      </button>
    )
  }

  function renderPoint(item: TimelineItem, top: number) {
    if (!axis.start) return null
    const d = parse(item.date)
    if (!d) return null
    const left = differenceInCalendarDays(d, axis.start) * pxPerDay
    const tip = [item.label, item.detail, item.status].filter(Boolean).join(" · ")
    const isMilestone = item.kind === "milestone"
    return (
      <button
        key={item.id}
        type="button"
        title={tip}
        onClick={() => navigate(item)}
        className="absolute flex items-center gap-1 group/marker -translate-y-1/2"
        style={{ left, top: top + TRACK_H / 2 }}
      >
        <span
          className={`block shrink-0 border ${COLOR_DOT[item.color]} ${
            isMilestone ? "h-3 w-3 rotate-45 rounded-[2px]" : "h-2.5 w-2.5 rounded-full"
          }`}
        />
        <span className="whitespace-nowrap rounded bg-white/70 px-0.5 text-[11px] text-slate-600 group-hover/marker:text-slate-900">
          {item.label}
        </span>
      </button>
    )
  }

  function renderItem(item: TimelineItem, top: number) {
    return item.kind === "bar" ? renderBar(item, top) : renderPoint(item, top)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SUB_LANES.map((lane) => {
            const Icon = LANE_META[lane].icon
            const on = enabledLanes.has(lane)
            return (
              <button
                key={lane}
                type="button"
                onClick={() => toggleLane(lane)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? "border-slate-300 bg-white text-slate-700 shadow-sm"
                    : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {LANE_META[lane].label}
              </button>
            )
          })}
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {viewWindow && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewWindow((w) => (w ? shiftWindow(w.from, w.to, -2) : w))}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewWindow((w) => (w ? shiftWindow(w.from, w.to, 2) : w))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Select value={zoom} onValueChange={(v) => setZoom(v as ZoomKey)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ZOOM) as ZoomKey[]).map((z) => (
                <SelectItem key={z} value={z}>
                  {ZOOM[z].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data?.omitted && Object.keys(data.omitted).length > 0 && (
        <p className="text-xs text-slate-500">
          Not shown (no fixed date):{" "}
          {Object.entries(data.omitted)
            .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
            .join(", ")}
        </p>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading timeline…
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-rose-600">{error}</div>
        ) : groups.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500">
            Nothing scheduled in this window. Try a different range or add dates to your projects.
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ width: LEFT_WIDTH + axis.width }} className="relative">
              {/* Axis header */}
              <div
                className="sticky top-0 z-20 flex border-b border-slate-200 bg-white"
                style={{ height: 32 }}
              >
                <div
                  className="sticky left-0 z-30 flex items-center border-r border-slate-200 bg-white px-3 text-xs font-medium text-slate-500"
                  style={{ width: LEFT_WIDTH }}
                >
                  Project / Lane
                </div>
                <div className="relative" style={{ width: axis.width }}>
                  {axis.ticks.map((t) => (
                    <div
                      key={t.key}
                      className="absolute top-0 h-8 border-l border-slate-100 pl-1 text-[11px] text-slate-400"
                      style={{ left: t.x }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="relative">
                {/* Month/week gridlines + today line spanning all rows */}
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{ left: LEFT_WIDTH }}
                >
                  {axis.ticks.map((t) => (
                    <div
                      key={t.key}
                      className="absolute top-0 bottom-0 border-l border-slate-100"
                      style={{ left: t.x }}
                    />
                  ))}
                  {axis.today != null && (
                    <div
                      className="absolute top-0 bottom-0 z-10 w-px bg-rose-400"
                      style={{ left: axis.today }}
                    >
                      <span className="absolute -top-0 -translate-x-1/2 rounded-b bg-rose-400 px-1 text-[9px] font-medium text-white">
                        Today
                      </span>
                    </div>
                  )}
                </div>

                {groups.map((group) => (
                  <GroupRows
                    key={group.id}
                    group={group}
                    collapsed={collapsed.has(group.id)}
                    enabledLanes={enabledLanes}
                    onToggle={() => toggleGroup(group.id)}
                    renderItem={renderItem}
                    layoutLane={layoutLane}
                    chartWidth={axis.width}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Group (header + lane rows) ───────────────────────────────────────────────

function GroupRows({
  group,
  collapsed,
  enabledLanes,
  onToggle,
  renderItem,
  layoutLane,
  chartWidth,
}: {
  group: TimelineGroup
  collapsed: boolean
  enabledLanes: Set<TimelineLane>
  onToggle: () => void
  renderItem: (item: TimelineItem, top: number) => React.ReactNode
  layoutLane: (items: TimelineItem[]) => {
    placed: { item: TimelineItem; top: number }[]
    trackCount: number
  }
  chartWidth: number
}) {
  const projectItems = group.items.filter((i) => i.lane === "project")
  const projectLayout = layoutLane(projectItems)
  const headerHeight = Math.max(HEADER_ROW_H, projectLayout.trackCount * TRACK_H + ROW_PAD)
  const lanes = SUB_LANES.filter(
    (lane) => enabledLanes.has(lane) && group.items.some((i) => i.lane === lane),
  )

  return (
    <div className="border-b border-slate-200">
      {/* Header row */}
      <div className="flex" style={{ height: headerHeight }}>
        <button
          type="button"
          onClick={onToggle}
          className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-slate-200 bg-white px-2 text-left"
          style={{ width: LEFT_WIDTH }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="truncate text-sm font-semibold text-slate-800">{group.name}</span>
          {group.status && (
            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
              {group.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
          )}
        </button>
        <div className="relative" style={{ width: chartWidth }}>
          {projectLayout.placed.map(({ item, top }) => renderItem(item, top + ROW_PAD / 2))}
        </div>
      </div>

      {/* Lane rows */}
      {!collapsed &&
        lanes.map((lane) => {
          const Icon = LANE_META[lane].icon
          const items = group.items.filter((i) => i.lane === lane)
          const { placed, trackCount } = layoutLane(items)
          const rowHeight = trackCount * TRACK_H + ROW_PAD
          return (
            <div key={lane} className="flex" style={{ height: rowHeight }}>
              <div
                className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-slate-200 bg-slate-50/60 pl-8 pr-2 text-xs text-slate-500"
                style={{ width: LEFT_WIDTH }}
              >
                <Icon className="h-3.5 w-3.5" />
                {LANE_META[lane].label}
                <span className="ml-auto text-[10px] text-slate-400">{items.length}</span>
              </div>
              <div className="relative" style={{ width: chartWidth }}>
                {placed.map(({ item, top }) => renderItem(item, top + ROW_PAD / 2))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
