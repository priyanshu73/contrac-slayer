"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import type { ScheduledFollowup, FollowupType, FollowupStatus } from "@/lib/types/followup"
import { contractorAI } from "@/lib/api"
import { ClientSendSmsDialog } from "@/components/client-send-sms-dialog"
import { ClientScheduleFollowupDialog } from "@/components/client-schedule-followup-dialog"

interface ClientCommunicationsCardProps {
  clientId: number
  clientName: string
  clientPhone: string
  clientEmail?: string
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
  const { toast } = useToast()
  const [followups, setFollowups] = useState<ScheduledFollowup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendSmsOpen, setSendSmsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [followupToDelete, setFollowupToDelete] = useState<number | null>(null)

  const fetchFollowups = async () => {
    if (!spId || !clientPhone) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const data = await contractorAI.getScheduledFollowups(spId.toString(), {
        customer_number: clientPhone,
        limit: 50,
      })
      const raw = (data as { followups?: ScheduledFollowup[] }).followups || []
      setFollowups(raw)
    } catch {
      setFollowups([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowups()
  }, [spId, clientPhone])

  const handleCancelFollowup = async () => {
    if (!followupToDelete) return
    try {
      await contractorAI.cancelFollowup(followupToDelete.toString())
      setFollowups((prev) => prev.filter((f) => f.id !== followupToDelete))
      toast({
        title: tList("cancelConfirmTitle"),
        description: tList("cancelledSuccess"),
      })
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
      const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
      const date = new Date(utcString)
      return format(date, "MMM d, h:mm a")
    } catch {
      return dateString
    }
  }

  const canSendMessage = Boolean(spId && clientPhone)

  return (
    <>
      <Card className="p-5">
        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {clientEmail && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${clientEmail}`}>
                  <MailIcon className="mr-2 h-4 w-4" />
                  {t("email")}
                </a>
              </Button>
            )}
            {canSendMessage && (
              <Button size="sm" onClick={() => setSendSmsOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {t("message")}
              </Button>
            )}
            {spId && (
              <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {t("scheduleFollowup")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("titleDesc")}</p>
          {!spId && (clientEmail || clientPhone) && (
            <p className="text-xs text-muted-foreground mt-1">{t("spRequired")}</p>
          )}
        </div>

        {spId && (
        <div>
          <h4 className="text-sm font-medium mb-1.5">{t("recentFollowups")}</h4>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : followups.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">{t("noFollowups")}</p>
          ) : (
            <ul className="space-y-1">
              {followups.slice(0, 5).map((f) => (
                <li
                  key={f.id}
                  className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs hover:bg-muted/60"
                >
                  <span className="text-muted-foreground shrink-0 mt-0.5">
                    {followupTypeIcons[f.followup_type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium shrink-0">
                        {getTypeLabel(f.followup_type, tList)}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatShortDate(f.scheduled_for)}
                      </span>
                    </div>
                    <p className="truncate text-muted-foreground mt-0.5" title={f.message_text}>
                      {f.message_text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      className={cn(statusColors[f.status], "text-[10px] px-1.5 py-0 font-medium")}
                      variant="secondary"
                    >
                      {tList(f.status)}
                    </Badge>
                    {f.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
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
              ))}
            </ul>
          )}
        </div>
        )}
      </Card>

      {canSendMessage && spId && (
        <ClientSendSmsDialog
          open={sendSmsOpen}
          onOpenChange={setSendSmsOpen}
          spId={spId}
          clientName={clientName}
          clientPhone={clientPhone}
          clientId={clientId}
          onSent={fetchFollowups}
        />
      )}

      {spId && (
        <ClientScheduleFollowupDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          spId={spId}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          clientId={clientId}
          quotes={quotes}
          onScheduled={fetchFollowups}
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
            <AlertDialogAction
              onClick={handleCancelFollowup}
              className="bg-destructive hover:bg-destructive/90"
            >
              {tList("cancelFollowup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
