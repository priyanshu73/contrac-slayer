"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InfoIcon,
  SaveIcon,
  Loader2Icon,
  CalendarClockIcon,
  FileTextIcon,
  MoonIcon,
  BellIcon,
  PlusIcon,
  Trash2Icon,
  ClipboardListIcon,
  CalendarCheckIcon,
  RotateCcwIcon,
  CheckCircle2Icon,
  SmartphoneIcon,
  ClockIcon,
  ShieldCheckIcon,
  ZapIcon,
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
  /** Legacy prop; linking is now verified by backend token. */
  contractorId?: number
}

const MAX_STEPS = 5
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function hourLabel(h: number, locale: string): string {
  const d = new Date(2024, 0, 1, h, 0, 0)
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(d)
}

function weekdayShort(i: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    new Date(Date.UTC(2024, 0, 1 + i, 12)),
  )
}

function initialSteps(s: FollowupSettingsType): QuoteStep[] {
  if (Array.isArray(s.quote_sequence_json) && s.quote_sequence_json.length)
    return s.quote_sequence_json
  if (Array.isArray(s.quote_steps) && s.quote_steps.length) return s.quote_steps
  return [
    {
      day: s.followup_days_after_quote || 3,
      template: s.quote_followup_template || "",
    },
  ]
}

function initialIntakeSteps(s: FollowupSettingsType): IntakeStep[] {
  if (Array.isArray(s.intake_sequence_json) && s.intake_sequence_json.length)
    return s.intake_sequence_json
  if (Array.isArray(s.intake_steps) && s.intake_steps.length)
    return s.intake_steps
  return [
    {
      delay_minutes: 30,
      template:
        "Hi {first_name}, just following up to make sure you got the link to share your project details: {link}",
    },
    {
      delay_minutes: 120,
      template:
        "Hi {first_name}, we'd love to help with your project! Whenever you're ready, fill out the details here: {link}",
    },
  ]
}

function initialBookingSteps(s: FollowupSettingsType): BookingStep[] {
  if (Array.isArray(s.booking_sequence_json) && s.booking_sequence_json.length)
    return s.booking_sequence_json
  if (Array.isArray(s.booking_steps) && s.booking_steps.length)
    return s.booking_steps
  return [
    {
      delay_hours: 1,
      template:
        "Hi {first_name}, here is the link to pick a convenient time for your appointment: {booking_link}",
    },
    {
      delay_hours: 24,
      template:
        "Hi {first_name}, just checking in to see if you still wanted to schedule: {booking_link}",
    },
  ]
}

/** Interpolates template variables into realistic sample values for the live phone preview. */
function interpolatePreview(
  template: string,
  sampleVars: Record<string, string> = {
    customer_name: "Alex Morgan",
    first_name: "Alex",
    link: "contractorops.ai/u/p7k9",
    quote_link: "contractorops.ai/q/q82m",
    booking_link: "contractorops.ai/b/tim",
    sp_name: "Contractor AI",
    time: "Tomorrow at 10:00 AM",
    date: "Sep 15",
    datetime: "Sep 15 at 10:00 AM",
    business_name: "Contractor AI",
  },
): string {
  if (!template) return ""
  return template.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (_, key) => sampleVars[key] ?? `{${key}}`,
  )
}

