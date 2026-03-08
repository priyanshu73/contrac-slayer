"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { ProjectTrade } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function TradePortalPage() {
  const params = useParams()
  const t = useTranslations("projects.subPortal")
  const [trade, setTrade] = useState<ProjectTrade | null>(null)
  const [loading, setLoading] = useState(true)
  const tradeUuid = params.uuid as string

  useEffect(() => {
    if (!tradeUuid) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getTradeScopePublic(tradeUuid)
        if (!cancelled) setTrade(data as ProjectTrade)
      } catch (err) {
        console.error("Failed to load trade scope", err)
        if (!cancelled) setTrade(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [tradeUuid])

  const handleAccept = async () => {
    if (!tradeUuid) return
    try {
      const updated = await api.acceptTradeScopePublic(tradeUuid)
      setTrade(updated as ProjectTrade)
    } catch (err) {
      console.error("Failed to accept trade scope", err)
    }
  }

  if (loading || !trade) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {t("title", { trade: trade.trade_type })}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {t("subtitle")}
              </p>
            </div>
            <BadgeStatus status={trade.status} />
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold">{t("scopeOfWork")}</p>
            <p className="whitespace-pre-line">{trade.scope_of_work}</p>
          </div>
          {trade.materials_required?.length ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold">{t("materialsRequired")}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {trade.materials_required.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {trade.acceptance_criteria?.length ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold">{t("acceptanceCriteria")}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {trade.acceptance_criteria.map((c, idx) => (
                  <li key={idx}>{c.text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {trade.status === "PENDING_ACCEPTANCE" && (
            <div className="pt-2">
              <Button onClick={handleAccept} className="w-full sm:w-auto">
                {t("acceptScope")}
              </Button>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            {t("pricingNote")}
          </p>
        </Card>
      </div>
    </div>
  )
}

function BadgeStatus({ status }: { status: ProjectTrade["status"] }) {
  const t = useTranslations("projects.trades.status")
  const label = t(status.toLowerCase() as any)
  let color =
    "bg-slate-50 text-slate-700 border-slate-200"
  if (status === "ACCEPTED") {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200"
  } else if (status === "PENDING_ACCEPTANCE") {
    color = "bg-amber-50 text-amber-700 border-amber-200"
  } else if (status === "REJECTED") {
    color = "bg-rose-50 text-rose-700 border-rose-200"
  }

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${color}`}
    >
      {label}
    </Badge>
  )
}

