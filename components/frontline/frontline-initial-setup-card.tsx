"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Mic2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

type Props = {
  onComplete: () => void
  onError?: (message: string) => void
}

type Phase = "voice" | "fields" | "saving" | "success"

const OPERATOR_OPTIONS = [
  { name: "Henry", voiceId: "matthew", label: "Male" },
  { name: "Jane", voiceId: "tiffany", label: "Female" },
] as const

const COMMON_INTAKE_FIELDS = [
  "Name",
  "Callback number",
  "Service address",
  "Issue description",
  "Urgency / timeline",
]

const COMMON_ESCALATION_TRIGGERS = [
  "Caller asks for owner or manager",
  "Pricing dispute",
  "Angry or frustrated caller",
  "Emergency or urgent situation",
  "Question I can't answer",
]

type CoreFields = {
  business_name: string
  services_offered: string
  services_not_offered: string
  service_area: string
  hours_regular: string
  hours_after_hours: string
  hours_emergency: string
  free_estimates: boolean | null
  callout_fee: string
  rate_info: string
  booking_behavior: string
  intake_fields: string[]
  escalation_when: string[]
  escalation_number: string
}

const EMPTY_FIELDS: CoreFields = {
  business_name: "",
  services_offered: "",
  services_not_offered: "",
  service_area: "",
  hours_regular: "",
  hours_after_hours: "",
  hours_emergency: "",
  free_estimates: null,
  callout_fee: "",
  rate_info: "",
  booking_behavior: "",
  intake_fields: ["Name", "Callback number", "Service address", "Issue description"],
  escalation_when: ["Caller asks for owner or manager", "Angry or frustrated caller", "Emergency or urgent situation"],
  escalation_number: "",
}

function prefillFromApiFields(apiFields: Record<string, any>): CoreFields {
  const hours = apiFields.hours || {}
  const pricing = apiFields.pricing_basics || {}
  const escalation = apiFields.escalation || {}
  const services = apiFields.services_offered
  const notOffered = apiFields.services_not_offered
  const intakeFields = apiFields.intake_fields
  const escalationWhen = escalation.when

  return {
    business_name: apiFields.business_name || "",
    services_offered: Array.isArray(services) ? services.join(", ") : (services || ""),
    services_not_offered: Array.isArray(notOffered) ? notOffered.join(", ") : (notOffered || ""),
    service_area: apiFields.service_area || "",
    hours_regular: hours.regular || "",
    hours_after_hours: hours.after_hours || "",
    hours_emergency: hours.emergency || "",
    free_estimates: pricing.free_estimates ?? null,
    callout_fee: pricing.callout_fee || "",
    rate_info: pricing.rate_info || "",
    booking_behavior: apiFields.booking_behavior || "",
    intake_fields: Array.isArray(intakeFields) ? intakeFields : EMPTY_FIELDS.intake_fields,
    escalation_when: Array.isArray(escalationWhen) ? escalationWhen : EMPTY_FIELDS.escalation_when,
    escalation_number: escalation.number || "",
  }
}

function buildApiPayload(fields: CoreFields, operatorName: string, voiceId: string) {
  return {
    business_name: fields.business_name.trim(),
    services_offered: fields.services_offered.split(",").map(s => s.trim()).filter(Boolean),
    services_not_offered: fields.services_not_offered.split(",").map(s => s.trim()).filter(Boolean),
    service_area: fields.service_area.trim(),
    hours: {
      regular: fields.hours_regular.trim(),
      after_hours: fields.hours_after_hours.trim(),
      emergency: fields.hours_emergency.trim(),
    },
    pricing_basics: {
      free_estimates: fields.free_estimates,
      callout_fee: fields.callout_fee.trim() || null,
      rate_info: fields.rate_info.trim() || null,
    },
    booking_behavior: fields.booking_behavior.trim(),
    intake_fields: fields.intake_fields,
    escalation: {
      when: fields.escalation_when,
      number: fields.escalation_number.trim(),
    },
    operator_display_name: operatorName,
    operator_voice_id: voiceId,
  }
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgb(15_17_21/0.04)]">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-medium text-zinc-800">{label}</Label>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
      {children}
    </div>
  )
}

