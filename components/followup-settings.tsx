"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  InfoIcon,
  SaveIcon,
  Loader2Icon,
  CalendarClockIcon,
  FileTextIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  MoonIcon,
  BellIcon,
  PlusIcon,
  Trash2Icon,
  ReplyIcon,
  ClipboardListIcon,
  CalendarCheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations, useLocale } from "next-intl"
import type {
  FollowupSettings as FollowupSettingsType,
  FollowupSettingsUpdate,
  QuoteStep,
  IntakeStep,
  BookingStep,
} from "@/lib/types/followup"
import { api } from "@/lib/api"

interface FollowupSettingsProps {
  /** Legacy prop; linking is now checked by the backend. */
  contractorId?: number
}

const MAX_STEPS = 5
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function hourLabel(h: number, locale: string): string {
  const d = new Date(2024, 0, 1, h, 0, 0)
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(d)
}

function weekdayShort(i: number, locale: string): string {
  // 2024-01-01 is a Monday; Mon=0 matches the backend.
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(Date.UTC(2024, 0, 1 + i, 12)))
}

/** The cadence shown in the editor: explicit steps, else the legacy single step. */
function initialSteps(s: FollowupSettingsType): QuoteStep[] {
  if (Array.isArray(s.quote_sequence_json) && s.quote_sequence_json.length) return s.quote_sequence_json
  if (Array.isArray(s.quote_steps) && s.quote_steps.length) return s.quote_steps
  return [{ day: s.followup_days_after_quote || 3, template: s.quote_followup_template || "" }]
}

function initialIntakeSteps(s: FollowupSettingsType): IntakeStep[] {
  if (Array.isArray(s.intake_sequence_json) && s.intake_sequence_json.length) return s.intake_sequence_json
  if (Array.isArray(s.intake_steps) && s.intake_steps.length) return s.intake_steps
  return [
    { delay_minutes: 30, template: "Hi {first_name}, just following up to make sure you got the link to share your project details: {link}" },
    { delay_minutes: 120, template: "Hi {first_name}, we'd love to help with your project! Whenever you're ready, fill out the details here: {link}" },
  ]
}

function initialBookingSteps(s: FollowupSettingsType): BookingStep[] {
  if (Array.isArray(s.booking_sequence_json) && s.booking_sequence_json.length) return s.booking_sequence_json
  if (Array.isArray(s.booking_steps) && s.booking_steps.length) return s.booking_steps
  return [
    { delay_hours: 1, template: "Hi {first_name}, here is the link to pick a convenient time for your appointment: {booking_link}" },
    { delay_hours: 24, template: "Hi {first_name}, just checking in to see if you still wanted to schedule: {booking_link}" },
  ]
}

