"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar, Trash2, RotateCcw, Phone, MapPin, ExternalLink, Users, Eye } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { formatPhoneForDisplay } from "@/lib/utils"
import { formatAddressStreetForDisplay } from "@/lib/format-address"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { enUS, es } from "date-fns/locale"
import { cn } from "@/lib/utils"

type ClientsViewMode = "grid" | "list"

interface ClientsListProps {
  clients?: any[]
  loading?: boolean
  viewMode?: ClientsViewMode
  /** When user clicks "Schedule a call" on a client card, open create-appointment for that client. */
  onScheduleClick?: (client: { id: number; name?: string; email?: string }) => void
  /** Called after a client is archived from the list (so parent can refetch). */
  onClientArchived?: () => void
}

function getLastActionDate(client: any, locale: string): string | null {
  const updated = client.updated_at ? new Date(client.updated_at) : null
  const lastJob = client.last_job_date ? new Date(client.last_job_date) : null
  if (!updated && !lastJob) return null
  const latest = updated && lastJob
    ? (updated > lastJob ? updated : lastJob)
    : (updated ?? lastJob)
  return formatDistanceToNow(latest, { addSuffix: true, locale: locale === "es" ? es : enUS })
}

export function ClientsList({ clients = [], loading = false, viewMode = "list", onScheduleClick, onClientArchived }: ClientsListProps) {
  const router = useRouter()
  const locale = useLocale()
  const tClients = useTranslations("clients")
  const tCommon = useTranslations("common")
  const { toast } = useToast()
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "archived":
        return "bg-slate-100 text-slate-500 border-slate-200"
      default:
        return "bg-slate-100 text-slate-500 border-slate-200"
    }
  }

  if (loading) {
    return viewMode === "grid" ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
                <th className="h-12 px-4 text-left font-medium text-slate-600" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3"><div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-36 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-8 w-24 bg-slate-100 rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{tClients("noClientsYet")}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {tClients("noClientsDesc")}
            </p>
            <Button asChild>
              <a href={`/${locale}/clients/new`}>{tClients("addFirstClient")}</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    const s = String(status || "").toUpperCase()
    if (s === "ACTIVE") return tClients("statusActive")
    if (s === "INACTIVE") return tClients("statusInactive")
    if (s === "ARCHIVED") return tClients("statusArchived")
    return status
  }

  const handleRowClick = (clientId: number) => {
    router.push(`/${locale}/clients/${clientId}`)
  }

  return (
    <TooltipProvider>
      {/* List view: Table layout (desktop) */}
      {viewMode === "list" && (
        <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-10 px-4 text-slate-600 font-medium" />
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("name")}</TableHead>
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("email")}</TableHead>
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("phone")}</TableHead>
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("address")}</TableHead>
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("status")}</TableHead>
                  <TableHead className="px-4 text-slate-600 font-medium">{tClients("lastAction")}</TableHead>
                  <TableHead className="w-32 px-4 text-slate-600 font-medium text-right">{tClients("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, idx) => {
                  const fullAddress = formatAddressStreetForDisplay(client.address, client.address_data) || client.address || ""
                  const showActions = hoveredRowId === client.id
                  return (
                    <TableRow
                      key={client.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "border-slate-100 transition-colors cursor-pointer",
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white",
                        "hover:bg-slate-100/70"
                      )}
                      onClick={() => handleRowClick(client.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleRowClick(client.id)
                        }
                      }}
                      onMouseEnter={() => setHoveredRowId(client.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                    <TableCell className="px-4 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {(client.name || client.full_name || "C").charAt(0).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 font-medium text-slate-900">
                      {client.name || client.full_name || "Unknown"}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-slate-600 max-w-[180px] truncate">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-slate-600">
                      {client.phone ? formatPhoneForDisplay(client.phone) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-slate-600 max-w-[160px]">
                      {fullAddress ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">{fullAddress}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {client.address || fullAddress}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {client.status && (
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border",
                            getStatusColor(client.status)
                          )}
                        >
                          {getStatusLabel(client.status)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-slate-500 text-xs">
                      {getLastActionDate(client, locale) ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className={cn(
                        "flex items-center justify-end gap-0.5 transition-opacity",
                        showActions ? "opacity-100" : "opacity-40"
                      )}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                              <Link href={`/${locale}/clients/${client.id}`}>
                                <Eye className="h-4 w-4" aria-label="View" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{tClients("view")}</TooltipContent>
                        </Tooltip>
                        {client.phone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                <a href={`tel:${client.phone}`}>
                                  <Phone className="h-4 w-4" aria-label="Call" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Call</TooltipContent>
                          </Tooltip>
                        )}
                        {String(client?.status ?? "").toUpperCase() === "ARCHIVED" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRestoreTarget(client)
                                }}
                              >
                                <RotateCcw className="h-4 w-4" aria-label="Unarchive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tClients("unarchive")}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setArchiveTarget(client)
                                }}
                              >
                                <Trash2 className="h-4 w-4" aria-label={tCommon("delete")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tCommon("delete")}</TooltipContent>
                          </Tooltip>
                        )}
                        {onScheduleClick && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onScheduleClick(client)
                                }}
                              >
                                <Calendar className="h-4 w-4" aria-label={tClients("scheduleCall")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tClients("scheduleCall")}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {/* List view: Compact list on mobile - min 44px tap targets */}
      {viewMode === "list" && (
        <div className="md:hidden space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              role="button"
              tabIndex={0}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all cursor-pointer touch-manipulation min-h-[72px]",
                "hover:shadow-md hover:border-slate-200 active:bg-slate-50"
              )}
              onClick={() => handleRowClick(client.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleRowClick(client.id)
                }
              }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold">
                {(client.name || client.full_name || "C").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 truncate text-base">{client.name || client.full_name || "Unknown"}</h3>
                  {client.status && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border", getStatusColor(client.status))}>
                      {getStatusLabel(client.status)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate mt-0.5">{client.email || "—"}</p>
              </div>
              <Eye className="h-5 w-5 text-slate-400 shrink-0" aria-hidden />
            </div>
          ))}
        </div>
      )}

      {/* Grid view: Card layout */}
      {viewMode === "grid" && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clients.map((client) => {
          const fullAddress = formatAddressStreetForDisplay(client.address, client.address_data) || client.address || ""
          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all touch-manipulation"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {(client.name || client.full_name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{client.name || client.full_name || "Unknown"}</h3>
                    {client.status && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border",
                          getStatusColor(client.status)
                        )}
                      >
                        {getStatusLabel(client.status)}
                      </span>
                    )}
                  </div>
                  {client.email && (
                    <p className="mt-0.5 text-sm text-slate-500 truncate">{client.email}</p>
                  )}
                </div>
              </div>

              {(client.phone || fullAddress) && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${client.phone}`} className="text-primary hover:underline">
                        {formatPhoneForDisplay(client.phone)}
                      </a>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="flex-1 truncate" title={client.address || fullAddress}>{fullAddress}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address || fullAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-primary shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {getLastActionDate(client) && (
                <p className="mt-2 text-xs text-slate-500">Last activity: {getLastActionDate(client)}</p>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                <Button size="sm" className="flex-1 min-w-0 min-h-[44px] sm:min-h-0 touch-manipulation" asChild>
                  <Link href={`/${locale}/clients/${client.id}`} className="flex items-center justify-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {tClients("view")}
                  </Link>
                </Button>
                {onScheduleClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="border-slate-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      onScheduleClick(client)
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </Button>
                )}
                {client.phone && (
                  <Button size="sm" variant="outline" className="border-slate-200" asChild>
                    <a href={`tel:${client.phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                {String(client?.status ?? "").toUpperCase() === "ARCHIVED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 text-slate-500 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRestoreTarget(client)
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      setArchiveTarget(client)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Delete (Archive) Confirmation */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tClients("archiveClient")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tClients("archiveClientDesc", { name: archiveTarget?.name || archiveTarget?.full_name || "this client" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                if (!archiveTarget?.id) return
                setArchiving(true)
                try {
                  await api.deleteClient(Number(archiveTarget.id))
                  toast({
                    title: tClients("clientArchived"),
                    description: tClients("clientArchivedDesc", { name: archiveTarget?.name || archiveTarget?.full_name || "Client" }),
                  })
                  setArchiveTarget(null)
                  onClientArchived?.()
                } catch (err: any) {
                  toast({
                    title: tCommon("error"),
                    description: err?.message || tClients("archiveFailed"),
                    variant: "destructive",
                  })
                } finally {
                  setArchiving(false)
                }
              }}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving ? tClients("archiving") : tClients("archiveClientButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Confirmation */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tClients("unarchiveClient")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tClients("unarchiveClientDesc", { name: restoreTarget?.name || restoreTarget?.full_name || "this client" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                if (!restoreTarget?.id) return
                setRestoring(true)
                try {
                  await api.updateClient(Number(restoreTarget.id), { status: "ACTIVE" })
                  toast({
                    title: tClients("clientRestored"),
                    description: tClients("clientRestoredDesc", { name: restoreTarget?.name || restoreTarget?.full_name || "Client" }),
                  })
                  setRestoreTarget(null)
                  onClientArchived?.()
                } catch (err: any) {
                  toast({
                    title: tCommon("error"),
                    description: err?.message || tClients("restoreFailed"),
                    variant: "destructive",
                  })
                } finally {
                  setRestoring(false)
                }
              }}
              disabled={restoring}
            >
              {restoring ? tClients("restoring") : tClients("unarchive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
