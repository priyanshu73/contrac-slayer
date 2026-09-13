"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
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
  ClipboardListIcon,
  CalendarCheckIcon,
  RotateCcwIcon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
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
  SequenceStep,
  DelayUnit,
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
  return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(
    new Date(Date.UTC(2024, 0, 1 + i, 12)),
  )
}

function normalizeStep(step: SequenceStep, defaultUnit: DelayUnit = "minutes"): SequenceStep {
  let val = step.delay_value
  let unit = step.delay_unit

  if (val === undefined || !unit) {
    if (step.delay_minutes !== undefined && step.delay_minutes !== null) {
      const m = step.delay_minutes
      if (m % 1440 === 0 && m > 0) {
        val = m / 1440
        unit = "days"
      } else if (m % 60 === 0 && m > 0) {
        val = m / 60
        unit = "hours"
      } else {
        val = m
        unit = "minutes"
      }
    } else if (step.delay_hours !== undefined && step.delay_hours !== null) {
      const h = step.delay_hours
      if (h % 24 === 0 && h > 0) {
        val = h / 24
        unit = "days"
      } else {
        val = h
        unit = "hours"
      }
    } else if (step.day !== undefined && step.day !== null) {
      val = step.day
      unit = "days"
    } else {
      val = 1
      unit = defaultUnit
    }
  }

  return {
    ...step,
    delay_value: val,
    delay_unit: unit,
  }
}

function stepToMinutes(step: SequenceStep): number {
  const val = step.delay_value ?? 1
  const unit = step.delay_unit ?? "minutes"
  if (unit === "minutes") return val
  if (unit === "hours") return val * 60
  return val * 1440
}

function formatStepBadge(step: SequenceStep): string {
  const val = step.delay_value ?? 1
  const unit = step.delay_unit ?? "minutes"
  const suffix = unit === "minutes" ? "m" : unit === "hours" ? "h" : "d"
  return `${val}${suffix}`
}

function initialSteps(s: FollowupSettingsType): QuoteStep[] {
  const raw = (Array.isArray(s.quote_sequence_json) && s.quote_sequence_json.length)
    ? s.quote_sequence_json
    : (Array.isArray(s.quote_steps) && s.quote_steps.length)
      ? s.quote_steps
      : [
          {
            day: s.followup_days_after_quote || 3,
            template: s.quote_followup_template || "Hi {first_name}, following up on your quote: {quote_link}",
          },
        ]
  return raw.map((step) => normalizeStep(step, "days"))
}

