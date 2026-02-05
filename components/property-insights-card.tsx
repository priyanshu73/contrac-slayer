"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { PropertyMetadata, PropertyInsightsResponse } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Home, Loader2, AlertCircle, Square, Bed, Bath } from "lucide-react"

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

  return (
    <Card
      className={`overflow-hidden border border-border shadow-sm border-l-4 border-l-emerald-500 bg-[#ECFDF5]/50 dark:bg-emerald-950/25 rounded-lg animate-in fade-in duration-200 ${className ?? ""}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 dark:bg-emerald-500/25" aria-hidden>
              <Home className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </span>
            {title}
          </h3>
          {!hasData && !unavailable && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-sm border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-transform hover:scale-105 rounded-md"
              onClick={fetchInsights}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get insights"}
            </Button>
          )}
        </div>

        {loading && !hasData && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-3 px-4 rounded-lg bg-[#F5F5F5] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 shrink-0" />
            <span>Loading property data…</span>
          </div>
        )}

        {unavailable && !hasData && !loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-3 px-4 rounded-lg bg-[#F5F5F5] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-500" />
            <span>Data unavailable for this address.</span>
          </div>
        )}

        {hasData && (
          <dl className="flex flex-wrap gap-3">
            {(insights.house_sqft ?? insights.building_sqft) != null && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Square className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <span className="tabular-nums">{(insights.house_sqft ?? insights.building_sqft)!.toLocaleString()} sq ft</span>
              </div>
            )}
            {insights.bedrooms != null && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Bed className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <span className="tabular-nums">{insights.bedrooms} bed</span>
              </div>
            )}
            {insights.bathrooms != null && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Bath className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <span className="tabular-nums">{insights.bathrooms} bath</span>
              </div>
            )}
          </dl>
        )}
      </div>
    </Card>
  )
}