export function FollowupSettings({ contractorId: _contractorId }: FollowupSettingsProps) {
  const t = useTranslations("scheduling.settings")
  const locale = useLocale()
  const [settings, setSettings] = useState<FollowupSettingsType | null>(null)
  const [defaults, setDefaults] = useState<Partial<FollowupSettingsType>>({})
  const [contractorTz, setContractorTz] = useState<string | null>(null)
  const [steps, setSteps] = useState<QuoteStep[]>([])
  const [intakeSteps, setIntakeSteps] = useState<IntakeStep[]>([])
  const [bookingSteps, setBookingSteps] = useState<BookingStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notLinked, setNotLinked] = useState(false)
  const [appointmentTemplatesOpen, setAppointmentTemplatesOpen] = useState(false)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setNotLinked(false)
      const data = await api.getFollowupSettings()
      setSettings(data.settings)
      setDefaults(data.defaults ?? {})
      setContractorTz(data.contractor_timezone ?? data.settings.timezone ?? null)
      setSteps(initialSteps(data.settings))
      setIntakeSteps(initialIntakeSteps(data.settings))
      setBookingSteps(initialBookingSteps(data.settings))
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (/not linked|messaging service|not found/i.test(message)) {
        setSettings(null)
        setNotLinked(true)
      } else {
        toast({ title: t("error"), description: message || t("loadFailedShort"), variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const update = <K extends keyof FollowupSettingsType>(key: K, value: FollowupSettingsType[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!settings) return
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].template.trim()) {
        toast({ title: t("error"), description: t("stepTemplateRequired", { step: i + 1 }), variant: "destructive" })
        return
      }
      if (i > 0 && steps[i].day <= steps[i - 1].day) {
        toast({ title: t("error"), description: t("stepDaysIncreasing"), variant: "destructive" })
        return
      }
    }
    if (settings.intake_followup_enabled) {
      for (let i = 0; i < intakeSteps.length; i++) {
        if (!intakeSteps[i].template.trim()) {
          toast({ title: t("error"), description: t("stepTemplateRequired", { step: i + 1 }), variant: "destructive" })
          return
        }
        if (i > 0 && intakeSteps[i].delay_minutes <= intakeSteps[i - 1].delay_minutes) {
          toast({ title: t("error"), description: t("stepMinutesIncreasing"), variant: "destructive" })
          return
        }
      }
    }
    if (settings.booking_followup_enabled) {
      for (let i = 0; i < bookingSteps.length; i++) {
        if (!bookingSteps[i].template.trim()) {
          toast({ title: t("error"), description: t("stepTemplateRequired", { step: i + 1 }), variant: "destructive" })
          return
        }
        if (i > 0 && bookingSteps[i].delay_hours <= bookingSteps[i - 1].delay_hours) {
          toast({ title: t("error"), description: t("stepHoursIncreasing"), variant: "destructive" })
          return
        }
      }
    }
    setIsSaving(true)
    try {
      const payload: FollowupSettingsUpdate = {
        automatic_followup_enabled: settings.automatic_followup_enabled,
        followup_days_before_appointment: settings.followup_days_before_appointment,
        followup_hours_before_appointment: settings.followup_hours_before_appointment,
        reminder_1day_template: settings.reminder_1day_template,
        reminder_1hour_template: settings.reminder_1hour_template,
        quote_sequence_json: steps.length ? steps : null,
        // keep the legacy single-step fields in sync for older readers
        followup_days_after_quote: steps[0]?.day ?? settings.followup_days_after_quote ?? null,
        quote_followup_template: steps[0]?.template ?? settings.quote_followup_template,
        intake_followup_enabled: settings.intake_followup_enabled,
        intake_sequence_json: intakeSteps.length ? intakeSteps : null,
        booking_followup_enabled: settings.booking_followup_enabled,
        booking_sequence_json: bookingSteps.length ? bookingSteps : null,
        default_send_hour: settings.default_send_hour,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        send_days: settings.send_days,
        stop_on_reply: settings.stop_on_reply,
        notify_owner_on_send: settings.notify_owner_on_send,
        notify_owner_on_failure: settings.notify_owner_on_failure,
        notify_owner_on_reply: settings.notify_owner_on_reply,
        daily_digest_enabled: settings.daily_digest_enabled,
        digest_hour: settings.digest_hour,
      }
      const data = await api.updateFollowupSettings(payload)
      setSettings(data.settings)
      setSteps(initialSteps(data.settings))
      setIntakeSteps(initialIntakeSteps(data.settings))
      setBookingSteps(initialBookingSteps(data.settings))
      setContractorTz(data.contractor_timezone ?? data.settings.timezone ?? null)
      toast({ title: t("saveSuccessTitle"), description: t("saveSuccess") })
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("saveFailed"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (!settings) return
    const next = { ...settings, ...defaults } as FollowupSettingsType
    setSettings(next)
    setSteps(
      Array.isArray(defaults.quote_sequence_json) && defaults.quote_sequence_json.length
        ? defaults.quote_sequence_json
        : initialSteps(next),
    )
    setIntakeSteps(
      Array.isArray(defaults.intake_sequence_json) && defaults.intake_sequence_json.length
        ? defaults.intake_sequence_json
        : initialIntakeSteps(next),
    )
    setBookingSteps(
      Array.isArray(defaults.booking_sequence_json) && defaults.booking_sequence_json.length
        ? defaults.booking_sequence_json
        : initialBookingSteps(next),
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notLinked) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>{t("spRequired")}</AlertDescription>
      </Alert>
    )
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("loadFailed")}</AlertDescription>
      </Alert>
    )
  }

  const enabled = settings.automatic_followup_enabled
  const tzLabel = contractorTz || t("timezoneDefault")
  const variablesHint = (vars: string[]) => (
    <p className="text-xs text-muted-foreground">
      {t("availableVariables")}{" "}
      {vars.map((v, i) => (
        <span key={v}>
          {i > 0 && ", "}
          <code className="text-xs">{`{${v}}`}</code>
        </span>
      ))}
    </p>
  )

  return (
    <div className="space-y-4">
      {/* Master switch */}
      <Card className="gap-0 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">{t("autoFollowups")}</Label>
            <p className="text-sm text-muted-foreground">{t("autoFollowupsDesc")}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={(v) => update("automatic_followup_enabled", v)} />
        </div>
        <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("howItWorks", {
            hour: hourLabel(settings.default_send_hour, locale),
            tz: tzLabel,
            from: settings.quiet_hours_start,
            to: settings.quiet_hours_end,
          })}
        </p>
      </Card>

      {/* Intake form follow-ups ("Call & Fill") */}
      <Card className={cn("gap-0 p-5 transition-opacity", (!enabled || !settings.intake_followup_enabled) && "opacity-75")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-base font-semibold">{t("intakeFollowup")}</Label>
              <p className="text-sm text-muted-foreground">{t("intakeFollowupDesc")}</p>
            </div>
          </div>
          <Switch
            checked={settings.intake_followup_enabled}
            onCheckedChange={(v) => update("intake_followup_enabled", v)}
            disabled={!enabled}
          />
        </div>

        {settings.intake_followup_enabled && (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground">{t("intakeCadenceDesc")}</div>
            {intakeSteps.map((step, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <Label htmlFor={`intake-delay-${i}`} className="text-sm">{t("minutesAfterCall")}</Label>
                    <Input
                      id={`intake-delay-${i}`}
                      type="number"
                      min="5"
                      max="1440"
                      className="h-8 w-24"
                      value={step.delay_minutes}
                      disabled={!enabled || !settings.intake_followup_enabled}
                      onChange={(e) => {
                        const delay_minutes = Math.max(1, parseInt(e.target.value) || 0)
                        setIntakeSteps((prev) => prev.map((s, j) => (j === i ? { ...s, delay_minutes } : s)))
                      }}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={!enabled || !settings.intake_followup_enabled || intakeSteps.length <= 1}
                    onClick={() => setIntakeSteps((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={t("removeStep")}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  className="mt-2"
                  value={step.template}
                  disabled={!enabled || !settings.intake_followup_enabled}
                  placeholder={t("intakeTemplatePlaceholder")}
                  onChange={(e) => {
                    const template = e.target.value
                    setIntakeSteps((prev) => prev.map((s, j) => (j === i ? { ...s, template } : s)))
                  }}
                />
              </div>
            ))}
            {variablesHint(["first_name", "link", "business_name"])}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!enabled || !settings.intake_followup_enabled || intakeSteps.length >= MAX_STEPS}
                onClick={() =>
                  setIntakeSteps((prev) => [
                    ...prev,
                    {
                      delay_minutes: (prev[prev.length - 1]?.delay_minutes ?? 30) + 60,
                      template: prev[prev.length - 1]?.template ?? "",
                    },
                  ])
                }
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                {t("addStep")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("maxSteps", { max: MAX_STEPS })}</span>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ReplyIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("intakeCadenceStops")}
            </p>
          </div>
        )}
      </Card>

      {/* Appointment reminders */}
      <Card className={cn("gap-0 p-5 transition-opacity", !enabled && "opacity-60")}>
        <div className="flex items-center gap-2">
          <CalendarClockIcon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">{t("appointmentReminders")}</Label>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("appointmentRemindersDesc")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="days-before" className="text-xs text-muted-foreground">{t("daysBeforeShort")}</Label>
            <Input
              id="days-before"
              type="number"
              min="0"
              max="30"
              value={settings.followup_days_before_appointment}
              onChange={(e) => update("followup_days_before_appointment", parseInt(e.target.value) || 0)}
              disabled={!enabled}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("daysBeforeHint", { hour: hourLabel(settings.default_send_hour, locale) })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours-before" className="text-xs text-muted-foreground">{t("hoursBeforeShort")}</Label>
            <Input
              id="hours-before"
              type="number"
              min="0"
              max="72"
              value={settings.followup_hours_before_appointment}
              onChange={(e) => update("followup_hours_before_appointment", parseInt(e.target.value) || 0)}
              disabled={!enabled}
            />
            <p className="text-[11px] text-muted-foreground">{t("hoursBeforeHint")}</p>
          </div>
        </div>

        <Collapsible open={appointmentTemplatesOpen} onOpenChange={setAppointmentTemplatesOpen} className="mt-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
              {t("messageTemplates", { count: 2 })}
            </span>
            <ChevronDownIcon className={cn("h-4 w-4 text-muted-foreground transition-transform", appointmentTemplatesOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="template-1day">{t("template1day")}</Label>
              <Textarea
                id="template-1day"
                rows={3}
                value={settings.reminder_1day_template ?? ""}
                onChange={(e) => update("reminder_1day_template", e.target.value)}
                disabled={!enabled}
                placeholder={t("template1dayPlaceholder")}
              />
              {variablesHint(["customer_name", "time", "date", "datetime", "sp_name"])}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-1hour">{t("template1hour")}</Label>
              <Textarea
                id="template-1hour"
                rows={3}
                value={settings.reminder_1hour_template ?? ""}
                onChange={(e) => update("reminder_1hour_template", e.target.value)}
                disabled={!enabled}
                placeholder={t("template1hourPlaceholder")}
              />
              {variablesHint(["customer_name", "time", "sp_name"])}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Quote cadence */}
      <Card className={cn("gap-0 p-5 transition-opacity", !enabled && "opacity-60")}>
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">{t("quoteCadence")}</Label>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("quoteCadenceDesc")}</p>

        <div className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Label htmlFor={`step-day-${i}`} className="text-sm">{t("dayAfterQuote")}</Label>
                  <Input
                    id={`step-day-${i}`}
                    type="number"
                    min="0"
                    max="365"
                    className="h-8 w-20"
                    value={step.day}
                    disabled={!enabled}
                    onChange={(e) => {
                      const day = Math.max(0, parseInt(e.target.value) || 0)
                      setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, day } : s)))
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={!enabled || steps.length <= 1}
                  onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={t("removeStep")}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                rows={2}
                className="mt-2"
                value={step.template}
                disabled={!enabled}
                placeholder={t("quoteTemplatePlaceholder")}
                onChange={(e) => {
                  const template = e.target.value
                  setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, template } : s)))
                }}
              />
            </div>
          ))}
          {variablesHint(["customer_name", "quote_link", "sp_name"])}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!enabled || steps.length >= MAX_STEPS}
              onClick={() =>
                setSteps((prev) => [
                  ...prev,
                  { day: (prev[prev.length - 1]?.day ?? 0) + 4, template: prev[prev.length - 1]?.template ?? "" },
                ])
              }
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t("addStep")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("maxSteps", { max: MAX_STEPS })}</span>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ReplyIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("cadenceStops")}
          </p>
        </div>
      </Card>

      {/* Booking link follow-ups */}
      <Card className={cn("gap-0 p-5 transition-opacity", (!enabled || !settings.booking_followup_enabled) && "opacity-75")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheckIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-base font-semibold">{t("bookingFollowup")}</Label>
              <p className="text-sm text-muted-foreground">{t("bookingFollowupDesc")}</p>
            </div>
          </div>
          <Switch
            checked={settings.booking_followup_enabled}
            onCheckedChange={(v) => update("booking_followup_enabled", v)}
            disabled={!enabled}
          />
        </div>

        {settings.booking_followup_enabled && (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground">{t("bookingCadenceDesc")}</div>
            {bookingSteps.map((step, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <Label htmlFor={`booking-delay-${i}`} className="text-sm">{t("hoursAfterLink")}</Label>
                    <Input
                      id={`booking-delay-${i}`}
                      type="number"
                      min="1"
                      max="168"
                      className="h-8 w-24"
                      value={step.delay_hours}
                      disabled={!enabled || !settings.booking_followup_enabled}
                      onChange={(e) => {
                        const delay_hours = Math.max(1, parseInt(e.target.value) || 0)
                        setBookingSteps((prev) => prev.map((s, j) => (j === i ? { ...s, delay_hours } : s)))
                      }}
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={!enabled || !settings.booking_followup_enabled || bookingSteps.length <= 1}
                    onClick={() => setBookingSteps((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={t("removeStep")}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  className="mt-2"
                  value={step.template}
                  disabled={!enabled || !settings.booking_followup_enabled}
                  placeholder={t("bookingTemplatePlaceholder")}
                  onChange={(e) => {
                    const template = e.target.value
                    setBookingSteps((prev) => prev.map((s, j) => (j === i ? { ...s, template } : s)))
                  }}
                />
              </div>
            ))}
            {variablesHint(["first_name", "booking_link", "business_name"])}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!enabled || !settings.booking_followup_enabled || bookingSteps.length >= MAX_STEPS}
                onClick={() =>
                  setBookingSteps((prev) => [
                    ...prev,
                    {
                      delay_hours: (prev[prev.length - 1]?.delay_hours ?? 1) + 24,
                      template: prev[prev.length - 1]?.template ?? "",
                    },
                  ])
                }
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                {t("addStep")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("maxSteps", { max: MAX_STEPS })}</span>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ReplyIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("bookingCadenceStops")}
            </p>
          </div>
        )}
      </Card>

      {/* Send window */}
      <Card className="gap-0 p-5">
        <div className="flex items-center gap-2">
          <MoonIcon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">{t("sendWindow")}</Label>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("sendWindowDesc")}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("sendHour")}</Label>
            <Select value={String(settings.default_send_hour)} onValueChange={(v) => update("default_send_hour", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{hourLabel(h, locale)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("timezone")}</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">{tzLabel}</div>
            <p className="text-[11px] text-muted-foreground">{t("timezoneHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">{t("quietFrom")}</Label>
            <Input id="quiet-start" type="time" value={settings.quiet_hours_start} onChange={(e) => update("quiet_hours_start", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">{t("quietTo")}</Label>
            <Input id="quiet-end" type="time" value={settings.quiet_hours_end} onChange={(e) => update("quiet_hours_end", e.target.value)} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("sendDays")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 7 }, (_, i) => i).map((d) => {
              const on = settings.send_days?.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const cur = new Set(settings.send_days ?? [])
                    if (cur.has(d)) {
                      if (cur.size === 1) return
                      cur.delete(d)
                    } else cur.add(d)
                    update("send_days", Array.from(cur).sort((a, b) => a - b))
                  }}
                  className={cn(
                    "h-8 min-w-11 rounded-md border px-2 text-xs font-medium transition-colors",
                    on ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {weekdayShort(d, locale)}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("sendDaysHint")}</p>
        </div>

        <Separator className="my-4" />
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{t("stopOnReply")}</Label>
            <p className="text-xs text-muted-foreground">{t("stopOnReplyDesc")}</p>
          </div>
          <Switch checked={settings.stop_on_reply} onCheckedChange={(v) => update("stop_on_reply", v)} />
        </div>
      </Card>

      {/* Owner notifications */}
      <Card className="gap-0 p-5">
        <div className="flex items-center gap-2">
          <BellIcon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">{t("notifications")}</Label>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("notificationsDesc")}</p>

        <div className="mt-4 space-y-4">
          {(
            [
              ["notify_owner_on_failure", "notifyFailure", "notifyFailureDesc"],
              ["notify_owner_on_reply", "notifyReply", "notifyReplyDesc"],
              ["notify_owner_on_send", "notifySend", "notifySendDesc"],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t(label)}</Label>
                <p className="text-xs text-muted-foreground">{t(desc)}</p>
              </div>
              <Switch checked={Boolean(settings[key])} onCheckedChange={(v) => update(key, v)} />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t("dailyDigest")}</Label>
              <p className="text-xs text-muted-foreground">{t("dailyDigestDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              {settings.daily_digest_enabled && (
                <Select value={String(settings.digest_hour)} onValueChange={(v) => update("digest_hour", parseInt(v))}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>{hourLabel(h, locale)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Switch checked={settings.daily_digest_enabled} onCheckedChange={(v) => update("daily_digest_enabled", v)} />
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />}
          {isSaving ? t("saving") : t("saveChanges")}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          {t("resetToDefaults")}
        </Button>
      </div>
    </div>
  )
}
