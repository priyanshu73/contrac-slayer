"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CalendarIcon, ClockIcon, SendIcon, InfoIcon, ChevronsUpDown, PlusIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn, formatPhoneForDisplay } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import type { ScheduleFollowupRequest } from "@/lib/types/followup"
import { contractorAI, api } from "@/lib/api"
import type { Client } from "@/lib/types"

/** Minimal shape needed to edit an existing pending follow-up. */
export interface EditFollowup {
  id: number
  customer_number: string
  customer_name?: string
  message_text: string
  scheduled_for: string
}

interface ScheduleFollowupDialogProps {
  contractorId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
  /** When set, the dialog edits this pending follow-up instead of creating a new one. */
  editFollowup?: EditFollowup | null
  /** Called after a successful edit (parent should refetch). */
  onUpdated?: () => void
}

const TEMPLATE_IDS = ["appointment", "quote", "custom"] as const

const DEFAULT_TEMPLATES: Record<string, string> = {
  appointment: "Hi {client_name}! This is a friendly reminder about your upcoming appointment. Looking forward to seeing you!",
  quote: "Hi {client_name}, just following up on the quote we sent. Do you have any questions?",
  custom: "",
}

/** Time 1 hour from now in local time, formatted as HH:MM for the time input. */
function getTimeOneHourFromNow(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Parse a backend UTC datetime string into a local Date for the date/time inputs. */
function parseScheduledToLocal(s: string): Date {
  const utc = /[Z+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(/Z$/, "")}Z`
  return new Date(utc)
}

/**
 * Fill {placeholders} in a message with the client's name and the scheduled time.
 * Used for BOTH the live preview and the actual send, so what the user sees is
 * exactly what gets delivered.
 */
function fillTemplate(raw: string, clientName: string, dateTime?: Date): string {
  const timeStr = dateTime ? format(dateTime, "h:mm a") : ""
  const dateStr = dateTime ? format(dateTime, "MMMM d, yyyy") : ""
  return raw
    .replace(/\{client_name\}/g, clientName || "there")
    .replace(/\{time\}/g, timeStr)
    .replace(/\{date\}/g, dateStr)
    .replace(/\{datetime\}/g, dateStr && timeStr ? `${dateStr} at ${timeStr}` : "")
}

export function ScheduleFollowupDialog({
  contractorId,
  open,
  onOpenChange,
  onScheduled,
  editFollowup,
  onUpdated,
}: ScheduleFollowupDialogProps) {
  const t = useTranslations("scheduling.dialog")
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [messageText, setMessageText] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState(() => getTimeOneHourFromNow())
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const templateNames: Record<string, string> = {
    appointment: t("templateAppointment"),
    quote: t("templateQuote"),
    custom: t("templateCustom"),
  }

  useEffect(() => {
    if (!open) return

    if (editFollowup) {
      // Edit mode: prefill from the existing follow-up; the client is locked so
      // there's no need to load the client list.
      setMessageText(editFollowup.message_text ?? "")
      const dt = parseScheduledToLocal(editFollowup.scheduled_for)
      setSelectedDate(dt)
      setSelectedTime(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`)
      setSelectedTemplate("")
      return
    }

    // Create mode: start from a clean slate (avoids state bleeding in from a
    // prior edit session that was closed without saving).
    setMessageText("")
    setSelectedTemplate("")
    setSelectedClient("")
    setSelectedDate(new Date())
    setSelectedTime(getTimeOneHourFromNow())

    const fetchClients = async () => {
      setClientsLoading(true)
      try {
        const data = await api.getClients(0, 500) as Client[] | { items?: Client[] }
        const list = Array.isArray(data) ? data : (data?.items ?? [])
        setClients(list)
      } catch {
        setClients([])
      } finally {
        setClientsLoading(false)
      }
    }
    fetchClients()
  }, [open, editFollowup])

  // Only show clients with a phone number (required for SMS follow-up)
  const clientsWithPhone = clients.filter((c) => c.phone && c.phone.trim() !== "")
  const selectedClientData = clientsWithPhone.find((c) => c.id.toString() === selectedClient)
  const isEditing = !!editFollowup
  // Name used for the preview + placeholder resolution (locked recipient when editing).
  const recipientName = isEditing ? (editFollowup?.customer_name || "") : (selectedClientData?.name || "")

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const text = DEFAULT_TEMPLATES[templateId]
    if (text !== undefined) setMessageText(text)
  }

  // The scheduled send time, derived from the date + time inputs (browser local).
  // Drives both the preview and the actual send so they can never diverge.
  const previewDateTime = (() => {
    if (!selectedDate) return undefined
    const [h, mm] = selectedTime.split(":").map(Number)
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, mm, 0, 0)
  })()

  /** Insert a {placeholder} token at the textarea cursor (or append if unfocused). */
  const insertToken = (token: string) => {
    const el = messageRef.current
    if (!el) {
      setMessageText((prev) => prev + token)
      return
    }
    const start = el.selectionStart ?? messageText.length
    const end = el.selectionEnd ?? messageText.length
    setMessageText(messageText.slice(0, start) + token + messageText.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleSubmit = async () => {
    const baseValid = contractorId && selectedDate && selectedTime && messageText.trim()
    if (!(isEditing ? baseValid : baseValid && selectedClient)) {
      toast({
        title: t("missingInfo"),
        description: t("fillRequired"),
        variant: "destructive",
      })
      return
    }

    // Resolve the recipient: locked when editing, picked from the list otherwise.
    const client = clientsWithPhone.find((c) => c.id.toString() === selectedClient)
    const recipientPhone = isEditing ? editFollowup?.customer_number : client?.phone
    const nameForTemplate = isEditing ? (editFollowup?.customer_name ?? "") : (client?.name ?? "")
    if (!recipientPhone) {
      toast({
        title: t("invalidClient"),
        description: t("noPhone"),
        variant: "destructive",
      })
      return
    }
    if (!selectedDate || contractorId == null) return

    setIsSubmitting(true)

    try {
      // Treat date and time as browser local time; send UTC to API
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const dateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes, 0, 0)

      if (dateTime <= new Date()) {
        toast({
          title: t("invalidTime"),
          description: t("pickFuture"),
          variant: "destructive",
        })
        return
      }

      const formattedMessage = fillTemplate(messageText, nameForTemplate, dateTime)

      if (isEditing) {
        await contractorAI.updateFollowup(String(editFollowup!.id), {
          scheduled_for: dateTime.toISOString(),
          message_text: formattedMessage,
        })
        toast({
          title: t("updatedSuccess"),
          description: `Message rescheduled for ${format(dateTime, "MMM d, yyyy 'at' h:mm a")}`,
        })
        onUpdated?.()
      } else {
        await contractorAI.scheduleFollowup({
          sp_id: contractorId as number,
          customer_number: recipientPhone,
          scheduled_for: dateTime.toISOString(),
          message_text: formattedMessage,
          followup_type: selectedTemplate || "custom",
        })
        toast({
          title: t("scheduledSuccess"),
          description: `Message scheduled for ${format(dateTime, "MMM d, yyyy 'at' h:mm a")}`,
        })
        onScheduled?.()
      }

      // Reset form
      setSelectedClient("")
      setSelectedTemplate("")
      setMessageText("")
      setSelectedDate(undefined)
      setSelectedTime(getTimeOneHourFromNow())
      setClientComboboxOpen(false)
      setDatePopoverOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : (isEditing ? t("updateFailed") : t("scheduleFailed")),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const characterCount = messageText.length
  const maxCharacters = 500

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("title")}</DialogTitle>
          <DialogDescription>{isEditing ? t("editDescription") : t("description")}</DialogDescription>
        </DialogHeader>

        {!contractorId ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>{t("spRequired")}</AlertDescription>
          </Alert>
        ) : (
        <>
        <div className="space-y-4 py-4">
          {/* Client Selection - combined search + dropdown */}
          <div className="space-y-2">
            <Label htmlFor="client">{t("clientLabel")}</Label>
            {isEditing ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">
                  {editFollowup?.customer_name || formatPhoneForDisplay(editFollowup?.customer_number ?? "") || "—"}
                </span>
                {editFollowup?.customer_number && (
                  <span className="text-xs text-muted-foreground">
                    {formatPhoneForDisplay(editFollowup.customer_number)}
                  </span>
                )}
              </div>
            ) : (
            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboboxOpen}
                  disabled={clientsLoading}
                  className="w-full justify-between font-normal"
                >
                  {clientsLoading
                    ? t("loadingClients")
                    : selectedClientData
                      ? `${selectedClientData.name}${selectedClientData.phone ? ` (${formatPhoneForDisplay(selectedClientData.phone)})` : ""}`
                      : t("selectClient")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("searchClients")} />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>
                      {clientsWithPhone.length === 0
                        ? t("noClientsWithPhone")
                        : t("noClientsMatch")}
                    </CommandEmpty>
                    <CommandGroup>
                      {clientsWithPhone.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.name ?? ""} ${client.phone ?? ""} ${client.email ?? ""}`}
                          onSelect={() => {
                            setSelectedClient(client.id.toString())
                            setClientComboboxOpen(false)
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{client.name}</span>
                            {client.phone && (
                              <span className="text-xs text-muted-foreground">{formatPhoneForDisplay(client.phone)}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            )}
          </div>

          {/* Template Selection — only when creating; editing keeps the existing message */}
          {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="template">{t("templateLabel")}</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("templatePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {templateNames[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Message Text */}
          <div className="space-y-2">
            <Label htmlFor="message">{t("messageLabel")}</Label>
            <Textarea
              ref={messageRef}
              id="message"
              rows={6}
              placeholder={t("messagePlaceholder")}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={maxCharacters}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("insertLabel")}</span>
              {[
                { token: "{client_name}", label: t("varName") },
                { token: "{date}", label: t("varDate") },
                { token: "{time}", label: t("varTime") },
              ].map(({ token, label }) => (
                <button
                  type="button"
                  key={token}
                  onClick={() => insertToken(token)}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PlusIcon className="h-3 w-3" />
                  {label}
                </button>
              ))}
              <span className={cn("ml-auto text-xs", characterCount > maxCharacters * 0.9 ? "text-orange-500" : "text-muted-foreground")}>
                {characterCount}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Date & Time Selection (browser local timezone) */}
          <div className="space-y-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("dateLabel")}</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : t("pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setDatePopoverOpen(false)
                        }
                      }}
                      disabled={(date) => {
                        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                        const todayStart = new Date()
                        todayStart.setHours(0, 0, 0, 0)
                        return dayStart < todayStart
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">{t("timeLabel")}</Label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("timesLocal")}
              {typeof Intl !== "undefined" && (
                <> ({Intl.DateTimeFormat().resolvedOptions().timeZone})</>
              )}
            </p>
          </div>

          {/* Preview — resolved exactly as the client will receive it */}
          {messageText.trim() && previewDateTime && (
            <div className="space-y-2 rounded-lg border border-muted bg-muted/50 p-4">
              <p className="text-sm font-medium">
                {t("preview")}
                {recipientName && (
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {t("previewRecipient", { name: recipientName })}
                  </span>
                )}
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {fillTemplate(messageText, recipientName, previewDateTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("previewSentOn")}{" "}
                <span className="font-medium text-foreground">
                  {format(previewDateTime, "MMMM d, yyyy 'at' h:mm a")}
                </span>
                {typeof Intl !== "undefined" && (
                  <span> ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <SendIcon className="mr-2 h-4 w-4" />
            {isSubmitting
              ? (isEditing ? t("updating") : t("scheduling"))
              : (isEditing ? t("update") : t("schedule"))}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