export function FollowupSettings({
  contractorId: _contractorId,
}: FollowupSettingsProps) {
  const t = useTranslations("scheduling.settings")
  const locale = useLocale()
  const { toast } = useToast()

  const [settings, setSettings] = useState<FollowupSettingsType | null>(null)
  const [defaults, setDefaults] = useState<Partial<FollowupSettingsType>>({})
  const [contractorTz, setContractorTz] = useState<string | null>(null)
  const [steps, setSteps] = useState<QuoteStep[]>([])
  const [intakeSteps, setIntakeSteps] = useState<IntakeStep[]>([])
  const [bookingSteps, setBookingSteps] = useState<BookingStep[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notLinked, setNotLinked] = useState(false)

  // Navigation state
  const [mainSection, setMainSection] = useState<
    "sequences" | "schedule" | "notifications"
  >("sequences")
  const [activeSequence, setActiveSequence] = useState<
    "intake" | "quote" | "booking" | "reminders"
  >("intake")
  const [previewStepIndex, setPreviewStepIndex] = useState(0)

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setNotLinked(false)
      const data = await api.getFollowupSettings()
      setSettings(data.settings)
      setDefaults(data.defaults ?? {})
      setContractorTz(
        data.contractor_timezone ?? data.settings.timezone ?? null,
      )
      setSteps(initialSteps(data.settings))
      setIntakeSteps(initialIntakeSteps(data.settings))
      setBookingSteps(initialBookingSteps(data.settings))
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (/not linked|messaging service|contact not found/i.test(message)) {
        setSettings(null)
        setNotLinked(true)
      } else {
        toast({
          title: t("error"),
          description: message || t("loadFailedShort"),
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const update = <K extends keyof FollowupSettingsType>(
    key: K,
    value: FollowupSettingsType[K],
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const insertToken = (
    inputKey: string,
    token: string,
    onUpdate: (newVal: string) => void,
    currentVal: string,
  ) => {
    const el = textareaRefs.current.get(inputKey)
    const tokenStr = `{${token}}`
    if (!el) {
      onUpdate(currentVal ? `${currentVal} ${tokenStr}` : tokenStr)
      return
    }
    const start = el.selectionStart ?? currentVal.length
    const end = el.selectionEnd ?? currentVal.length
    const nextVal =
      currentVal.substring(0, start) + tokenStr + currentVal.substring(end)
    onUpdate(nextVal)
    setTimeout(() => {
      el.focus()
      const pos = start + tokenStr.length
      el.setSelectionRange(pos, pos)
    }, 0)
  }

  const handleSave = async () => {
    if (!settings) return

    // Validation
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].template.trim()) {
        toast({
          title: t("error"),
          description: t("stepTemplateRequired", { step: i + 1 }),
          variant: "destructive",
        })
        return
      }
      if (i > 0 && steps[i].day <= steps[i - 1].day) {
        toast({
          title: t("error"),
          description: t("stepDaysIncreasing"),
          variant: "destructive",
        })
        return
      }
    }
    if (settings.intake_followup_enabled) {
      for (let i = 0; i < intakeSteps.length; i++) {
        if (!intakeSteps[i].template.trim()) {
          toast({
            title: t("error"),
            description: t("stepTemplateRequired", { step: i + 1 }),
            variant: "destructive",
          })
          return
        }
        if (
          i > 0 &&
          intakeSteps[i].delay_minutes <= intakeSteps[i - 1].delay_minutes
        ) {
          toast({
            title: t("error"),
            description: t("stepMinutesIncreasing"),
            variant: "destructive",
          })
          return
        }
      }
    }
    if (settings.booking_followup_enabled) {
      for (let i = 0; i < bookingSteps.length; i++) {
        if (!bookingSteps[i].template.trim()) {
          toast({
            title: t("error"),
            description: t("stepTemplateRequired", { step: i + 1 }),
            variant: "destructive",
          })
          return
        }
        if (
          i > 0 &&
          bookingSteps[i].delay_hours <= bookingSteps[i - 1].delay_hours
        ) {
          toast({
            title: t("error"),
            description: t("stepHoursIncreasing"),
            variant: "destructive",
          })
          return
        }
      }
    }

    setIsSaving(true)
    try {
      const payload: FollowupSettingsUpdate = {
        automatic_followup_enabled: settings.automatic_followup_enabled,
        followup_days_before_appointment:
          settings.followup_days_before_appointment,
        followup_hours_before_appointment:
          settings.followup_hours_before_appointment,
        reminder_1day_template: settings.reminder_1day_template,
        reminder_1hour_template: settings.reminder_1hour_template,
        quote_sequence_json: steps.length ? steps : null,
        followup_days_after_quote:
          steps[0]?.day ?? settings.followup_days_after_quote ?? null,
        quote_followup_template:
          steps[0]?.template ?? settings.quote_followup_template,
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
      setContractorTz(
        data.contractor_timezone ?? data.settings.timezone ?? null,
      )
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
      Array.isArray(defaults.quote_sequence_json) &&
        defaults.quote_sequence_json.length
        ? defaults.quote_sequence_json
        : initialSteps(next),
    )
    setIntakeSteps(
      Array.isArray(defaults.intake_sequence_json) &&
        defaults.intake_sequence_json.length
        ? defaults.intake_sequence_json
        : initialIntakeSteps(next),
    )
    setBookingSteps(
      Array.isArray(defaults.booking_sequence_json) &&
        defaults.booking_sequence_json.length
        ? defaults.booking_sequence_json
        : initialBookingSteps(next),
    )
  }

  // Active preview message resolution
  const activePreviewData = useMemo(() => {
    if (!settings) return { title: "", text: "", timing: "" }
    if (activeSequence === "intake") {
      const step = intakeSteps[previewStepIndex] || intakeSteps[0]
      return {
        title: `Intake Step ${previewStepIndex + 1}`,
        timing: step ? `${step.delay_minutes}m after call` : "",
        text: step?.template || "",
      }
    }
    if (activeSequence === "quote") {
      const step = steps[previewStepIndex] || steps[0]
      return {
        title: `Quote Step ${previewStepIndex + 1}`,
        timing: step ? `Day ${step.day} after quote` : "",
        text: step?.template || "",
      }
    }
    if (activeSequence === "booking") {
      const step = bookingSteps[previewStepIndex] || bookingSteps[0]
      return {
        title: `Booking Step ${previewStepIndex + 1}`,
        timing: step ? `${step.delay_hours}h after link` : "",
        text: step?.template || "",
      }
    }
    if (activeSequence === "reminders") {
      return previewStepIndex === 0
        ? {
            title: "1-Day Reminder",
            timing: `${settings.followup_days_before_appointment} day before`,
            text: settings.reminder_1day_template || "",
          }
        : {
            title: "1-Hour Reminder",
            timing: `${settings.followup_hours_before_appointment}h before`,
            text: settings.reminder_1hour_template || "",
          }
    }
    return { title: "", text: "", timing: "" }
  }, [settings, activeSequence, previewStepIndex, intakeSteps, steps, bookingSteps])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2Icon className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading automations…</span>
      </div>
    )
  }

  if (notLinked) {
    return (
      <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
        <InfoIcon className="h-4 w-4 text-amber-600" />
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

  const isMasterEnabled = settings.automatic_followup_enabled
  const tzLabel = contractorTz || t("timezoneDefault")

  return (
    <div className="space-y-6">
      {/* ── Top Studio Control Header ── */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-5 shadow-xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Follow-up Automations
            </h2>
            {isMasterEnabled ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1.5 font-medium px-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground font-medium">
                Paused
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Automated SMS cadences sent from your ContractorOps number with quiet hours and instant pause on reply.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border bg-background/80 px-3.5 py-2 shadow-2xs">
            <Switch
              id="master-switch"
              checked={isMasterEnabled}
              onCheckedChange={(v) => update("automatic_followup_enabled", v)}
            />
            <Label htmlFor="master-switch" className="text-xs font-semibold cursor-pointer select-none">
              {t("autoFollowups")}
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="text-xs"
          >
            <RotateCcwIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            {t("resetToDefaults")}
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-medium shadow-2xs"
          >
            {isSaving ? (
              <Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <SaveIcon className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isSaving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </div>

      {/* ── Segmented Navigation Switcher ── */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border">
          <button
            type="button"
            onClick={() => setMainSection("sequences")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              mainSection === "sequences"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ZapIcon className="h-3.5 w-3.5 text-primary" />
            Cadence Sequences
          </button>
          <button
            type="button"
            onClick={() => setMainSection("schedule")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              mainSection === "schedule"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoonIcon className="h-3.5 w-3.5 text-amber-500" />
            Delivery & Quiet Hours
          </button>
          <button
            type="button"
            onClick={() => setMainSection("notifications")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              mainSection === "notifications"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BellIcon className="h-3.5 w-3.5 text-sky-500" />
            Owner Alerts & Digest
          </button>
        </div>

        <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>Active window: {hourLabel(settings.default_send_hour, locale)} · {tzLabel}</span>
        </div>
      </div>

      {/* ── TAB 1: CADENCE SEQUENCES ── */}
      {mainSection === "sequences" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Flow Selector & Timeline Builder */}
          <div className="space-y-5 lg:col-span-7 xl:col-span-8">
            {/* Horizontal Sequence Flow Pills */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setActiveSequence("intake")
                  setPreviewStepIndex(0)
                }}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                  activeSequence === "intake"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-2xs"
                    : "bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <ClipboardListIcon className={cn("h-4 w-4", activeSequence === "intake" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("h-2 w-2 rounded-full", settings.intake_followup_enabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="text-xs font-semibold mt-1">Call & Fill</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">Intake form follow-up</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSequence("quote")
                  setPreviewStepIndex(0)
                }}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                  activeSequence === "quote"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-2xs"
                    : "bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <FileTextIcon className={cn("h-4 w-4", activeSequence === "quote" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("h-2 w-2 rounded-full", isMasterEnabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="text-xs font-semibold mt-1">Quotes</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">Multi-day cadence</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSequence("booking")
                  setPreviewStepIndex(0)
                }}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                  activeSequence === "booking"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-2xs"
                    : "bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <CalendarCheckIcon className={cn("h-4 w-4", activeSequence === "booking" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("h-2 w-2 rounded-full", settings.booking_followup_enabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="text-xs font-semibold mt-1">Booking Link</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">Appointment scheduling</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSequence("reminders")
                  setPreviewStepIndex(0)
                }}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                  activeSequence === "reminders"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-2xs"
                    : "bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <CalendarClockIcon className={cn("h-4 w-4", activeSequence === "reminders" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("h-2 w-2 rounded-full", isMasterEnabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="text-xs font-semibold mt-1">Reminders</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">Before appointment</div>
              </button>
            </div>

            {/* Sequence Detail Card */}
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-2xs space-y-6">
              {/* Header with trigger description & sequence toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Workflow Pipeline
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeSequence === "intake" && "Trigger: Project upload link sent mid-call"}
                      {activeSequence === "quote" && "Trigger: Quote delivered to customer"}
                      {activeSequence === "booking" && "Trigger: Booking calendar link texted"}
                      {activeSequence === "reminders" && "Trigger: Scheduled calendar appointment"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeSequence === "intake" && t("intakeFollowup")}
                    {activeSequence === "quote" && t("quoteCadence")}
                    {activeSequence === "booking" && t("bookingFollowup")}
                    {activeSequence === "reminders" && t("appointmentReminders")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeSequence === "intake" && t("intakeFollowupDesc")}
                    {activeSequence === "quote" && t("quoteCadenceDesc")}
                    {activeSequence === "booking" && t("bookingFollowupDesc")}
                    {activeSequence === "reminders" && t("appointmentRemindersDesc")}
                  </p>
                </div>

                {activeSequence === "intake" && (
                  <div className="flex items-center gap-2 self-start sm:self-center bg-muted/30 px-3 py-1.5 rounded-xl border">
                    <Label htmlFor="intake-toggle" className="text-xs font-medium cursor-pointer">
                      {settings.intake_followup_enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="intake-toggle"
                      checked={settings.intake_followup_enabled}
                      onCheckedChange={(v) => update("intake_followup_enabled", v)}
                      disabled={!isMasterEnabled}
                    />
                  </div>
                )}

                {activeSequence === "booking" && (
                  <div className="flex items-center gap-2 self-start sm:self-center bg-muted/30 px-3 py-1.5 rounded-xl border">
                    <Label htmlFor="booking-toggle" className="text-xs font-medium cursor-pointer">
                      {settings.booking_followup_enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="booking-toggle"
                      checked={settings.booking_followup_enabled}
                      onCheckedChange={(v) => update("booking_followup_enabled", v)}
                      disabled={!isMasterEnabled}
                    />
                  </div>
                )}
              </div>

              {/* ── Timeline Rail: INTAKE SEQUENCE ── */}
              {activeSequence === "intake" && (
                <div className="relative pl-7 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-emerald-500/40 space-y-6">
                  {intakeSteps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "group relative rounded-xl border p-4 transition-all",
                        previewStepIndex === i
                          ? "border-primary/50 bg-primary/5 shadow-2xs ring-1 ring-primary/10"
                          : "bg-background hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                      onClick={() => setPreviewStepIndex(i)}
                    >
                      {/* Timeline Step Dot */}
                      <span className="absolute -left-[35px] top-4.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary text-[11px] font-bold text-primary shadow-2xs">
                        0{i + 1}
                      </span>

                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">Step {i + 1}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
                            <ClockIcon className="h-3 w-3" />
                            <span>Wait</span>
                            <Input
                              type="number"
                              min="5"
                              max="1440"
                              className="h-6 w-16 bg-background text-xs px-1 text-center font-medium"
                              value={step.delay_minutes}
                              disabled={!isMasterEnabled || !settings.intake_followup_enabled}
                              onChange={(e) => {
                                const delay_minutes = Math.max(1, parseInt(e.target.value) || 0)
                                setIntakeSteps((prev) =>
                                  prev.map((s, j) => (j === i ? { ...s, delay_minutes } : s)),
                                )
                              }}
                            />
                            <span>min after call</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors opacity-70 group-hover:opacity-100"
                          disabled={!isMasterEnabled || !settings.intake_followup_enabled || intakeSteps.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            setIntakeSteps((prev) => prev.filter((_, j) => j !== i))
                            if (previewStepIndex >= i && previewStepIndex > 0) {
                              setPreviewStepIndex(previewStepIndex - 1)
                            }
                          }}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Textarea
                        ref={(el) => {
                          if (el) textareaRefs.current.set(`intake_${i}`, el)
                          else textareaRefs.current.delete(`intake_${i}`)
                        }}
                        rows={2}
                        className="bg-background text-xs leading-relaxed resize-none font-normal"
                        value={step.template}
                        disabled={!isMasterEnabled || !settings.intake_followup_enabled}
                        placeholder={t("intakeTemplatePlaceholder")}
                        onChange={(e) => {
                          const template = e.target.value
                          setIntakeSteps((prev) =>
                            prev.map((s, j) => (j === i ? { ...s, template } : s)),
                          )
                        }}
                        onFocus={() => setPreviewStepIndex(i)}
                      />

                      {/* Clickable Variable Token Chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                        {["first_name", "link", "business_name"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              insertToken(
                                `intake_${i}`,
                                v,
                                (tVal) =>
                                  setIntakeSteps((prev) =>
                                    prev.map((s, j) => (j === i ? { ...s, template: tVal } : s)),
                                  ),
                                step.template,
                              )
                            }}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {`{${v}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add Step Action */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isMasterEnabled || !settings.intake_followup_enabled || intakeSteps.length >= MAX_STEPS}
                      onClick={() => {
                        const nextStep = {
                          delay_minutes: (intakeSteps[intakeSteps.length - 1]?.delay_minutes ?? 30) + 60,
                          template: intakeSteps[intakeSteps.length - 1]?.template ?? "",
                        }
                        setIntakeSteps((prev) => [...prev, nextStep])
                        setPreviewStepIndex(intakeSteps.length)
                      }}
                      className="text-xs h-8"
                    >
                      <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                      Add Step ({intakeSteps.length}/{MAX_STEPS})
                    </Button>
                  </div>

                  {/* Auto-Stop Terminal Milestone */}
                  <div className="relative rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="absolute -left-[35px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-emerald-500 text-emerald-600 shadow-2xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheckIcon className="h-3.5 w-3.5" /> Auto-Stop Condition
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        {t("intakeCadenceStops")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Timeline Rail: QUOTE SEQUENCE ── */}
              {activeSequence === "quote" && (
                <div className="relative pl-7 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-emerald-500/40 space-y-6">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "group relative rounded-xl border p-4 transition-all",
                        previewStepIndex === i
                          ? "border-primary/50 bg-primary/5 shadow-2xs ring-1 ring-primary/10"
                          : "bg-background hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                      onClick={() => setPreviewStepIndex(i)}
                    >
                      {/* Timeline Step Dot */}
                      <span className="absolute -left-[35px] top-4.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary text-[11px] font-bold text-primary shadow-2xs">
                        0{i + 1}
                      </span>

                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">Step {i + 1}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
                            <ClockIcon className="h-3 w-3" />
                            <span>Day</span>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              className="h-6 w-14 bg-background text-xs px-1 text-center font-medium"
                              value={step.day}
                              disabled={!isMasterEnabled}
                              onChange={(e) => {
                                const day = Math.max(0, parseInt(e.target.value) || 0)
                                setSteps((prev) =>
                                  prev.map((s, j) => (j === i ? { ...s, day } : s)),
                                )
                              }}
                            />
                            <span>after quote</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors opacity-70 group-hover:opacity-100"
                          disabled={!isMasterEnabled || steps.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSteps((prev) => prev.filter((_, j) => j !== i))
                            if (previewStepIndex >= i && previewStepIndex > 0) {
                              setPreviewStepIndex(previewStepIndex - 1)
                            }
                          }}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Textarea
                        ref={(el) => {
                          if (el) textareaRefs.current.set(`quote_${i}`, el)
                          else textareaRefs.current.delete(`quote_${i}`)
                        }}
                        rows={2}
                        className="bg-background text-xs leading-relaxed resize-none font-normal"
                        value={step.template}
                        disabled={!isMasterEnabled}
                        placeholder={t("quoteTemplatePlaceholder")}
                        onChange={(e) => {
                          const template = e.target.value
                          setSteps((prev) =>
                            prev.map((s, j) => (j === i ? { ...s, template } : s)),
                          )
                        }}
                        onFocus={() => setPreviewStepIndex(i)}
                      />

                      {/* Clickable Variable Token Chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                        {["customer_name", "quote_link", "sp_name"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              insertToken(
                                `quote_${i}`,
                                v,
                                (tVal) =>
                                  setSteps((prev) =>
                                    prev.map((s, j) => (j === i ? { ...s, template: tVal } : s)),
                                  ),
                                step.template,
                              )
                            }}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {`{${v}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add Step Action */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isMasterEnabled || steps.length >= MAX_STEPS}
                      onClick={() => {
                        const nextStep = {
                          day: (steps[steps.length - 1]?.day ?? 0) + 4,
                          template: steps[steps.length - 1]?.template ?? "",
                        }
                        setSteps((prev) => [...prev, nextStep])
                        setPreviewStepIndex(steps.length)
                      }}
                      className="text-xs h-8"
                    >
                      <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                      Add Step ({steps.length}/{MAX_STEPS})
                    </Button>
                  </div>

                  {/* Auto-Stop Terminal Milestone */}
                  <div className="relative rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="absolute -left-[35px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-emerald-500 text-emerald-600 shadow-2xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheckIcon className="h-3.5 w-3.5" /> Auto-Stop Condition
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        {t("cadenceStops")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Timeline Rail: BOOKING SEQUENCE ── */}
              {activeSequence === "booking" && (
                <div className="relative pl-7 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-emerald-500/40 space-y-6">
                  {bookingSteps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "group relative rounded-xl border p-4 transition-all",
                        previewStepIndex === i
                          ? "border-primary/50 bg-primary/5 shadow-2xs ring-1 ring-primary/10"
                          : "bg-background hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                      onClick={() => setPreviewStepIndex(i)}
                    >
                      {/* Timeline Step Dot */}
                      <span className="absolute -left-[35px] top-4.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary text-[11px] font-bold text-primary shadow-2xs">
                        0{i + 1}
                      </span>

                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">Step {i + 1}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
                            <ClockIcon className="h-3 w-3" />
                            <span>Wait</span>
                            <Input
                              type="number"
                              min="1"
                              max="168"
                              className="h-6 w-16 bg-background text-xs px-1 text-center font-medium"
                              value={step.delay_hours}
                              disabled={!isMasterEnabled || !settings.booking_followup_enabled}
                              onChange={(e) => {
                                const delay_hours = Math.max(1, parseInt(e.target.value) || 0)
                                setBookingSteps((prev) =>
                                  prev.map((s, j) => (j === i ? { ...s, delay_hours } : s)),
                                )
                              }}
                            />
                            <span>hours after link</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors opacity-70 group-hover:opacity-100"
                          disabled={!isMasterEnabled || !settings.booking_followup_enabled || bookingSteps.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            setBookingSteps((prev) => prev.filter((_, j) => j !== i))
                            if (previewStepIndex >= i && previewStepIndex > 0) {
                              setPreviewStepIndex(previewStepIndex - 1)
                            }
                          }}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Textarea
                        ref={(el) => {
                          if (el) textareaRefs.current.set(`booking_${i}`, el)
                          else textareaRefs.current.delete(`booking_${i}`)
                        }}
                        rows={2}
                        className="bg-background text-xs leading-relaxed resize-none font-normal"
                        value={step.template}
                        disabled={!isMasterEnabled || !settings.booking_followup_enabled}
                        placeholder={t("bookingTemplatePlaceholder")}
                        onChange={(e) => {
                          const template = e.target.value
                          setBookingSteps((prev) =>
                            prev.map((s, j) => (j === i ? { ...s, template } : s)),
                          )
                        }}
                        onFocus={() => setPreviewStepIndex(i)}
                      />

                      {/* Clickable Variable Token Chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                        {["first_name", "booking_link", "business_name"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              insertToken(
                                `booking_${i}`,
                                v,
                                (tVal) =>
                                  setBookingSteps((prev) =>
                                    prev.map((s, j) => (j === i ? { ...s, template: tVal } : s)),
                                  ),
                                step.template,
                              )
                            }}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {`{${v}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add Step Action */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isMasterEnabled || !settings.booking_followup_enabled || bookingSteps.length >= MAX_STEPS}
                      onClick={() => {
                        const nextStep = {
                          delay_hours: (bookingSteps[bookingSteps.length - 1]?.delay_hours ?? 1) + 24,
                          template: bookingSteps[bookingSteps.length - 1]?.template ?? "",
                        }
                        setBookingSteps((prev) => [...prev, nextStep])
                        setPreviewStepIndex(bookingSteps.length)
                      }}
                      className="text-xs h-8"
                    >
                      <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                      Add Step ({bookingSteps.length}/{MAX_STEPS})
                    </Button>
                  </div>

                  {/* Auto-Stop Terminal Milestone */}
                  <div className="relative rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="absolute -left-[35px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-emerald-500 text-emerald-600 shadow-2xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheckIcon className="h-3.5 w-3.5" /> Auto-Stop Condition
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        {t("bookingCadenceStops")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Timeline Rail: APPOINTMENT REMINDERS ── */}
              {activeSequence === "reminders" && (
                <div className="relative pl-7 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-emerald-500/40 space-y-6">
                  {/* Step 1: 1-Day Reminder */}
                  <div
                    className={cn(
                      "relative rounded-xl border p-4 transition-all",
                      previewStepIndex === 0
                        ? "border-primary/50 bg-primary/5 shadow-2xs ring-1 ring-primary/10"
                        : "bg-background hover:border-slate-300 dark:hover:border-slate-700",
                    )}
                    onClick={() => setPreviewStepIndex(0)}
                  >
                    <span className="absolute -left-[35px] top-4.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary text-[11px] font-bold text-primary shadow-2xs">
                      01
                    </span>

                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {t("template1day")}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            className="h-6 w-14 bg-background text-xs px-1 text-center font-medium"
                            value={settings.followup_days_before_appointment}
                            onChange={(e) =>
                              update(
                                "followup_days_before_appointment",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            disabled={!isMasterEnabled}
                          />
                          <span>days before</span>
                        </div>
                      </div>
                    </div>

                    <Textarea
                      ref={(el) => {
                        if (el) textareaRefs.current.set("remind_1day", el)
                        else textareaRefs.current.delete("remind_1day")
                      }}
                      rows={2}
                      className="bg-background text-xs leading-relaxed resize-none font-normal"
                      value={settings.reminder_1day_template ?? ""}
                      onChange={(e) =>
                        update("reminder_1day_template", e.target.value)
                      }
                      disabled={!isMasterEnabled}
                      placeholder={t("template1dayPlaceholder")}
                      onFocus={() => setPreviewStepIndex(0)}
                    />

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                      {["customer_name", "time", "date", "datetime", "sp_name"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            insertToken(
                              "remind_1day",
                              v,
                              (tVal) => update("reminder_1day_template", tVal),
                              settings.reminder_1day_template ?? "",
                            )
                          }}
                          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          + {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: 1-Hour Reminder */}
                  <div
                    className={cn(
                      "relative rounded-xl border p-4 transition-all",
                      previewStepIndex === 1
                        ? "border-primary/50 bg-primary/5 shadow-2xs ring-1 ring-primary/10"
                        : "bg-background hover:border-slate-300 dark:hover:border-slate-700",
                    )}
                    onClick={() => setPreviewStepIndex(1)}
                  >
                    <span className="absolute -left-[35px] top-4.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary text-[11px] font-bold text-primary shadow-2xs">
                      02
                    </span>

                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {t("template1hour")}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          <Input
                            type="number"
                            min="0"
                            max="72"
                            className="h-6 w-14 bg-background text-xs px-1 text-center font-medium"
                            value={settings.followup_hours_before_appointment}
                            onChange={(e) =>
                              update(
                                "followup_hours_before_appointment",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            disabled={!isMasterEnabled}
                          />
                          <span>hours before</span>
                        </div>
                      </div>
                    </div>

                    <Textarea
                      ref={(el) => {
                        if (el) textareaRefs.current.set("remind_1hour", el)
                        else textareaRefs.current.delete("remind_1hour")
                      }}
                      rows={2}
                      className="bg-background text-xs leading-relaxed resize-none font-normal"
                      value={settings.reminder_1hour_template ?? ""}
                      onChange={(e) =>
                        update("reminder_1hour_template", e.target.value)
                      }
                      disabled={!isMasterEnabled}
                      placeholder={t("template1hourPlaceholder")}
                      onFocus={() => setPreviewStepIndex(1)}
                    />

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground mr-1">Insert:</span>
                      {["customer_name", "time", "sp_name"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            insertToken(
                              "remind_1hour",
                              v,
                              (tVal) => update("reminder_1hour_template", tVal),
                              settings.reminder_1hour_template ?? "",
                            )
                          }}
                          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          + {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Milestone */}
                  <div className="relative rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="absolute -left-[35px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-emerald-500 text-emerald-600 shadow-2xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheckIcon className="h-3.5 w-3.5" /> Appointment Completion
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        Reminders stop automatically once the appointment starts or if the client cancels/reschedules.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Mobile SMS Preview Simulator */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-6 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <SmartphoneIcon className="h-3.5 w-3.5 text-primary" />
                  Live SMS Simulator
                </div>
                <Badge variant="outline" className="text-[10px] font-normal py-0">
                  {activePreviewData.title}
                </Badge>
              </div>

              {/* iPhone frame */}
              <div className="w-full max-w-sm mx-auto rounded-[38px] border-[6px] border-slate-800 dark:border-slate-700 bg-slate-900 shadow-xl overflow-hidden text-slate-100 flex flex-col">
                {/* Speaker notch */}
                <div className="h-6 w-full flex items-center justify-center pt-1 bg-slate-900">
                  <div className="h-4 w-28 bg-slate-950 rounded-full flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-900" />
                    <div className="h-1.5 w-7 rounded-full bg-slate-800" />
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-6 text-[10px] font-medium text-slate-400">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <div className="h-2.5 w-4 border border-slate-400 rounded-xs flex items-center p-0.5">
                      <div className="h-full w-2.5 bg-slate-400 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Recipient Header */}
                <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
                    CO
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-200">ContractorOps AI</div>
                    <div className="text-[10px] text-slate-400">Business SMS</div>
                  </div>
                </div>

                {/* Message Bubble Screen */}
                <div className="flex-1 bg-slate-950 p-4 space-y-3 min-h-[260px] flex flex-col justify-end">
                  <div className="text-center text-[10px] text-slate-500 font-medium">
                    {activePreviewData.timing ? `Scheduled: ${activePreviewData.timing}` : "Automated Follow-up"}
                  </div>

                  {/* Incoming text bubble */}
                  <div className="flex flex-col items-start gap-1 max-w-[85%]">
                    <div className="bg-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-xs leading-relaxed shadow-xs whitespace-pre-wrap">
                      {interpolatePreview(activePreviewData.text) || (
                        <span className="italic text-slate-400">
                          Type a template message in the editor to see it simulated here.
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 pl-1">Delivered via Twilio</span>
                  </div>

                  {/* Simulated reply interaction preview */}
                  <div className="flex flex-col items-end gap-1 max-w-[85%] self-end pt-1">
                    <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-2xl rounded-tr-xs shadow-2xs opacity-80">
                      Sounds good, checking it now!
                    </div>
                    <span className="text-[9px] text-emerald-400 pr-1 flex items-center gap-1">
                      <CheckCircle2Icon className="h-2.5 w-2.5" /> Auto-pauses cadence
                    </span>
                  </div>
                </div>

                {/* Bottom Home Indicator */}
                <div className="h-5 bg-slate-900 flex items-center justify-center">
                  <div className="h-1 w-28 bg-slate-600 rounded-full" />
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground px-4">
                Interpolates recipient tokens like <code className="text-[10px]">{`{first_name}`}</code> and <code className="text-[10px]">{`{link}`}</code> into real homeowner previews.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DELIVERY & QUIET HOURS ── */}
      {mainSection === "schedule" && (
        <div className="space-y-6 max-w-4xl">
          {/* Sending Window Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MoonIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("sendWindow")}</h3>
                <p className="text-xs text-muted-foreground">{t("sendWindowDesc")}</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">{t("sendHour")}</Label>
                <Select
                  value={String(settings.default_send_hour)}
                  onValueChange={(v) => update("default_send_hour", parseInt(v))}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {hourLabel(h, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Default hour when multi-day follow-up SMS are queued and dispatched.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">{t("timezone")}</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-xs font-medium text-foreground">
                  {tzLabel}
                </div>
                <p className="text-[11px] text-muted-foreground">{t("timezoneHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiet-start" className="text-xs font-semibold text-foreground">
                  {t("quietFrom")}
                </Label>
                <Input
                  id="quiet-start"
                  type="time"
                  className="h-9 bg-background text-xs"
                  value={settings.quiet_hours_start}
                  onChange={(e) => update("quiet_hours_start", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Evening cutoff: texts after this are held until morning.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiet-end" className="text-xs font-semibold text-foreground">
                  {t("quietTo")}
                </Label>
                <Input
                  id="quiet-end"
                  type="time"
                  className="h-9 bg-background text-xs"
                  value={settings.quiet_hours_end}
                  onChange={(e) => update("quiet_hours_end", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Morning release: held follow-ups resume sending.</p>
              </div>
            </div>

            {/* Visual 7-day pill strip */}
            <div className="space-y-2.5 pt-2 border-t">
              <Label className="text-xs font-semibold text-foreground">{t("sendDays")}</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 7 }, (_, i) => i).map((d) => {
                  const isSelected = settings.send_days?.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        const cur = new Set(settings.send_days ?? [])
                        if (cur.has(d)) {
                          if (cur.size === 1) return
                          cur.delete(d)
                        } else cur.add(d)
                        update("send_days", Array.from(cur).sort((a, b) => a - b))
                      }}
                      className={cn(
                        "h-9 min-w-12 rounded-xl border px-3 text-xs font-semibold transition-all shadow-2xs",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {weekdayShort(d, locale)}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">{t("sendDaysHint")}</p>
            </div>

            {/* Stop on reply switch */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-foreground">{t("stopOnReply")}</Label>
                <p className="text-xs text-muted-foreground">{t("stopOnReplyDesc")}</p>
              </div>
              <Switch
                checked={settings.stop_on_reply}
                onCheckedChange={(v) => update("stop_on_reply", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: OWNER ALERTS & DIGEST ── */}
      {mainSection === "notifications" && (
        <div className="space-y-6 max-w-4xl">
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <BellIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("notifications")}</h3>
                <p className="text-xs text-muted-foreground">{t("notificationsDesc")}</p>
              </div>
            </div>

            <div className="divide-y">
              {(
                [
                  ["notify_owner_on_failure", "notifyFailure", "notifyFailureDesc"],
                  ["notify_owner_on_reply", "notifyReply", "notifyReplyDesc"],
                  ["notify_owner_on_send", "notifySend", "notifySendDesc"],
                ] as const
              ).map(([key, label, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">{t(label)}</Label>
                    <p className="text-xs text-muted-foreground">{t(desc)}</p>
                  </div>
                  <Switch
                    checked={Boolean(settings[key])}
                    onCheckedChange={(v) => update(key, v)}
                  />
                </div>
              ))}

              {/* Daily Digest */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-foreground">{t("dailyDigest")}</Label>
                  <p className="text-xs text-muted-foreground">{t("dailyDigestDesc")}</p>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {settings.daily_digest_enabled && (
                    <Select
                      value={String(settings.digest_hour)}
                      onValueChange={(v) => update("digest_hour", parseInt(v))}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {hourLabel(h, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Switch
                    checked={settings.daily_digest_enabled}
                    onCheckedChange={(v) => update("daily_digest_enabled", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