function initialIntakeSteps(s: FollowupSettingsType): IntakeStep[] {
  const raw = (Array.isArray(s.intake_sequence_json) && s.intake_sequence_json.length)
    ? s.intake_sequence_json
    : (Array.isArray(s.intake_steps) && s.intake_steps.length)
      ? s.intake_steps
      : [
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
  return raw.map((step) => normalizeStep(step, "minutes"))
}

function initialBookingSteps(s: FollowupSettingsType): BookingStep[] {
  const raw = (Array.isArray(s.booking_sequence_json) && s.booking_sequence_json.length)
    ? s.booking_sequence_json
    : (Array.isArray(s.booking_steps) && s.booking_steps.length)
      ? s.booking_steps
      : [
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
  return raw.map((step) => normalizeStep(step, "hours"))
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

  const [quoteEnabled, setQuoteEnabled] = useState(true)
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [reminder1Value, setReminder1Value] = useState(1)
  const [reminder1Unit, setReminder1Unit] = useState<"hours" | "days">("days")
  const [reminder2Value, setReminder2Value] = useState(2)
  const [reminder2Unit, setReminder2Unit] = useState<"hours" | "days">("hours")

  const [actionQueueAlert, setActionQueueAlert] = useState(true)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    intake: true,
    quote: false,
    booking: false,
    reminders: false,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notLinked, setNotLinked] = useState(false)

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
      const initialQuote = initialSteps(data.settings)
      setSteps(initialQuote)
      setQuoteEnabled(initialQuote.length > 0)
      setIntakeSteps(initialIntakeSteps(data.settings))
      setBookingSteps(initialBookingSteps(data.settings))

      if (data.settings.followup_days_before_appointment) {
        setReminder1Value(data.settings.followup_days_before_appointment)
        setReminder1Unit("days")
      }
      if (data.settings.followup_hours_before_appointment) {
        setReminder2Value(data.settings.followup_hours_before_appointment)
        setReminder2Unit("hours")
      }

      setRemindersEnabled(
        (data.settings.followup_days_before_appointment > 0 ||
          data.settings.followup_hours_before_appointment > 0) &&
          Boolean(data.settings.reminder_1day_template || data.settings.reminder_1hour_template)
      )
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

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!settings) return

    // Validate step sequences are increasing by total minutes
    if (quoteEnabled) {
      for (let i = 1; i < steps.length; i++) {
        if (stepToMinutes(steps[i]) <= stepToMinutes(steps[i - 1])) {
          toast({
            title: t("error"),
            description: "Quote follow-up steps must have strictly increasing delays.",
            variant: "destructive",
          })
          return
        }
      }
    }

    if (settings.intake_followup_enabled) {
      for (let i = 1; i < intakeSteps.length; i++) {
        if (stepToMinutes(intakeSteps[i]) <= stepToMinutes(intakeSteps[i - 1])) {
          toast({
            title: t("error"),
            description: "Intake follow-up steps must have strictly increasing delays.",
            variant: "destructive",
          })
          return
        }
      }
    }

    if (settings.booking_followup_enabled) {
      for (let i = 1; i < bookingSteps.length; i++) {
        if (stepToMinutes(bookingSteps[i]) <= stepToMinutes(bookingSteps[i - 1])) {
          toast({
            title: t("error"),
            description: "Booking follow-up steps must have strictly increasing delays.",
            variant: "destructive",
          })
          return
        }
      }
    }

    setIsSaving(true)
    try {
      const daysBeforeAppt = remindersEnabled
        ? reminder1Unit === "days"
          ? reminder1Value
          : Math.max(1, Math.round(reminder1Value / 24))
        : 0

      const hoursBeforeAppt = remindersEnabled
        ? reminder2Unit === "hours"
          ? reminder2Value
          : reminder2Value * 24
        : 0

      const payload: FollowupSettingsUpdate = {
        automatic_followup_enabled: settings.automatic_followup_enabled,
        followup_days_before_appointment: daysBeforeAppt,
        followup_hours_before_appointment: hoursBeforeAppt,
        reminder_1day_template: settings.reminder_1day_template,
        reminder_1hour_template: settings.reminder_1hour_template,
        quote_sequence_json: quoteEnabled && steps.length ? steps : null,
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
    const resetQuote =
      Array.isArray(defaults.quote_sequence_json) &&
      defaults.quote_sequence_json.length
        ? defaults.quote_sequence_json.map((s) => normalizeStep(s, "days"))
        : initialSteps(next)
    setSteps(resetQuote)
    setQuoteEnabled(resetQuote.length > 0)
    setIntakeSteps(
      Array.isArray(defaults.intake_sequence_json) &&
        defaults.intake_sequence_json.length
        ? defaults.intake_sequence_json.map((s) => normalizeStep(s, "minutes"))
        : initialIntakeSteps(next),
    )
    setBookingSteps(
      Array.isArray(defaults.booking_sequence_json) &&
        defaults.booking_sequence_json.length
        ? defaults.booking_sequence_json.map((s) => normalizeStep(s, "hours"))
        : initialBookingSteps(next),
    )
    setReminder1Value(defaults.followup_days_before_appointment || 1)
    setReminder1Unit("days")
    setReminder2Value(defaults.followup_hours_before_appointment || 2)
    setReminder2Unit("hours")
  }

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
        <InfoIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
    <div className="space-y-8 pb-16">
      {/* ── Header Control Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                isMasterEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {isMasterEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {isMasterEnabled ? "Running" : "Paused"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automatic follow-up timing and delivery schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <span className="text-xs font-medium text-muted-foreground">
              {isMasterEnabled ? "Automations On" : "Automations Off"}
            </span>
            <Switch
              checked={isMasterEnabled}
              onCheckedChange={(checked) =>
                update("automatic_followup_enabled", checked)
              }
              aria-label="Toggle All Automations"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="text-xs h-9 gap-1.5"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs h-9 gap-1.5"
          >
            {isSaving ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SaveIcon className="h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── Master Inactive Warning ── */}
      {!isMasterEnabled && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
          <InfoIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs">
            Automations are currently paused. Enable the master switch in the top right to start sending automatic messages.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Core Sequences Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Core Sequences
          </h2>
          <span className="text-xs text-muted-foreground">Step & Timing Cadence</span>
        </div>

        {/* Unified sleek container with dividing lines */}
        <div className="border border-border rounded-xl bg-card divide-y divide-border shadow-sm overflow-hidden">

          {/* ── 1. Intake Form Follow-up ── */}
          <div>
            <div
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => toggleExpand("intake")}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                  <FileTextIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">Intake Form Follow-up</h3>
                    <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                      {intakeSteps.length} steps · {intakeSteps.map(formatStepBadge).join(", ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Sent after call when link is shared. Auto-stops when caller fills the form.
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={settings.intake_followup_enabled && isMasterEnabled}
                  disabled={!isMasterEnabled}
                  onCheckedChange={(checked) =>
                    update("intake_followup_enabled", checked)
                  }
                  aria-label="Toggle Intake Follow-up"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={() => toggleExpand("intake")}
                >
                  <ChevronDownIcon
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      expanded.intake && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Inline Config: Step & Timing with Unit Selectors */}
            {expanded.intake && (
              <div className="p-4 bg-muted/25 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Send Delays</span>
                  <span>Auto-stops on form submission or STOP reply</span>
                </div>

                <div className="space-y-2">
                  {intakeSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-semibold w-14">
                          Step {idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">Send after</span>
                        <Input
                          type="number"
                          min={1}
                          max={step.delay_unit === "minutes" ? 10080 : step.delay_unit === "hours" ? 720 : 60}
                          value={step.delay_value ?? 1}
                          disabled={!isMasterEnabled || !settings.intake_followup_enabled}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1)
                            setIntakeSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_value: val,
                                      delay_minutes: s.delay_unit === "hours" ? val * 60 : s.delay_unit === "days" ? val * 1440 : val,
                                    }
                                  : s,
                              ),
                            )
                          }}
                          className="w-16 h-7 text-xs text-center font-medium"
                        />
                        <Select
                          value={step.delay_unit ?? "minutes"}
                          disabled={!isMasterEnabled || !settings.intake_followup_enabled}
                          onValueChange={(unit: DelayUnit) => {
                            setIntakeSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_unit: unit,
                                      delay_minutes: unit === "hours" ? (s.delay_value || 1) * 60 : unit === "days" ? (s.delay_value || 1) * 1440 : (s.delay_value || 1),
                                    }
                                  : s,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes" className="text-xs">minutes</SelectItem>
                            <SelectItem value="hours" className="text-xs">hours</SelectItem>
                            <SelectItem value="days" className="text-xs">days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {intakeSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setIntakeSteps((prev) =>
                              prev.filter((_, j) => j !== idx),
                            )
                          }
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {intakeSteps.length < MAX_STEPS && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    disabled={!isMasterEnabled || !settings.intake_followup_enabled}
                    onClick={() => {
                      const last = intakeSteps[intakeSteps.length - 1]
                      const nextDelay = last ? (last.delay_value || 1) + 1 : 1
                      const nextUnit = last?.delay_unit || "hours"
                      setIntakeSteps((prev) => [
                        ...prev,
                        {
                          delay_value: nextDelay,
                          delay_unit: nextUnit,
                          delay_minutes: nextUnit === "hours" ? nextDelay * 60 : nextUnit === "days" ? nextDelay * 1440 : nextDelay,
                          template:
                            "Hi {first_name}, just checking in to see if you still needed help with your project: {link}",
                        },
                      ])
                    }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Step
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── 2. Sent Quote Follow-up ── */}
          <div>
            <div
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => toggleExpand("quote")}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                  <ClipboardListIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">Sent Quote Follow-up</h3>
                    <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                      {steps.length} steps · {steps.map(formatStepBadge).join(", ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Sent after estimate is delivered. Auto-stops when quote is accepted or rejected.
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={quoteEnabled && isMasterEnabled}
                  disabled={!isMasterEnabled}
                  onCheckedChange={(checked) => setQuoteEnabled(checked)}
                  aria-label="Toggle Quote Follow-up"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={() => toggleExpand("quote")}
                >
                  <ChevronDownIcon
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      expanded.quote && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Inline Config: Step & Timing with Unit Selectors */}
            {expanded.quote && (
              <div className="p-4 bg-muted/25 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Send Delays</span>
                  <span>Auto-stops on customer response or approval</span>
                </div>

                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-semibold w-14">
                          Step {idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">Send after</span>
                        <Input
                          type="number"
                          min={1}
                          max={step.delay_unit === "minutes" ? 10080 : step.delay_unit === "hours" ? 720 : 60}
                          value={step.delay_value ?? 1}
                          disabled={!isMasterEnabled || !quoteEnabled}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1)
                            setSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_value: val,
                                      day: s.delay_unit === "days" ? val : Math.max(1, Math.round(val / 24)),
                                    }
                                  : s,
                              ),
                            )
                          }}
                          className="w-16 h-7 text-xs text-center font-medium"
                        />
                        <Select
                          value={step.delay_unit ?? "days"}
                          disabled={!isMasterEnabled || !quoteEnabled}
                          onValueChange={(unit: DelayUnit) => {
                            setSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_unit: unit,
                                      day: unit === "days" ? (s.delay_value || 1) : Math.max(1, Math.round((s.delay_value || 1) / 24)),
                                    }
                                  : s,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes" className="text-xs">minutes</SelectItem>
                            <SelectItem value="hours" className="text-xs">hours</SelectItem>
                            <SelectItem value="days" className="text-xs">days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {steps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setSteps((prev) => prev.filter((_, j) => j !== idx))
                          }
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {steps.length < MAX_STEPS && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    disabled={!isMasterEnabled || !quoteEnabled}
                    onClick={() => {
                      const last = steps[steps.length - 1]
                      const nextDelay = last ? (last.delay_value || 1) + 2 : 3
                      const nextUnit = last?.delay_unit || "days"
                      setSteps((prev) => [
                        ...prev,
                        {
                          delay_value: nextDelay,
                          delay_unit: nextUnit,
                          day: nextUnit === "days" ? nextDelay : Math.max(1, Math.round(nextDelay / 24)),
                          template:
                            "Hi {first_name}, just following up on your quote. Let us know if you have any questions: {quote_link}",
                        },
                      ])
                    }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Step
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── 3. Sent Booking Link Follow-up ── */}
          <div>
            <div
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => toggleExpand("booking")}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/50 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <CalendarClockIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">Sent Booking Link Follow-up</h3>
                    <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                      {bookingSteps.length} steps · {bookingSteps.map(formatStepBadge).join(", ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Sent after scheduling link is sent. Auto-stops when appointment is booked.
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={settings.booking_followup_enabled && isMasterEnabled}
                  disabled={!isMasterEnabled}
                  onCheckedChange={(checked) =>
                    update("booking_followup_enabled", checked)
                  }
                  aria-label="Toggle Booking Link Follow-up"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={() => toggleExpand("booking")}
                >
                  <ChevronDownIcon
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      expanded.booking && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Inline Config: Step & Timing with Unit Selectors */}
            {expanded.booking && (
              <div className="p-4 bg-muted/25 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Send Delays</span>
                  <span>Auto-stops when appointment is scheduled</span>
                </div>

                <div className="space-y-2">
                  {bookingSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-semibold w-14">
                          Step {idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">Send after</span>
                        <Input
                          type="number"
                          min={1}
                          max={step.delay_unit === "minutes" ? 10080 : step.delay_unit === "hours" ? 720 : 60}
                          value={step.delay_value ?? 1}
                          disabled={!isMasterEnabled || !settings.booking_followup_enabled}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1)
                            setBookingSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_value: val,
                                      delay_hours: s.delay_unit === "days" ? val * 24 : s.delay_unit === "minutes" ? Math.max(1, Math.round(val / 60)) : val,
                                    }
                                  : s,
                              ),
                            )
                          }}
                          className="w-16 h-7 text-xs text-center font-medium"
                        />
                        <Select
                          value={step.delay_unit ?? "hours"}
                          disabled={!isMasterEnabled || !settings.booking_followup_enabled}
                          onValueChange={(unit: DelayUnit) => {
                            setBookingSteps((prev) =>
                              prev.map((s, j) =>
                                j === idx
                                  ? {
                                      ...s,
                                      delay_unit: unit,
                                      delay_hours: unit === "days" ? (s.delay_value || 1) * 24 : unit === "minutes" ? Math.max(1, Math.round((s.delay_value || 1) / 60)) : (s.delay_value || 1),
                                    }
                                  : s,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes" className="text-xs">minutes</SelectItem>
                            <SelectItem value="hours" className="text-xs">hours</SelectItem>
                            <SelectItem value="days" className="text-xs">days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bookingSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setBookingSteps((prev) =>
                              prev.filter((_, j) => j !== idx),
                            )
                          }
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {bookingSteps.length < MAX_STEPS && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    disabled={!isMasterEnabled || !settings.booking_followup_enabled}
                    onClick={() => {
                      const last = bookingSteps[bookingSteps.length - 1]
                      const nextDelay = last ? (last.delay_value || 1) + 1 : 1
                      const nextUnit = last?.delay_unit || "days"
                      setBookingSteps((prev) => [
                        ...prev,
                        {
                          delay_value: nextDelay,
                          delay_unit: nextUnit,
                          delay_hours: nextUnit === "days" ? nextDelay * 24 : nextDelay,
                          template:
                            "Hi {first_name}, just wanted to remind you about scheduling before slots fill up: {booking_link}",
                        },
                      ])
                    }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Step
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── 4. Appointment Reminders ── */}
          <div>
            <div
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => toggleExpand("reminders")}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                  <CalendarCheckIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">Appointment Reminders</h3>
                    <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                      2 reminders · {reminder1Value}{reminder1Unit === "days" ? "d" : "h"}, {reminder2Value}{reminder2Unit === "days" ? "d" : "h"} before
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Sent to customer before confirmed site visits or consultation appointments.
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={remindersEnabled && isMasterEnabled}
                  disabled={!isMasterEnabled}
                  onCheckedChange={(checked) => setRemindersEnabled(checked)}
                  aria-label="Toggle Appointment Reminders"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={() => toggleExpand("reminders")}
                >
                  <ChevronDownIcon
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      expanded.reminders && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Inline Config: Reminder Delays with Unit Selectors */}
            {expanded.reminders && (
              <div className="p-4 bg-muted/25 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Reminder Delays</span>
                  <span>Sent prior to appointment start time</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-semibold w-24">Reminder 1</span>
                      <span className="text-xs text-muted-foreground">Send</span>
                      <Input
                        type="number"
                        min={1}
                        max={reminder1Unit === "days" ? 14 : 336}
                        value={reminder1Value}
                        disabled={!isMasterEnabled || !remindersEnabled}
                        onChange={(e) => setReminder1Value(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 h-7 text-xs text-center font-medium"
                      />
                      <Select
                        value={reminder1Unit}
                        disabled={!isMasterEnabled || !remindersEnabled}
                        onValueChange={(u: "hours" | "days") => setReminder1Unit(u)}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours" className="text-xs">hours</SelectItem>
                          <SelectItem value="days" className="text-xs">days</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">before appointment</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-semibold w-24">Reminder 2</span>
                      <span className="text-xs text-muted-foreground">Send</span>
                      <Input
                        type="number"
                        min={1}
                        max={reminder2Unit === "days" ? 7 : 72}
                        value={reminder2Value}
                        disabled={!isMasterEnabled || !remindersEnabled}
                        onChange={(e) => setReminder2Value(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 h-7 text-xs text-center font-medium"
                      />
                      <Select
                        value={reminder2Unit}
                        disabled={!isMasterEnabled || !remindersEnabled}
                        onValueChange={(u: "hours" | "days") => setReminder2Unit(u)}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours" className="text-xs">hours</SelectItem>
                          <SelectItem value="days" className="text-xs">days</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">before appointment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Delivery Schedule & Notifications Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Delivery & Quiet Hours */}
        <div className="border border-border rounded-xl p-5 bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Hours
            </h3>
            <span className="text-xs text-muted-foreground">{tzLabel}</span>
          </div>

          <div className="space-y-4">
            {/* Sending Days */}
            <div>
              <Label className="text-xs text-muted-foreground block mb-2 font-normal">
                Active Sending Days
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: 7 }, (_, i) => {
                  const active = settings.send_days.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isMasterEnabled}
                      onClick={() => {
                        const next = active
                          ? settings.send_days.filter((d) => d !== i)
                          : [...settings.send_days, i].sort((a, b) => a - b)
                        if (next.length > 0) update("send_days", next)
                      }}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-medium transition-colors border",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                      )}
                    >
                      {weekdayShort(i, locale)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-2 pt-1 border-t border-border">
              <Label className="text-xs text-muted-foreground block font-normal">
                Quiet Hours (Messages held until window opens)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={settings.quiet_hours_start}
                  disabled={!isMasterEnabled}
                  onChange={(e) => update("quiet_hours_start", e.target.value)}
                  className="w-28 h-8 text-xs font-medium"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={settings.quiet_hours_end}
                  disabled={!isMasterEnabled}
                  onChange={(e) => update("quiet_hours_end", e.target.value)}
                  className="w-28 h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Default Send Hour */}
            <div className="space-y-1.5 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-normal">
                  Standard Daily Send Hour
                </Label>
                <Select
                  value={String(settings.default_send_hour)}
                  disabled={!isMasterEnabled}
                  onValueChange={(val) => update("default_send_hour", Number(val))}
                >
                  <SelectTrigger className="w-28 h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)} className="text-xs">
                        {hourLabel(h, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Actions */}
        <div className="border border-border rounded-xl p-5 bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alerts & Actions
            </h3>
          </div>

          <div className="space-y-3.5 divide-y divide-border text-xs">
            {/* Action Queue Alert Card */}
            <div className="flex items-center justify-between pt-1 gap-3">
              <div>
                <span className="font-medium block">Action Queue Alert Card</span>
                <span className="text-muted-foreground text-[11px]">
                  Prompt you to call if intake sequence finishes without form submission
                </span>
              </div>
              <Switch
                checked={actionQueueAlert && isMasterEnabled}
                disabled={!isMasterEnabled}
                onCheckedChange={(checked) => setActionQueueAlert(checked)}
                aria-label="Toggle Action Queue Alert"
              />
            </div>

            {/* Stop & Notify on Reply */}
            <div className="flex items-center justify-between pt-3 gap-3">
              <div>
                <span className="font-medium block">Notify on Customer Reply</span>
                <span className="text-muted-foreground text-[11px]">
                  Immediate notification when a recipient replies to any follow-up
                </span>
              </div>
              <Switch
                checked={settings.notify_owner_on_reply && isMasterEnabled}
                disabled={!isMasterEnabled}
                onCheckedChange={(checked) => update("notify_owner_on_reply", checked)}
                aria-label="Toggle Notify on Reply"
              />
            </div>

            {/* Alert on Failure */}
            <div className="flex items-center justify-between pt-3 gap-3">
              <div>
                <span className="font-medium block">Alert on Delivery Failure</span>
                <span className="text-muted-foreground text-[11px]">
                  Receive an alert if an SMS fails carrier delivery
                </span>
              </div>
              <Switch
                checked={settings.notify_owner_on_failure && isMasterEnabled}
                disabled={!isMasterEnabled}
                onCheckedChange={(checked) => update("notify_owner_on_failure", checked)}
                aria-label="Toggle Alert on Failure"
              />
            </div>

            {/* Daily Digest */}
            <div className="flex items-center justify-between pt-3 gap-3">
              <div>
                <span className="font-medium block">Daily Morning Digest</span>
                <span className="text-muted-foreground text-[11px]">
                  Summary at {hourLabel(settings.digest_hour || 8, locale)} of pending responses and sent follow-ups
                </span>
              </div>
              <Switch
                checked={settings.daily_digest_enabled && isMasterEnabled}
                disabled={!isMasterEnabled}
                onCheckedChange={(checked) => update("daily_digest_enabled", checked)}
                aria-label="Toggle Daily Digest"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
