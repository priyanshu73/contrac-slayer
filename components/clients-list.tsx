"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
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
import { Calendar, Trash2, RotateCcw } from "lucide-react"
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
    switch (status) {
      case "active":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "inactive":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-6">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clients will appear here once you create quotes or invoices for them.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Card key={client.id} className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-lg font-semibold">{(client.name || client.full_name || 'C').charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{client.name || client.full_name || "Unknown"}</h3>
                <div className="flex items-center gap-2">
                  {client.status && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(client.status)}`}
                    >
                      {client.status}
                    </span>
                  )}
                  {String(client?.status ?? "").toUpperCase() === "ARCHIVED" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      title="Unarchive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRestoreTarget(client)
                      }}
                    >
                      <RotateCcw className="h-4 w-4" aria-label="Unarchive" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title={tCommon("delete")}
                      onClick={(e) => {
                        e.stopPropagation()
                        setArchiveTarget(client)
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-label={tCommon("delete")} />
                    </Button>
                  )}
                </div>
              </div>
              {client.email && (
                <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
              )}
            </div>
          </div>

          {(client.phone || client.address) && (
            <div className="mt-4 space-y-2 text-sm">
              {client.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span>{formatPhoneForDisplay(client.phone)}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="truncate flex-1">{client.address}</span>
                  <Button variant="ghost" size="sm" asChild className="h-7 px-2 shrink-0">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/clients/${client.id}`}>View Details</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              type="button"
              title={tClients("scheduleCall")}
              onClick={(e) => {
                e.stopPropagation()
                onScheduleClick?.(client)
              }}
              disabled={!onScheduleClick}
            >
              <Calendar className="h-4 w-4" aria-label={tClients("scheduleCall")} />
            </Button>
            {client.phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${client.phone}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </a>
              </Button>
            )}
          </div>
        </Card>
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