function CheckPill({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-3 py-1 text-[12px] font-medium transition",
        checked
          ? "border-zinc-800 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
      )}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FrontlineInitialSetupCard({ onComplete, onError }: Props) {
  const [phase, setPhase] = useState<Phase>("voice")
  const [prefilling, setPrefilling] = useState(false)
  const [operator, setOperator] = useState<(typeof OPERATOR_OPTIONS)[number]>(OPERATOR_OPTIONS[0])
  const [fields, setFields] = useState<CoreFields>(EMPTY_FIELDS)

  const set = (key: keyof CoreFields, value: any) =>
    setFields(prev => ({ ...prev, [key]: value }))

  const toggleList = (key: "intake_fields" | "escalation_when", item: string) => {
    setFields(prev => {
      const list = prev[key] as string[]
      return {
        ...prev,
        [key]: list.includes(item) ? list.filter(i => i !== item) : [...list, item],
      }
    })
  }

  const goToFields = async () => {
    setPrefilling(true)
    try {
      const data = await api.prefillFrontlineCoreFields()
      setFields(prefillFromApiFields(data.core_fields))
    } catch {
      // prefill failed — start with empty fields, not a blocker
    } finally {
      setPrefilling(false)
      setPhase("fields")
    }
  }

  const save = async () => {
    if (!fields.business_name.trim()) {
      onError?.("Business name is required.")
      return
    }
    try {
      setPhase("saving")
      // First update operator identity on settings
      await api.updateFrontlineSettings({
        operator_display_name: operator.name,
        operator_voice_id: operator.voiceId,
      })
      // Then save core fields (triggers system prompt generation)
      await api.saveFrontlineCoreFields(buildApiPayload(fields, operator.name, operator.voiceId))
      setPhase("success")
      window.setTimeout(() => onComplete(), 1400)
    } catch (err) {
      setPhase("fields")
      onError?.(err instanceof Error ? err.message : "Unable to save setup.")
    }
  }

  if (phase === "success") {
    return (
      <div className="overflow-hidden rounded-[1.25rem] border border-emerald-200 bg-white shadow-sm">
        <div className="flex animate-in slide-in-from-bottom-3 fade-in flex-col items-center px-6 py-12 duration-500">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">Operator configured</h2>
          <p className="mt-2 max-w-sm text-center text-sm leading-6 text-slate-600">
            {operator.name} is ready. You can refine the knowledge base anytime.
          </p>
        </div>
      </div>
    )
  }

  if (phase === "voice") {
    return (
      <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
            Set up your AI operator
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Pick a voice first, then we&apos;ll ask a few quick questions so the operator knows your business.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {OPERATOR_OPTIONS.map((option) => {
              const active = operator.voiceId === option.voiceId
              return (
                <button
                  key={option.voiceId}
                  type="button"
                  onClick={() => setOperator(option)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white",
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-white/15 text-white" : "bg-white text-slate-600")}>
                    <Mic2 className="h-4 w-4" />
                  </span>
                  <span className="mt-3 block text-sm font-semibold">{option.name}</span>
                  <span className={cn("mt-1 block text-xs", active ? "text-slate-200" : "text-slate-500")}>
                    {option.label} operator voice
                  </span>
                </button>
              )
            })}
          </div>

          <Button
            onClick={() => void goToFields()}
            disabled={prefilling}
            className="mt-8 min-w-[220px] gap-2 rounded-full bg-slate-950 px-8 py-6 text-sm font-medium text-white hover:bg-slate-800"
          >
            {prefilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing questions…
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ─── Fields form ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setPhase("voice")}
          className="text-[12px] text-zinc-400 hover:text-zinc-700"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Mic2 className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-zinc-900">{operator.name}</span>
          <span className="text-[12px] text-zinc-400">· {operator.label} voice</span>
        </div>
      </div>

      {/* Business basics */}
      <Section title="Business">
        <Field label="What's your business name?" hint="This is what the operator will say to callers.">
          <Input
            value={fields.business_name}
            onChange={e => set("business_name", e.target.value)}
            placeholder="e.g. Valley Landscaping"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="What services do you offer?" hint="Separate with commas.">
          <Input
            value={fields.services_offered}
            onChange={e => set("services_offered", e.target.value)}
            placeholder="e.g. Tree removal, irrigation, grading, patios"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="Anything you explicitly don't do?" hint="Optional — helps the operator decline confidently.">
          <Input
            value={fields.services_not_offered}
            onChange={e => set("services_not_offered", e.target.value)}
            placeholder="e.g. Roofing, electrical, plumbing"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="Where do you work?">
          <Input
            value={fields.service_area}
            onChange={e => set("service_area", e.target.value)}
            placeholder="e.g. Gettysburg PA and within 50 miles"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
      </Section>

      {/* Hours */}
      <Section title="Hours">
        <Field label="Regular business hours">
          <Input
            value={fields.hours_regular}
            onChange={e => set("hours_regular", e.target.value)}
            placeholder="e.g. Mon–Fri 8am–5pm, Sat 9am–2pm"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="After-hours policy">
          <Input
            value={fields.hours_after_hours}
            onChange={e => set("hours_after_hours", e.target.value)}
            placeholder="e.g. Leave a message, we call back next morning"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="Emergency availability">
          <Input
            value={fields.hours_emergency}
            onChange={e => set("hours_emergency", e.target.value)}
            placeholder="e.g. No emergency service, or Call owner directly"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <Field label="Do you offer free estimates?">
          <div className="flex gap-2">
            {([true, false, null] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => set("free_estimates", v)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition",
                  fields.free_estimates === v
                    ? "border-zinc-800 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
                )}
              >
                {v === null ? "Not sure" : v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Callout / diagnostic fee" hint="Leave blank if none.">
          <Input
            value={fields.callout_fee}
            onChange={e => set("callout_fee", e.target.value)}
            placeholder="e.g. $75 service call fee"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
        <Field label="General rate info" hint="Ranges are fine — the operator won't quote exact prices.">
          <Input
            value={fields.rate_info}
            onChange={e => set("rate_info", e.target.value)}
            placeholder="e.g. $85–150/hr depending on job, or pricing varies by project"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
      </Section>

      {/* Booking */}
      <Section title="Booking">
        <Field label="How should the operator handle booking requests?">
          <Input
            value={fields.booking_behavior}
            onChange={e => set("booking_behavior", e.target.value)}
            placeholder="e.g. Collect details and owner will call back, or Text the booking link"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
      </Section>

      {/* What to collect */}
      <Section title="What to collect from callers">
        <div className="flex flex-wrap gap-2">
          {COMMON_INTAKE_FIELDS.map(item => (
            <CheckPill
              key={item}
              label={item}
              checked={fields.intake_fields.includes(item)}
              onChange={() => toggleList("intake_fields", item)}
            />
          ))}
        </div>
      </Section>

      {/* Escalation */}
      <Section title="Escalation">
        <Field label="When should the operator transfer to you?">
          <div className="flex flex-wrap gap-2">
            {COMMON_ESCALATION_TRIGGERS.map(item => (
              <CheckPill
                key={item}
                label={item}
                checked={fields.escalation_when.includes(item)}
                onChange={() => toggleList("escalation_when", item)}
              />
            ))}
          </div>
        </Field>
        <Field label="Your phone number for transfers" hint="Leave blank if not using live transfer.">
          <Input
            value={fields.escalation_number}
            onChange={e => set("escalation_number", e.target.value)}
            placeholder="e.g. +1 555 123 4567"
            className="h-10 border-zinc-200 text-[13px]"
          />
        </Field>
      </Section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 px-1 pb-2 pt-1">
        <Button
          onClick={() => void save()}
          disabled={phase === "saving" || !fields.business_name.trim()}
          className="gap-2 rounded-full bg-zinc-900 px-6 text-[13px] text-white hover:bg-zinc-800"
        >
          {phase === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Finish setup
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
