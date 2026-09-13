"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Search, SlidersHorizontal, X } from "lucide-react"

import { api, contractorAI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useDebounce } from "@/hooks/useDebounce"

type Kind = "quote" | "invoice" | "project" | "task" | "client" | "crew" | "lead"

interface Hit {
  kind: Kind
  id: number | string
  label: string
  detail?: string
  date?: string | null // ISO, used by the date filter and shown right-aligned
  path: string
}

const KIND_META: Record<Kind, { label: string; badge: string; dot: string }> = {
  quote: { label: "Quote", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  invoice: { label: "Invoice", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  project: { label: "Project", badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  task: { label: "Task", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  client: { label: "Client", badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  crew: { label: "Crew", badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  lead: { label: "Lead", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
}

const ALL_KINDS: Kind[] = ["quote", "invoice", "project", "task", "client", "crew", "lead"]

const DATE_FILTERS = [
  { key: "any", label: "Any time", days: null },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
] as const
type DateKey = (typeof DATE_FILTERS)[number]["key"]

function fmtDate(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Local search index. Everything except quotes is fetched once per mount-open
 * and filtered client-side (the backend has no cross-entity search endpoint);
 * quotes use the server's ?search. Leads come from the contractor-ai service
 * and degrade silently when it's unreachable.
 */
function useSearchIndex(open: boolean, spId: number | null) {
  const indexRef = useRef<Promise<Hit[]> | null>(null)

  const load = useCallback((): Promise<Hit[]> => {
    if (indexRef.current) return indexRef.current
    indexRef.current = Promise.allSettled([
      api.getClients(0, 200),
      api.getProjects({ limit: 200 }),
      api.getInvoices(undefined, 0, 100),
      api.getAllProjectTasks({ limit: 200 }),
      api.getSubcontractors(0, 200),
      // Leads live in the remote contractor-ai service and need the sp_id
      // mapping; skip when unmapped, and don't let a slow service stall the
      // whole index — 4s and we move on without leads.
      spId == null
        ? Promise.resolve(null)
        : Promise.race([
            contractorAI.getLeads({ lightweight: true, per_page: 200, sp_id: spId.toString() }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("leads timeout")), 4000)),
          ]),
    ]).then(([clientsRes, projectsRes, invoicesRes, tasksRes, crewRes, leadsRes]) => {
      const val = (r: PromiseSettledResult<any>) => (r.status === "fulfilled" ? r.value : null)
      const arr = (v: any, ...keys: string[]) => {
        if (Array.isArray(v)) return v
        for (const k of keys) if (Array.isArray(v?.[k])) return v[k]
        return []
      }
      const hits: Hit[] = []
      for (const c of arr(val(clientsRes), "items"))
        hits.push({
          kind: "client",
          id: c.id,
          label: c.name,
          detail: c.email || c.phone,
          date: c.created_at,
          path: `/clients/${c.id}`,
        })
      for (const p of arr(val(projectsRes), "items", "projects"))
        hits.push({
          kind: "project",
          id: p.id,
          label: p.title,
          detail: p.client_name || p.status?.replace?.(/_/g, " ").toLowerCase(),
          date: p.scheduled_start_date || p.created_at,
          path: `/projects/${p.id}`,
        })
      for (const i of arr(val(invoicesRes), "items"))
        hits.push({
          kind: "invoice",
          id: i.id,
          label: `${i.invoice_number}${i.title ? ` · ${i.title}` : ""}`,
          detail: i.client?.name || i.status?.toLowerCase?.(),
          date: i.issue_date || i.created_at,
          path: `/invoices/${i.id}`,
        })
      for (const t of arr(val(tasksRes), "tasks"))
        hits.push({
          kind: "task",
          id: t.id,
          label: t.title,
          detail: t.project_title || t.status?.replace?.(/_/g, " ").toLowerCase(),
          date: t.scheduled_end_date,
          path: `/projects/${t.project_id}`,
        })
      for (const s of arr(val(crewRes), "items"))
        hits.push({
          kind: "crew",
          id: s.id,
          label: s.name,
          detail: s.trade || s.email || s.phone,
          date: s.created_at,
          path: `/crew/${s.id}`,
        })
      for (const l of arr(val(leadsRes), "leads", "items"))
        hits.push({
          kind: "lead",
          id: l.id,
          label: l.name || l.phone_number || "Lead",
          detail: l.service_type || l.status?.toLowerCase?.(),
          date: l.created_at,
          path: `/leads`,
        })
      return hits
    })
    return indexRef.current
  }, [spId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  return load
}

export function GlobalSearch({ className }: { className?: string } = {}) {
  const router = useRouter()
  const locale = useLocale()
  const { getContractorAISpId } = useAuth()
  const spId = getContractorAISpId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [searching, setSearching] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [kindFilter, setKindFilter] = useState<Kind | null>(null)
  const [dateFilter, setDateFilter] = useState<DateKey>("any")

  const debounced = useDebounce(query, 250)
  const loadIndex = useSearchIndex(open, spId)

  // ⌘K focuses the inline input; Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Click outside closes the panel.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  useEffect(() => {
    if (!open || !debounced.trim()) {
      setHits([])
      return
    }
    let cancelled = false
    setSearching(true)
    const q = debounced.trim().toLowerCase()

    const localPromise = loadIndex().then((index) =>
      index.filter((h) => h.label?.toLowerCase().includes(q) || h.detail?.toLowerCase().includes(q))
    )
    const quotesPromise = api
      .getMyJobs(undefined, 0, 10, undefined, debounced.trim())
      .then((res: any) => {
        const jobs = (Array.isArray(res) ? res : res?.items || res?.jobs) || []
        return jobs.map(
          (j: any): Hit => ({
            kind: "quote",
            id: j.id,
            label: j.title || `Quote #${j.id}`,
            detail: j.client?.name || j.status?.toLowerCase?.(),
            date: j.created_at,
            path: `/quotes/${j.id}`,
          })
        )
      })
      .catch(() => [] as Hit[])

    // Progressive: server quote hits render as soon as they land; the local
    // index (which may still be warming on first open) merges in after.
    let quotesShown: Hit[] | null = null
    quotesPromise.then((quotes) => {
      if (cancelled) return
      quotesShown = quotes
      setHits(quotes)
      setActiveIdx(0)
    })
    Promise.all([quotesPromise, localPromise])
      .then(([quotes, local]) => {
        if (cancelled) return
        setHits([...quotes, ...local])
        if (!quotesShown?.length) setActiveIdx(0)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, debounced, loadIndex])

  const visible = useMemo(() => {
    let out = hits
    if (kindFilter) out = out.filter((h) => h.kind === kindFilter)
    const days = DATE_FILTERS.find((d) => d.key === dateFilter)?.days
    if (days) {
      const cutoff = Date.now() - days * 24 * 3600 * 1000
      out = out.filter((h) => {
        if (!h.date) return false
        const t = new Date(h.date).getTime()
        return !Number.isNaN(t) && t >= cutoff
      })
    }
    return out.slice(0, 20)
  }, [hits, kindFilter, dateFilter])

  const go = (hit: Hit) => {
    setOpen(false)
    setQuery("")
    router.push(`/${locale}${hit.path}`)
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, visible.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && visible[activeIdx]) {
      e.preventDefault()
      go(visible[activeIdx])
    }
  }

  const filtersActive = kindFilter !== null || dateFilter !== "any"

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-colors focus-within:border-slate-400",
          className?.includes("w-full") ? "w-full" : "w-72 lg:w-96"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search quotes, invoices, projects…"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="text-slate-300 hover:text-slate-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          aria-label="Search filters"
          onClick={() => {
            setShowFilters((v) => !v)
            setOpen(true)
          }}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors",
            filtersActive || showFilters
              ? "bg-slate-900 text-white"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (query.trim() || showFilters) && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg lg:w-[28rem]">
          {showFilters && (
            <div className="space-y-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setKindFilter(null)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    kindFilter === null
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  )}
                >
                  All
                </button>
                {ALL_KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKindFilter((cur) => (cur === k ? null : k))}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      kindFilter === k
                        ? KIND_META[k].badge + " ring-1 ring-current"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", KIND_META[k].dot)} />
                    {KIND_META[k].label}s
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[11px] text-slate-400">Date</span>
                {DATE_FILTERS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDateFilter(d.key)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      dateFilter === d.key
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto p-1.5">
            {!query.trim() ? (
              <p className="px-3 py-6 text-center text-[13px] text-slate-400">Type to search.</p>
            ) : visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-slate-400">
                {searching ? "Searching…" : "No matches."}
              </p>
            ) : (
              visible.map((hit, idx) => (
                <button
                  key={`${hit.kind}:${hit.id}`}
                  onClick={() => go(hit)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    idx === activeIdx ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-semibold",
                      KIND_META[hit.kind].badge
                    )}
                  >
                    {KIND_META[hit.kind].label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-slate-900">
                      {hit.label}
                    </span>
                    {hit.detail ? (
                      <span className="block truncate text-[12px] text-slate-500">{hit.detail}</span>
                    ) : null}
                  </span>
                  {hit.date ? (
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                      {fmtDate(hit.date)}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
