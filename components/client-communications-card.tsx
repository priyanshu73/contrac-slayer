"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  MessageSquare,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  MailIcon,
  Loader2Icon,
  TrashIcon,
  HistoryIcon,
  ChevronDownIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import type { ScheduledFollowup, FollowupType, FollowupStatus, FollowupEvent } from "@/lib/types/followup"
import { api } from "@/lib/api"
import { ClientSendSmsDialog } from "@/components/client-send-sms-dialog"
import { ClientScheduleFollowupDialog } from "@/components/client-schedule-followup-dialog"
import { SourceBadge, DeliveryBadge, StepLabel, useCancelReasonLabel } from "@/components/followup-badges"

interface ClientCommunicationsCardProps {
  clientId: number
  clientName: string
  clientPhone: string
  clientEmail?: string
  /** Legacy; the backend now decides whether messaging is available. */
  spId: number | null
  quotes: Array<{ id: number; title?: string; job_number?: string }>
}

const followupTypeIcons: Record<FollowupType, React.ReactNode> = {
  appointment_1day: <CalendarIcon className="h-4 w-4" />,
  appointment_1hour: <ClockIcon className="h-4 w-4" />,
  quote: <FileTextIcon className="h-4 w-4" />,
  custom: <MailIcon className="h-4 w-4" />,
}

function getTypeLabel(type: FollowupType, t: (key: string) => string): string {
  const map: Record<FollowupType, string> = {
    appointment_1day: "typeAppointment1day",
    appointment_1hour: "typeAppointment1hour",
    quote: "typeQuote",
    custom: "typeCustom",
  }
  return t(map[type])
}

const statusColors: Record<FollowupStatus, string> = {
  pending: "bg-blue-500/10 text-blue-500",
  sent: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  cancelled: "bg-gray-500/10 text-gray-500",
}

function toDate(dateString: string): Date {
  const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
  return new Date(utcString)
}

