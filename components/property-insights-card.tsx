"use client"

import { useState, useCallback, Fragment } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import type { PropertyMetadata, PropertyInsightsResponse } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Home, Loader2, AlertCircle, Square, Bed, Bath, FileText } from "lucide-react"

function camelToTitle(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatDetailValue(val: unknown): string {
  if (val == null) return "—"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "number") {
    return Number.isInteger(val) ? val.toLocaleString() : val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(val)) {
      try {
        return new Date(val).toLocaleDateString(undefined, { dateStyle: "medium" })
      } catch {
        return val
      }
    }
    return val
  }
  return String(val)
}

/** Field-agnostic: loop over any object, format values smartly, align in a grid */
function DetailSection({
  title,
  data,
  depth = 0,
}: {
  title: string
  data: Record<string, unknown>
  depth?: number
}) {
  const entries = Object.entries(data)
  const primitives = entries.filter(([, v]) => v == null || typeof v !== "object" || Array.isArray(v))
  const nested = entries.filter(([, v]) => v != null && typeof v === "object" && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length > 0) as [string, Record<string, unknown>][]
  if (primitives.length === 0 && nested.length === 0) return null
  return (
    <div className={depth > 0 ? "ml-3 pl-3 border-l border-border" : ""}>
      {depth > 0 && (
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1.5">
          {camelToTitle(title)}
        </h4>
      )}
      <dl className="grid gap-x-4 gap-y-1.5 text-sm" style={{ gridTemplateColumns: "minmax(120px, auto) 1fr" }}>
        {primitives.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-muted-foreground truncate">{camelToTitle(k)}</dt>
            <dd className="text-foreground break-words">
              {Array.isArray(v) ? v.map((item) => formatDetailValue(item)).join(", ") : formatDetailValue(v)}
            </dd>
          </Fragment>
        ))}
      </dl>
      {nested.map(([k, v]) => (
        <DetailSection key={k} title={k} data={v as Record<string, unknown>} depth={depth + 1} />
      ))}
    </div>
  )
}

const PROPERTY_INSIGHTS_CACHE_KEY = "contractor_property_insights"
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

function getCachedInsights(addressId: number): PropertyMetadata | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PROPERTY_INSIGHTS_CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<string, { data: PropertyMetadata; ts: number }>
    const entry = cache[String(addressId)]
    if (!entry || Date.now() - entry.ts > CACHE_EXPIRY_MS) return null
    return entry.data
  } catch {
    return null
  }
}

function setCachedInsights(addressId: number, data: PropertyMetadata): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(PROPERTY_INSIGHTS_CACHE_KEY)
    const cache: Record<string, { data: PropertyMetadata; ts: number }> = raw ? JSON.parse(raw) : {}
    cache[String(addressId)] = { data, ts: Date.now() }
    localStorage.setItem(PROPERTY_INSIGHTS_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

export interface PropertyInsightsCardProps {
  addressId: number
  initialMetadata?: PropertyMetadata | null
  onRefresh?: () => void
  className?: string
  /** Optional label for the section (e.g. "Property insights") */
  title?: string
}

export function PropertyInsightsCard({
  addressId,
  initialMetadata = null,
  onRefresh,
  className,
  title = "Property insights",
}: PropertyInsightsCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<PropertyMetadata | null>(() => {
    if (initialMetadata && Object.keys(initialMetadata).length > 0) return initialMetadata
    return getCachedInsights(addressId)
  })
  const [unavailable, setUnavailable] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsData, setDetailsData] = useState<Record<string, unknown> | null>(null)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setUnavailable(false)
    try {
      const res: PropertyInsightsResponse = await api.fetchPropertyInsights(addressId)
      const meta = res?.property_metadata ?? null
      setInsights(meta)
      if (meta) setCachedInsights(addressId, meta)
      if (!meta && res !== undefined) setUnavailable(true)
      onRefresh?.()
    } catch (e: unknown) {
      setInsights(null)
      setUnavailable(true)
      toast({
        title: "Property insights",
        description: "Property insights are temporarily unavailable.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [addressId, onRefresh, toast])

  const hasData = insights && Object.keys(insights).length > 0

  const openDetails = useCallback(async () => {
    setDetailsOpen(true)
    setDetailsData(null)
    setDetailsLoading(true)
    try {
      const res = await api.fetchPropertyInsightsDetails(addressId)
      setDetailsData(res?.property_metadata ?? null)
    } catch {
      setDetailsData(null)
      toast({
        title: "Property details",
        description: "Could not load detailed profile.",
        variant: "destructive",
      })
    } finally {
      setDetailsLoading(false)
    }
  }, [addressId, toast])

  return (
    <>
    <Card
      className={`overflow-hidden border border-border shadow-xs border-l-2 border-l-emerald-400/70 dark:border-l-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/15 rounded-md animate-in fade-in duration-200 ${className ?? ""}`}
    >
      <div className="px-3 py-1">
        <div className="flex items-center gap-6 flex-wrap">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shrink-0" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 dark:bg-emerald-500/20" aria-hidden>
              <Home className="h-3.5 w-3.5 text-emerald-600/80 dark:text-emerald-400/80" />
            </span>
            {title}:
          </h3>
          {loading && !hasData && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              Loading…
            </span>
          )}
          {unavailable && !hasData && !loading && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Data unavailable
            </span>
          )}
          {hasData && (() => {
            const raw = insights as Record<string, unknown>
            const sqft = raw.house_sqft ?? raw.building_sqft ?? raw.squareFootage
            const beds = raw.bedrooms
            const baths = raw.bathrooms
            const hasSqft = sqft != null && (typeof sqft === "number" || (typeof sqft === "string" && /^\d+$/.test(sqft)))
            const sqftNum = hasSqft ? Number(sqft) : null
            return (
              <>
                {sqftNum != null && (
                  <span className="flex items-center gap-1.5 text-sm text-foreground shrink-0">
                    <span className="text-muted-foreground">Area:</span>
                    <span className="tabular-nums">{sqftNum.toLocaleString()}</span>
                  </span>
                )}
                {beds != null && (
                  <span className="flex items-center gap-1.5 text-sm text-foreground shrink-0">
                    <Bed className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="tabular-nums">{Number(beds)} bed</span>
                  </span>
                )}
                {baths != null && (
                  <span className="flex items-center gap-1.5 text-sm text-foreground shrink-0">
                    <Bath className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="tabular-nums">{Number(baths)} bath</span>
                  </span>
                )}
              </>
            )
          })()}
          <span className="flex-1 min-w-0" aria-hidden />
          {!hasData && !unavailable && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-sm border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded shrink-0"
              onClick={fetchInsights}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get insights"}
            </Button>
          )}
          {hasData && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-sm text-muted-foreground hover:text-foreground shrink-0"
              onClick={openDetails}
            >
              <FileText className="h-4 w-4 mr-1" />
              View detailed
            </Button>
          )}
        </div>
      </div>
    </Card>

    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-lg">Detailed property profile</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-6 pb-6 overflow-auto">
          {detailsLoading && (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading details…</span>
            </div>
          )}
          {!detailsLoading && detailsData && Object.keys(detailsData).length > 0 && (
            <DetailSection title="" data={detailsData} />
          )}
          {!detailsLoading && detailsData && Object.keys(detailsData).length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">No detailed data available.</p>
          )}
          {!detailsLoading && detailsData === null && !detailsLoading && (
            <p className="py-6 text-sm text-muted-foreground">Could not load property details.</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </>
  )
}
