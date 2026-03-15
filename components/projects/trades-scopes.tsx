"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import type { Project, ProjectTrade } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Edit3, ExternalLink, Image as ImageIcon, Plus, Share, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { NewTradeDialog } from "./new-trade-dialog"
import { EditTradeDialog } from "./edit-trade-dialog"
import { TradeSendEmailDialog, TradeSendSmsDialog } from "./trade-share-dialog"

interface TradesScopesProps {
  project: Project
  onTradesUpdated: (trades: ProjectTrade[]) => void
}

export function TradesScopes({ project, onTradesUpdated }: TradesScopesProps) {
  const t = useTranslations("projects.trades")
  const locale = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTrade, setEditTrade] = useState<ProjectTrade | null>(null)
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null)
  const [tradeToDelete, setTradeToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendEmailTrade, setSendEmailTrade] = useState<ProjectTrade | null>(null)
  const [sendSmsTrade, setSendSmsTrade] = useState<ProjectTrade | null>(null)

  const trades = project.trades || []
  const spId = user?.contractor_ai_sp_id ?? null

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
    onTradesUpdated(trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t)))
  }

  const handleCopyLink = async (uuid: string) => {
    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${frontendUrl}/en/projects/trade/${uuid}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      toast({
        title: "Link Copied!",
        description: "Trade portal link has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTradeClick = (tradeId: number) => {
    setTradeToDelete(tradeId)
  }

  const handleConfirmDelete = async () => {
    if (!tradeToDelete) return
    setIsDeleting(true)
    try {
      await api.deleteProjectTrade(project.id, tradeToDelete)
      onTradesUpdated(trades.filter((t) => t.id !== tradeToDelete))
      toast({
        title: "Trade Deleted",
        description: "The trade scope has been successfully removed.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to delete trade",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setTradeToDelete(null)
    }
  }

  return (
    <TooltipProvider>
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="px-4 text-slate-600 font-medium">Trade</TableHead>
                      <TableHead className="px-4 text-slate-600 font-medium">Subcontractor</TableHead>
                      <TableHead className="px-4 text-slate-600 font-medium">Scope Details</TableHead>
                      <TableHead className="px-4 text-slate-600 font-medium whitespace-nowrap">Agreed Price</TableHead>
                      <TableHead className="px-4 text-slate-600 font-medium">Status</TableHead>
                      <TableHead className="w-[140px] px-4 text-slate-600 font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade, idx) => {
                      const photosCount = (trade.reference_media?.length || 0) + (trade.proof_of_work_media?.length || 0)
                      const showActions = hoveredRowId === trade.id

                      return (
                        <TableRow
                          key={trade.id}
                          className={cn(
                            "border-slate-100 transition-colors cursor-pointer",
                            idx % 2 === 1 ? "bg-slate-50/50" : "bg-white",
                            "hover:bg-slate-100/70"
                          )}
                          onClick={() => setEditTrade(trade)}
                          onMouseEnter={() => setHoveredRowId(trade.id)}
                          onMouseLeave={() => setHoveredRowId(null)}
                        >
                          <TableCell className="px-4 py-3 align-top min-w-[140px]">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                              <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white shrink-0">
                                &#x1F3D7;
                              </span>
                              <span className="truncate">{trade.trade_type}</span>
                            </div>
                            {photosCount > 0 && (
                              <div className="text-xs text-blue-600 flex items-center gap-1 mt-1.5">
                                <ImageIcon className="w-3 h-3" /> {photosCount} Attachments
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top min-w-[160px]">
                            <p className="font-semibold text-slate-900 text-sm">{trade.subcontractor_name || "—"}</p>
                            {trade.contact_info && (
                              <p className="text-xs text-slate-500 mt-0.5">{trade.contact_info}</p>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top max-w-[280px]">
                            <div className="space-y-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-slate-600 line-clamp-2 text-left cursor-default">
                                    {trade.scope_of_work || "—"}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">
                                  {trade.scope_of_work}
                                </TooltipContent>
                              </Tooltip>

                              {trade.materials_required && trade.materials_required.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1 line-clamp-1">
                                  <span className="text-slate-500 font-medium">Materials: </span>
                                  {trade.materials_required.join(", ")}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top whitespace-nowrap">
                            {trade.agreed_price != null ? (
                              <span className="font-semibold text-slate-900">
                                $ {Number(trade.agreed_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top">
                            <BadgeStatus status={trade.status} />
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className={cn(
                              "flex items-center justify-end gap-1 transition-opacity",
                              showActions ? "opacity-100" : "opacity-40"
                            )}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => setEditTrade(trade)}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Scope</TooltipContent>
                              </Tooltip>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={(e) => e.stopPropagation()}>
                                    <Share className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSendEmailTrade(trade); }} className="cursor-pointer">
                                    Send via Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSendSmsTrade(trade); }} className="cursor-pointer">
                                    Send via SMS
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(trade.uuid) }} className="cursor-pointer">
                                    Copy link
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteTradeClick(trade.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-red-50 text-red-600 border-red-200">Delete Scope</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden space-y-3">
              {trades.map((trade) => {
                const photosCount = (trade.reference_media?.length || 0) + (trade.proof_of_work_media?.length || 0)

                return (
                  <div
                    key={trade.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all cursor-pointer active:bg-slate-50"
                    onClick={() => setEditTrade(trade)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[12px] text-white shrink-0">
                          &#x1F3D7;
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-900 leading-tight">{trade.trade_type}</h3>
                          <p className="text-sm text-slate-600">{trade.subcontractor_name || "—"}</p>
                        </div>
                      </div>
                      <BadgeStatus status={trade.status} />
                    </div>

                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-slate-500">
                        {photosCount > 0 ? (
                          <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <ImageIcon className="w-3.5 h-3.5" /> {photosCount} Attachments
                          </span>
                        ) : (
                          <span className="text-slate-400">No attachments</span>
                        )}
                      </span>
                      {trade.agreed_price != null ? (
                        <span className="font-semibold text-slate-900">
                          $ {Number(trade.agreed_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No price set</span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button size="sm" variant="outline" className="text-slate-500 hover:text-blue-600 h-8 flex-1" onClick={(e) => { e.stopPropagation(); setEditTrade(trade) }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="text-slate-500 hover:text-blue-600 h-8 flex-1" onClick={(e) => e.stopPropagation()}>
                            <Share className="mr-2 h-4 w-4" /> Share
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSendEmailTrade(trade); }} className="cursor-pointer">
                            Send via Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSendSmsTrade(trade); }} className="cursor-pointer">
                            Send via SMS
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(trade.uuid) }} className="cursor-pointer">
                            Copy link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="sm" variant="outline" className="text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 h-8 px-3" onClick={(e) => { e.stopPropagation(); handleDeleteTradeClick(trade.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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

        <AlertDialog open={!!tradeToDelete} onOpenChange={(o) => { if (!o) setTradeToDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the trade scope and any associated media.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete Trade"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TradeSendEmailDialog
          open={!!sendEmailTrade}
          onOpenChange={(o) => !o && setSendEmailTrade(null)}
          trade={sendEmailTrade}
          projectTitle={project.title}
          locale={locale}
        />

        <TradeSendSmsDialog
          open={!!sendSmsTrade}
          onOpenChange={(o) => !o && setSendSmsTrade(null)}
          trade={sendSmsTrade}
          projectTitle={project.title}
          spId={spId}
          locale={locale}
        />
      </div>
    </TooltipProvider>
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
      <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${status === 'ACCEPTED' ? 'bg-green-500' : 'bg-orange-500'}`} />
      {status === 'PENDING_ACCEPTANCE' ? 'PENDING ACCEPTANCE' : status}
    </Badge>
  )
}