export function ClientCommunicationsCard({
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  spId,
  quotes,
}: ClientCommunicationsCardProps) {
  const t = useTranslations("clientCommunications")
  const tList = useTranslations("scheduling.list")
  const reasonLabel = useCancelReasonLabel()
  const { toast } = useToast()
  const [followups, setFollowups] = useState<ScheduledFollowup[]>([])
  const [events, setEvents] = useState<FollowupEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notLinked, setNotLinked] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sendSmsOpen, setSendSmsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [followupToDelete, setFollowupToDelete] = useState<number | null>(null)

  const fetchTimeline = useCallback(async () => {
    if (!clientPhone) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const data = await api.getFollowupTimeline({ client_id: clientId, limit: 30 })
      setFollowups(data.followups ?? [])
      setEvents(data.events ?? [])
      setNotLinked(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      setNotLinked(/not linked|messaging service/i.test(message))
      setFollowups([])
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [clientId, clientPhone])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  const handleCancelFollowup = async () => {
    if (!followupToDelete) return
    try {
      await api.cancelFollowup(followupToDelete)
      await fetchTimeline()
      toast({ title: tList("cancelConfirmTitle"), description: tList("cancelledSuccess") })
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : tList("cancelFailed"),
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setFollowupToDelete(null)
    }
  }

  const formatShortDate = (dateString: string) => {
    try {
      return format(toDate(dateString), "MMM d, h:mm a")
    } catch {
      return dateString
    }
  }

  const eventLabel = (e: FollowupEvent): string => {
    const map: Record<string, string> = {
      scheduled: tList("eventScheduled"),
      sent: tList("eventSent"),
      delivered: tList("eventDelivered"),
      undelivered: tList("eventUndelivered"),
      failed: tList("eventFailed"),
      retry_scheduled: tList("eventRetry"),
      cancelled: tList("eventCancelled"),
      customer_replied: tList("eventReplied"),
      opted_out: tList("eventOptedOut"),
      owner_notified: tList("eventOwnerNotified"),
      digest_sent: tList("eventDigest"),
    }
    return map[e.event_type] ?? e.event_type
  }

  const canMessage = Boolean(clientPhone) && !notLinked
  const messagingUnavailable = notLinked || (!clientPhone && !clientEmail)

  return (
    <>
      <Card className="rounded-lg p-4 sm:rounded-xl sm:p-5 min-w-0 overflow-hidden">
        <div className="space-y-3 mb-4 min-w-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>button]:shrink-0 [&>button]:touch-manipulation">
            {clientEmail && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-11 rounded-lg sm:h-10 sm:w-10 sm:p-0" asChild>
                    <a href={`mailto:${clientEmail}`} className="flex items-center justify-center gap-1.5">
                      <MailIcon className="h-4 w-4" />
                      <span className="sm:hidden">{t("email")}</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("email")}</TooltipContent>
              </Tooltip>
            )}
            {canMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="h-11 rounded-lg sm:h-10 sm:w-10 sm:p-0" onClick={() => setSendSmsOpen(true)}>
                    <MessageSquare className="h-4 w-4" />
                    <span className="sm:hidden">{t("message")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("message")}</TooltipContent>
              </Tooltip>
            )}
            {canMessage && (
              <Button size="sm" variant="outline" className="col-span-2 h-11 rounded-lg sm:col-span-1 sm:h-9" onClick={() => setScheduleOpen(true)}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {t("scheduleFollowup")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("titleDesc")}</p>
          {messagingUnavailable && (clientEmail || clientPhone) && (
            <p className="text-xs text-muted-foreground mt-1">{t("spRequired")}</p>
          )}
        </div>

        {!notLinked && clientPhone && (
          <div className="min-w-0 overflow-hidden">
            <h4 className="text-sm font-medium mb-1.5 truncate">{t("recentFollowups")}</h4>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : followups.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">{t("noFollowups")}</p>
            ) : (
              <ul className="space-y-1">
                {followups.slice(0, 5).map((f) => {
                  const reason = f.status === "cancelled" ? reasonLabel(f.cancel_reason) : null
                  return (
                    <li
                      key={f.id}
                      className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs hover:bg-muted/60 min-w-0 overflow-hidden"
                    >
                      <span className="text-muted-foreground shrink-0 mt-0.5">{followupTypeIcons[f.followup_type]}</span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium shrink-0">{getTypeLabel(f.followup_type, tList)}</span>
                          <span className="text-muted-foreground shrink-0">{formatShortDate(f.scheduled_for)}</span>
                          <SourceBadge source={f.source} />
                          <StepLabel f={f} />
                        </div>
                        <p className="truncate text-muted-foreground mt-0.5" title={f.message_text}>{f.message_text}</p>
                        {f.status === "failed" && f.error_message && (
                          <p className="mt-0.5 text-red-500">{f.error_message}</p>
                        )}
                        {reason && <p className="mt-0.5 text-muted-foreground">{tList("stoppedBecause", { reason })}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={cn(statusColors[f.status], "text-[10px] px-1.5 py-0 font-medium")} variant="secondary">
                          {tList(f.status)}
                        </Badge>
                        {f.status === "sent" && <DeliveryBadge status={f.delivery_status} code={f.delivery_error_code} />}
                        {f.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive sm:h-6 sm:w-6"
                            onClick={() => {
                              setFollowupToDelete(f.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {events.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <HistoryIcon className="h-3.5 w-3.5" />
                  {t("activityLog", { count: events.length })}
                  <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showHistory && "rotate-180")} />
                </button>
                {showHistory && (
                  <ol className="mt-2 space-y-1 border-l pl-3">
                    {events.slice(0, 12).map((e) => (
                      <li key={e.id} className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{eventLabel(e)}</span>
                        {" · "}
                        {formatShortDate(e.created_at)}
                        {e.detail && <span className="block truncate" title={e.detail}>{e.detail}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {canMessage && (
        <ClientSendSmsDialog
          open={sendSmsOpen}
          onOpenChange={setSendSmsOpen}
          spId={spId ?? 0}
          clientName={clientName}
          clientPhone={clientPhone}
          clientId={clientId}
          onSent={fetchTimeline}
        />
      )}

      {canMessage && (
        <ClientScheduleFollowupDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          spId={spId ?? 0}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          clientId={clientId}
          quotes={quotes}
          onScheduled={fetchTimeline}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tList("cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tList("cancelConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tList("keepIt")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelFollowup} className="bg-destructive hover:bg-destructive/90">
              {tList("cancelFollowup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
