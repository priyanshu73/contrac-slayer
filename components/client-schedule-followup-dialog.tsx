"use client"

import { useState, useEffect } from "react"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, ClockIcon, SendIcon, FileTextIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { contractorAI, api } from "@/lib/api"

type FollowupType = "appointment" | "quote" | "custom"

interface Booking {
  sid?: string
  booking_sid?: string
  id?: string
  name?: string
  email?: string
  starts_at?: string
  starts_at_for_client?: string
  start_time?: string
  start_at?: string
  scheduled_at?: string
}

interface QuoteOption {
  id: number
  title?: string
  job_number?: string
}

interface ClientScheduleFollowupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spId: number
  clientName: string
  clientPhone: string
  clientEmail?: string
  clientId?: number
  quotes: QuoteOption[]
  onScheduled?: () => void
}

function getTimeOneHourFromNow(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function bookingStartDate(b: Booking): Date | null {
  const raw =
    b?.starts_at ||
    b?.starts_at_for_client ||
    b?.start_time ||
    b?.start_at ||
    b?.start ||
    b?.scheduled_at
  if (!raw) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function ClientScheduleFollowupDialog({
  open,
  onOpenChange,
  spId,
  clientName,
  clientPhone,
  clientEmail,
  clientId,
  quotes,
  onScheduled,
}: ClientScheduleFollowupDialogProps) {
  const t = useTranslations("clientCommunications")
  const tSched = useTranslations("scheduling.dialog")
  const { toast } = useToast()
  const [followupType, setFollowupType] = useState<FollowupType>("appointment")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [quotesFetched, setQuotesFetched] = useState<QuoteOption[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<QuoteOption | null>(null)
  const [quoteLink, setQuoteLink] = useState<string | null>(null)
  const [quoteLinkLoading, setQuoteLinkLoading] = useState(false)
  const [useManualDate, setUseManualDate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState(getTimeOneHourFromNow())
  const [messageText, setMessageText] = useState("")
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const QUOTE_FOLLOWUP_TEMPLATE = "Hi {client_name}, just following up on the quote we sent. Do you have any questions? {quote_link}"

  useEffect(() => {
    if (!open) return
    setFollowupType("appointment")
    setSelectedBooking(null)
    setSelectedQuote(null)
    setQuoteLink(null)
    setUseManualDate(false)
    setSelectedDate(undefined)
    setSelectedTime(getTimeOneHourFromNow())
    setMessageText("")
  }, [open])

  useEffect(() => {
    if (!open || followupType !== "quote") {
      setQuotesFetched(quotes)
      return
    }
    if (!clientId) {
      setQuotesFetched(quotes)
      return
    }
    setQuotesLoading(true)
    api
      .getClientDetails(clientId)
      .then((data) => {
        const clientData = data as { quotes?: Array<{ id: number; title?: string; job_number?: string }> }
        setQuotesFetched(clientData?.quotes ?? quotes)
      })
      .catch(() => setQuotesFetched(quotes))
      .finally(() => setQuotesLoading(false))
  }, [open, followupType, clientId, quotes])

  useEffect(() => {
    if (!selectedQuote) {
      setQuoteLink(null)
      setMessageText("")
      return
    }
    setQuoteLinkLoading(true)
    api
      .generateQuotePublicLink(selectedQuote.id)
      .then((link) => {
        const frontendUrl = typeof window !== "undefined" ? window.location.origin : ""
        const fullUrl = `${frontendUrl}/quotes/${link}`
        setQuoteLink(fullUrl)
        const msg = QUOTE_FOLLOWUP_TEMPLATE.replace(/\{client_name\}/g, clientName ?? "there").replace(
          /\{quote_link\}/g,
          fullUrl
        )
        setMessageText(msg)
      })
      .catch(() => {
        setQuoteLink(null)
        setMessageText(
          QUOTE_FOLLOWUP_TEMPLATE.replace(/\{client_name\}/g, clientName ?? "there").replace(
            /\{quote_link\}/g,
            "[Quote link - sign the quote first to generate]"
          )
        )
      })
      .finally(() => setQuoteLinkLoading(false))
  }, [selectedQuote?.id, clientName])

  useEffect(() => {
    if (followupType === "quote" && selectedQuote && !selectedDate) {
      setSelectedDate(new Date())
    }
  }, [followupType, selectedQuote, selectedDate])

  useEffect(() => {
    if (!open || followupType !== "appointment") {
      setBookings([])
      return
    }
    if (!clientEmail) {
      setBookings([])
      setUseManualDate(true)
      return
    }
    const fetchBookings = async () => {
      setBookingsLoading(true)
      try {
        const profile = await api.getMyProfile() as { email?: string } | null
        const res = await api.getNeetoBookings({
          page_size: 50,
          type: "upcoming",
          host_email: profile?.email,
          client_email: clientEmail,
        })
        const data = (res as { data?: unknown })?.data ?? res
        const list = Array.isArray(data) ? data : (data as { bookings?: Booking[] })?.bookings ?? []
        setBookings(Array.isArray(list) ? list : [])
      } catch {
        setBookings([])
      } finally {
        setBookingsLoading(false)
      }
    }
    fetchBookings()
  }, [open, followupType, clientEmail])

  const getAppointmentDateTime = (): Date | null => {
    if (followupType === "appointment") {
      if (selectedBooking) {
        return bookingStartDate(selectedBooking)
      }
      if (useManualDate && selectedDate && selectedTime) {
        const [hours, minutes] = selectedTime.split(":").map(Number)
        return new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          hours,
          minutes,
          0,
          0
        )
      }
    }
    return null
  }

  const handleSubmit = async () => {
    if (followupType === "quote") {
      if (!selectedQuote || !selectedDate || !selectedTime || !messageText.trim()) {
        toast({
          title: t("error"),
          description: !selectedQuote ? t("selectQuoteRequired") : tSched("fillRequired"),
          variant: "destructive",
        })
        return
      }
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const dateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        0,
        0
      )
      if (dateTime <= new Date()) {
        toast({
          title: t("error"),
          description: t("pickFuture"),
          variant: "destructive",
        })
        return
      }
      if (!quoteLink && messageText.includes("[Quote link")) {
        toast({
          title: t("error"),
          description: t("signQuoteFirst"),
          variant: "destructive",
        })
        return
      }
      setIsSubmitting(true)
      try {
        const finalMessage = messageText
          .replace(/\{client_name\}/g, clientName ?? "there")
          .replace(/\{quote_link\}/g, quoteLink ?? "")
        await contractorAI.scheduleFollowup({
          sp_id: spId,
          customer_number: clientPhone,
          scheduled_for: dateTime.toISOString(),
          message_text: finalMessage.trim(),
          followup_type: "quote",
          reference_type: "quote",
          reference_id: selectedQuote.id,
        })
        toast({
          title: t("scheduledSuccess"),
          description: `Quote follow-up scheduled for ${format(dateTime, "MMM d, yyyy 'at' h:mm a")}`,
        })
        onOpenChange(false)
        onScheduled?.()
      } catch (error) {
        toast({
          title: t("error"),
          description: error instanceof Error ? error.message : t("scheduleFailed"),
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (followupType === "custom") {
      if (!selectedDate || !selectedTime || !messageText.trim()) {
        toast({
          title: t("error"),
          description: tSched("fillRequired"),
          variant: "destructive",
        })
        return
      }
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const dateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        0,
        0
      )
      if (dateTime <= new Date()) {
        toast({
          title: t("error"),
          description: t("pickFuture"),
          variant: "destructive",
        })
        return
      }
      setIsSubmitting(true)
      try {
        const timeStr = format(dateTime, "h:mm a")
        const dateStr = format(dateTime, "MMMM d, yyyy")
        const formattedMessage = messageText
          .replace(/\{client_name\}/g, clientName ?? "there")
          .replace(/\{time\}/g, timeStr)
          .replace(/\{date\}/g, dateStr)
          .replace(/\{datetime\}/g, `${dateStr} at ${timeStr}`)

        await contractorAI.scheduleFollowup({
          sp_id: spId,
          customer_number: clientPhone,
          scheduled_for: dateTime.toISOString(),
          message_text: formattedMessage,
          followup_type: "custom",
          reference_type: "client",
          reference_id: clientId,
        })
        toast({
          title: t("scheduledSuccess"),
          description: `Message scheduled for ${format(dateTime, "MMM d, yyyy 'at' h:mm a")}`,
        })
        onOpenChange(false)
        onScheduled?.()
      } catch (error) {
        toast({
          title: t("error"),
          description: error instanceof Error ? error.message : t("scheduleFailed"),
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Appointment reminder
    const dateTime = getAppointmentDateTime()
    if (!dateTime || dateTime <= new Date()) {
      toast({
        title: t("error"),
        description: t("pickFuture"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await contractorAI.scheduleFollowup({
        sp_id: spId,
        customer_number: clientPhone,
        appointment_datetime: dateTime.toISOString(),
        reference_type: "client",
        reference_id: clientId,
      }) as { reminders?: unknown[] }
      const count = Array.isArray(res?.reminders) ? res.reminders.length : 0
      toast({
        title: t("scheduledSuccess"),
        description:
          count > 0
            ? `Appointment reminders scheduled (${count} reminder${count === 1 ? "" : "s"} — 1 day and 1 hour before).`
            : "Automatic follow-ups are disabled. Enable them in Scheduling settings.",
      })
      onOpenChange(false)
      onScheduled?.()
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("scheduleFailed"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    (followupType === "appointment" && (selectedBooking || (useManualDate && selectedDate && selectedTime))) ||
    (followupType === "quote" && selectedQuote && selectedDate && selectedTime && messageText.trim()) ||
    (followupType === "custom" && selectedDate && selectedTime && messageText.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("scheduleFollowup")}</DialogTitle>
          <DialogDescription>{t("scheduleFollowupDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("followupType")}</Label>
            <Select value={followupType} onValueChange={(v) => setFollowupType(v as FollowupType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectFollowupType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {t("appointmentReminder")}
                  </span>
                </SelectItem>
                <SelectItem value="quote">
                  <span className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4" />
                    {t("quoteFollowup")}
                  </span>
                </SelectItem>
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    {t("customMessage")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {followupType === "appointment" && (
            <div className="space-y-3">
              <Label>{t("selectAppointment")}</Label>
              {!clientEmail && (
                <p className="text-sm text-muted-foreground py-2">{t("noClientEmailForAppointments")}</p>
              )}
              {clientEmail && bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookings.map((b) => {
                    const start = bookingStartDate(b)
                    const isSelected = selectedBooking === b
                    return (
                      <button
                        key={b.sid ?? b.booking_sid ?? b.id ?? Math.random()}
                        type="button"
                        onClick={() => {
                          setSelectedBooking(b)
                          setUseManualDate(false)
                        }}
                        className={cn(
                          "w-full text-left rounded-lg border p-3 transition-colors",
                          isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="font-medium">{b.name ?? "Appointment"}</div>
                        {start && (
                          <div className="text-sm text-muted-foreground">
                            {format(start, "EEE, MMM d, yyyy 'at' h:mm a")}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : clientEmail && bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t("noAppointments")}</p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUseManualDate(true)
                  setSelectedBooking(null)
                }}
              >
                {t("pickDateManually")}
              </Button>
              {useManualDate && (
                <div className="grid gap-4 md:grid-cols-2 pt-2">
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
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-schedule-time">{t("timeLabel")}</Label>
                    <div className="relative">
                      <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="client-schedule-time"
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {followupType === "quote" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("selectQuote")}</Label>
                {quotesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : quotesFetched.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {quotesFetched.map((q) => {
                      const isSelected = selectedQuote?.id === q.id
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setSelectedQuote(q)}
                          className={cn(
                            "w-full text-left rounded-lg border p-3 transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="font-medium">{q.title ?? q.job_number ?? `Quote #${q.id}`}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">{t("noQuotes")}</p>
                )}
              </div>
              {selectedQuote && (
                <>
                  {quoteLinkLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      {t("fetchingQuoteLink")}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="quote-followup-message">{t("quoteFollowupMessage")}</Label>
                    <Textarea
                      id="quote-followup-message"
                      rows={4}
                      placeholder={t("messagePlaceholder")}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      maxLength={500}
                      disabled={quoteLinkLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("quoteFollowupMessageHint")} {messageText.length}/500
                    </p>
                  </div>
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
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-schedule-time">{t("timeLabel")}</Label>
                      <div className="relative">
                        <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="quote-schedule-time"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {followupType === "custom" && (
            <div className="space-y-4">
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-schedule-time">{t("timeLabel")}</Label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="client-schedule-time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-schedule-message">{t("message")}</Label>
                <Textarea
                  id="client-schedule-message"
                  rows={4}
                  placeholder={t("messagePlaceholder")}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            <SendIcon className="mr-2 h-4 w-4" />
            {isSubmitting ? tSched("scheduling") : tSched("schedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
