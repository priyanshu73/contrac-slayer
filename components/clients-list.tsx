"use client"

import { useState } from "react"
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
import { Calendar, Trash2, RotateCcw, Phone, MapPin, ExternalLink, Users } from "lucide-react"
import { useTranslations } from "next-intl"
import { formatPhoneForDisplay } from "@/lib/utils"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ClientsListProps {
  clients?: any[]
  loading?: boolean
  /** When user clicks "Schedule a call" on a client card, open create-appointment for that client. */
  onScheduleClick?: (client: { id: number; name?: string; email?: string }) => void
  /** Called after a client is archived from the list (so parent can refetch). */
  onClientArchived?: () => void
}

export function ClientsList({ clients = [], loading = false, onScheduleClick, onClientArchived }: ClientsListProps) {
  const tClients = useTranslations("clients")
  const tCommon = useTranslations("common")
  const { toast } = useToast()
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [restoring, setRestoring] = useState(false)

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
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100" />
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
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No clients yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Clients will appear here once you create quotes or invoices for them.
            </p>
            <Button asChild>
              <a href="/clients/new">Add your first client</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <div 
          key={client.id} 
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{(client.name || client.full_name || 'C').charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 leading-tight">{client.name || client.full_name || "Unknown"}</h3>
                <div className="flex items-center gap-1">
                  {client.status && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusColor(client.status)}`}
                    >
                      {client.status}
                    </span>
                  )}
                  {String(client?.status ?? "").toUpperCase() === "ARCHIVED" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                      title="Unarchive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRestoreTarget(client)
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-label="Unarchive" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title={tCommon("delete")}
                      onClick={(e) => {
                        e.stopPropagation()
                        setArchiveTarget(client)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-label={tCommon("delete")} />
                    </Button>
                  )}
                </div>
              </div>
              {client.email && (
                <p className="mt-0.5 text-sm text-slate-500 truncate">{client.email}</p>
              )}
            </div>
          </div>

          {(client.phone || client.address) && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{formatPhoneForDisplay(client.phone)}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate flex-1">{client.address}</span>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/clients/${client.id}`}>View Details</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              type="button"
              title={tClients("scheduleCall")}
              className="border-slate-200 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation()
                onScheduleClick?.(client)
              }}
              disabled={!onScheduleClick}
            >
              <Calendar className="h-4 w-4" aria-label={tClients("scheduleCall")} />
            </Button>
            {client.phone && (
              <Button size="sm" variant="outline" className="border-slate-200 hover:bg-slate-50" asChild>
                <a href={`tel:${client.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Delete (Archive) Confirmation */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{archiveTarget?.name || archiveTarget?.full_name || "this client"}</strong>. You
              can still view archived clients from the clients list. This does not remove their quotes or history.
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
                    title: "Client archived",
                    description: `${archiveTarget?.name || archiveTarget?.full_name || "Client"} has been archived.`,
                  })
                  setArchiveTarget(null)
                  onClientArchived?.()
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to archive client.",
                    variant: "destructive",
                  })
                } finally {
                  setArchiving(false)
                }
              }}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving ? "Archiving…" : "Archive client"}
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
            <AlertDialogTitle>Unarchive client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore <strong>{restoreTarget?.name || restoreTarget?.full_name || "this client"}</strong> back
              to your active clients list.
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
                    title: "Client restored",
                    description: `${restoreTarget?.name || restoreTarget?.full_name || "Client"} has been restored.`,
                  })
                  setRestoreTarget(null)
                  onClientArchived?.()
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to restore client.",
                    variant: "destructive",
                  })
                } finally {
                  setRestoring(false)
                }
              }}
              disabled={restoring}
            >
              {restoring ? "Restoring…" : "Unarchive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
