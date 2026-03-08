"use client"

import { useState } from "react"
import type { Project, ProjectTrade } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Edit3, ExternalLink, Image as ImageIcon, Plus } from "lucide-react"

import { NewTradeDialog } from "./new-trade-dialog"
import { EditTradeDialog } from "./edit-trade-dialog"

interface TradesScopesProps {
  project: Project
  onTradesUpdated: (trades: ProjectTrade[]) => void
}

export function TradesScopes({ project, onTradesUpdated }: TradesScopesProps) {
  const t = useTranslations("projects.trades")
  const { toast } = useToast()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTrade, setEditTrade] = useState<ProjectTrade | null>(null)

  const trades = project.trades || []

  const handleAccept = async (trade: ProjectTrade) => {
    try {
      const updated = await api.updateProjectTrade(project.id, trade.id, {
        status: "ACCEPTED",
      }) as ProjectTrade
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

  const handleTradeCreated = (newTrade: ProjectTrade) => {
    onTradesUpdated([...trades, newTrade])
    setAddDialogOpen(false)
  }

  const handleTradeUpdated = (updatedTrade: ProjectTrade) => {
    onTradesUpdated(trades.map(t => t.id === updatedTrade.id ? updatedTrade : t))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Active Trades & Scopes</h2>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-[#0077CC] hover:bg-[#005FA3] text-white">
          <Plus className="mr-2 h-4 w-4" /> Add New Trade / Scope
        </Button>
      </div>

      {!trades.length ? (
        <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
          {t("empty")}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trades.map((trade) => {
            const photosCount = (trade.reference_media?.length || 0) + (trade.proof_of_work_media?.length || 0)

            return (
              <Card key={trade.id} className="border-slate-200 shadow-sm p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 pb-1">
                      <p className="text-sm font-semibold text-slate-900 border border-blue-500/20 bg-blue-50 inline-flex items-center p-1.5 px-3 rounded-lg mb-2 mr-2">
                        <span className="w-4 h-4 rounded-full bg-blue-500 mr-2 flex items-center justify-center text-[10px] text-white">
                          &#x1F3D7;
                        </span>
                        {trade.trade_type}
                      </p>
                      <BadgeStatus status={trade.status} />
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {trade.subcontractor_name}
                      </p>
                      {trade.contact_info && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {trade.contact_info}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <p className="font-medium text-slate-800 uppercase text-[10px] mb-1">Scope of Work</p>
                    <p className="whitespace-pre-line leading-relaxed pb-2">{trade.scope_of_work}</p>
                  </div>
                  {trade.materials_required?.length ? (
                    <div className="space-y-1 text-xs text-slate-600 pb-2">
                      <p className="font-medium text-slate-800 uppercase text-[10px] mb-1">Materials Required</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {trade.materials_required.map((m, idx) => (
                          <li key={idx} className="text-blue-600"><span className="text-slate-600">{m}</span></li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {trade.acceptance_criteria?.length ? (
                    <div className="space-y-1 text-xs text-slate-600 pb-2">
                      <p className="font-medium text-slate-800 uppercase text-[10px] mb-1">
                        Acceptance Criteria
                      </p>
                      <ul className="space-y-1 mt-2">
                        {trade.acceptance_criteria.map((c, idx) => (
                          <li key={idx} className="flex gap-2 items-start text-slate-700">
                            <span className="text-green-500 font-bold">✓</span> {c.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg mb-3">
                    <span className="text-xs font-semibold text-slate-500">AGREED PRICE</span>
                    {trade.agreed_price != null ? (
                      <span className="text-sm font-semibold text-slate-900">
                        $ {Number(trade.agreed_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Not set</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-blue-600 mb-4 px-1 pb-2">
                    {photosCount > 0 ? (
                      <span className="flex items-center gap-2 text-blue-500"><ImageIcon className="w-3 h-3" /> {photosCount} Attachments <span className="text-slate-400 font-normal ml-1">({trade.reference_media?.length || 0} GC ref • {trade.proof_of_work_media?.length || 0} sub proof)</span></span>
                    ) : (
                      <span className="flex items-center gap-2 text-slate-400"><ImageIcon className="w-3 h-3" /> No attachments yet</span>
                    )}
                    <button className="underline cursor-pointer" onClick={() => setEditTrade(trade)}>View Gallery</button>
                  </div>

                  <div className="flex gap-2 w-full mb-2">
                    <Button variant="outline" className="w-1/2 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={() => setEditTrade(trade)}>
                      <Edit3 className="w-4 h-4 mr-2" /> Edit Scope
                    </Button>
                    <Button variant="outline" className="w-1/2 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={() => window.open(`/en/projects/trade/${trade.uuid}`, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" /> Sub Portal View
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 bg-white mt-1" onClick={() => setEditTrade(trade)}>
                    <ImageIcon className="w-4 h-4 mr-2 text-blue-500" /> Scope Attachments Gallery
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <NewTradeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project.id}
        onTradeCreated={handleTradeCreated}
      />

      {editTrade && (
        <EditTradeDialog
          open={!!editTrade}
          onOpenChange={(v) => !v && setEditTrade(null)}
          projectId={project.id}
          trade={editTrade}
          onTradeUpdated={handleTradeUpdated}
        />
      )}
    </div>
  )
}

function BadgeStatus({ status }: { status: ProjectTrade["status"] }) {
  const t = useTranslations("projects.trades.status")
  let color =
    "bg-slate-50 text-slate-700 border-slate-200"
  if (status === "ACCEPTED") {
    color = "bg-green-100 text-green-700 border-green-200"
  } else if (status === "PENDING_ACCEPTANCE") {
    color = "bg-orange-100 text-orange-700 border-orange-200"
  } else if (status === "REJECTED") {
    color = "bg-rose-50 text-rose-700 border-rose-200"
  }

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${status === 'ACCEPTED' ? 'bg-green-500' : 'bg-orange-500'}`} />
      {status === 'PENDING_ACCEPTANCE' ? 'PENDING ACCEPTANCE' : status}
    </Badge>
  )
}
