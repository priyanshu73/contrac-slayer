"use client"

import type { Project, ProjectTrade } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface TradesScopesProps {
  project: Project
  onTradesUpdated: (trades: ProjectTrade[]) => void
}

export function TradesScopes({ project, onTradesUpdated }: TradesScopesProps) {
  const t = useTranslations("projects.trades")
  const { toast } = useToast()

  const trades = project.trades || []

  const handleAccept = async (trade: ProjectTrade) => {
    try {
      const updated = await api.updateProjectTrade(project.id, trade.id, {
        status: "ACCEPTED",
      })
      const merged = trades.map((t) => (t.id === trade.id ? { ...t, ...updated } : t))
      onTradesUpdated(merged)
    } catch (err: any) {
      toast({
        title: t("updateErrorTitle"),
        description: err?.message || t("updateErrorDesc"),
        variant: "destructive",
      })
    }
  }

  if (!trades.length) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("empty")}
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trades.map((trade) => (
        <Card key={trade.id} className="border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {trade.trade_type}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {trade.subcontractor_name}
              </p>
              {trade.contact_info && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {trade.contact_info}
                </p>
              )}
            </div>
            <BadgeStatus status={trade.status} />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <p className="font-medium text-slate-800">{t("scopeTitle")}</p>
            <p className="whitespace-pre-line">{trade.scope_of_work}</p>
          </div>
          {trade.materials_required?.length ? (
            <div className="space-y-1 text-xs text-slate-600">
              <p className="font-medium text-slate-800">{t("materialsTitle")}</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {trade.materials_required.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {trade.acceptance_criteria?.length ? (
            <div className="space-y-1 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                {t("acceptanceTitle")}
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {trade.acceptance_criteria.map((c, idx) => (
                  <li key={idx}>{c.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex items-center justify-between pt-1">
            {trade.agreed_price != null && (
              <p className="text-sm font-semibold text-slate-900">
                {t("agreedPrice", { amount: trade.agreed_price })}
              </p>
            )}
            {trade.status === "PENDING_ACCEPTANCE" && (
              <Button size="sm" onClick={() => handleAccept(trade)}>
                {t("markAccepted")}
              </Button>
            )}
          </div>
        </Card>
      ))}
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

