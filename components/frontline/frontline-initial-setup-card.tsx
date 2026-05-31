"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, Mic2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

type Props = {
  onComplete: () => void
  onError?: (message: string) => void
}

const OPERATOR_OPTIONS = [
  { name: "Henry", voiceId: "matthew", label: "Male" },
  { name: "Jane", voiceId: "tiffany", label: "Female" },
] as const

type OperatorOption = (typeof OPERATOR_OPTIONS)[number]

const INTAKE_OPTIONS = [
  "Name",
  "Callback number",
  "Service address",
  "Issue description",
  "Urgency / timeline",
]

const ESCALATION_OPTIONS = [
  "Caller asks for owner",
  "Pricing dispute",
  "Angry caller",
  "Emergency",
  "Question I can't answer",
]

type CoreFields = {
  business_name: string
  services_offered: string
  services_not_offered: string
  service_area: string
  hours_regular: string
  hours_after_hours: string
  free_estimates: boolean | null
  callout_fee: string
  rate_info: string
  booking_behavior: string
  intake_fields: string[]
  escalation_when: string[]
  escalation_number: string
}

const DEFAULTS: CoreFields = {
  business_name: "",
  services_offered: "",
  services_not_offered: "",
  service_area: "",
  hours_regular: "",
  hours_after_hours: "",
  free_estimates: null,
  callout_fee: "",
  rate_info: "",
  booking_behavior: "",
  intake_fields: ["Name", "Callback number", "Service address", "Issue description"],
  escalation_when: ["Caller asks for owner", "Angry caller", "Emergency"],
  escalation_number: "",
}

function prefillFromApi(data: Record<string, any>): CoreFields {
  const hours = data.hours || {}
  const pricing = data.pricing_basics || {}
  const escalation = data.escalation || {}
  const toStr = (v: any) => Array.isArray(v) ? v.join(", ") : (v || "")
  return {
    business_name: data.business_name || "",
    services_offered: toStr(data.services_offered),
    services_not_offered: toStr(data.services_not_offered),
    service_area: data.service_area || "",
    hours_regular: hours.regular || "",
    hours_after_hours: hours.after_hours || "",
    free_estimates: pricing.free_estimates ?? null,
    callout_fee: pricing.callout_fee || "",
    rate_info: pricing.rate_info || "",
    booking_behavior: data.booking_behavior || "",
    intake_fields: Array.isArray(data.intake_fields) ? data.intake_fields : DEFAULTS.intake_fields,
    escalation_when: Array.isArray(escalation.when) ? escalation.when : DEFAULTS.escalation_when,
    escalation_number: escalation.number || "",
  }
}

function buildPayload(f: CoreFields, operatorName: string, voiceId: string) {
  return {
    business_name: f.business_name.trim(),
    services_offered: f.services_offered.split(",").map(s => s.trim()).filter(Boolean),
    services_not_offered: f.services_not_offered.split(",").map(s => s.trim()).filter(Boolean),
    service_area: f.service_area.trim(),
    hours: { regular: f.hours_regular.trim(), after_hours: f.hours_after_hours.trim(), emergency: "" },
    pricing_basics: { free_estimates: f.free_estimates, callout_fee: f.callout_fee.trim() || null, rate_info: f.rate_info.trim() || null },
    booking_behavior: f.booking_behavior.trim(),
    intake_fields: f.intake_fields,
    escalation: { when: f.escalation_when, number: f.escalation_number.trim() },
    operator_display_name: operatorName,
    operator_voice_id: voiceId,
  }
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-150",
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
      )}
    >
      {label}
    </button>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold tracking-wide text-zinc-400 uppercase">{label}</label>
      {hint && <p className="text-[11.5px] text-zinc-400">{hint}</p>}
      {children}
    </div>
  )
}

// ─── Slide animation ──────────────────────────────────────────────────────────

function StepSlide({ children, dir }: { children: React.ReactNode; dir: "left" | "right" | "none" }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const from = dir === "left" ? "translate-x-5 opacity-0" : dir === "right" ? "-translate-x-5 opacity-0" : "opacity-0"
  return (
    <div className={cn("transition-all duration-300 ease-out", visible ? "translate-x-0 opacity-100" : from)}>
      {children}
    </div>
  )
}

// ─── Loading card ─────────────────────────────────────────────────────────────

function LoadingCard({ operatorName }: { operatorName: string }) {
  const [dotPhase, setDotPhase] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDotPhase(p => (p + 1) % 4), 400)
    return () => clearInterval(id)
  }, [])
  const dots = ".".repeat(dotPhase)

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10 animate-in fade-in duration-300">
      {/* Orb animation */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
        <div className="absolute inset-2 rounded-full bg-indigo-200 animate-pulse" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-zinc-800">Preparing {operatorName}{dots}</p>
        <p className="mt-1 text-[12.5px] text-zinc-400">Loading your business profile</p>
      </div>
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = ["voice", "business", "hours", "pricing", "booking", "collect", "escalation"] as const
type Step = (typeof STEPS)[number]

export function FrontlineInitialSetupCard({ onComplete, onError }: Props) {
  const [step, setStep] = useState<Step>("voice")
  const [dir, setDir] = useState<"left" | "right" | "none">("none")
  const [prefilling, setPrefilling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [operator, setOperator] = useState<OperatorOption>(OPERATOR_OPTIONS[0])
  const [fields, setFields] = useState<CoreFields>(DEFAULTS)

  const stepIndex = STEPS.indexOf(step)

  const set = (key: keyof CoreFields, value: any) =>
    setFields(prev => ({ ...prev, [key]: value }))

  const toggleList = (key: "intake_fields" | "escalation_when", item: string) =>
    setFields(prev => {
      const list = prev[key] as string[]
      return { ...prev, [key]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] }
    })

  const go = (target: Step) => {
    setDir(STEPS.indexOf(target) > stepIndex ? "left" : "right")
    setStep(target)
  }

  const next = async () => {
    if (step === "escalation") { await save(); return }
    if (step === "voice") {
      setPrefilling(true)
      try {
        const data = await api.prefillFrontlineCoreFields()
        setFields(prefillFromApi(data.core_fields))
      } catch { /* use defaults */ }
      finally { setPrefilling(false) }
    }
    go(STEPS[stepIndex + 1] as Step)
  }

  const back = () => { if (stepIndex > 0) go(STEPS[stepIndex - 1] as Step) }

  const save = async () => {
    if (!fields.business_name.trim()) { onError?.("Business name is required."); return }
    try {
      setSaving(true)
      await api.updateFrontlineSettings({ operator_display_name: operator.name, operator_voice_id: operator.voiceId })
      await api.saveFrontlineCoreFields(buildPayload(fields, operator.name, operator.voiceId))
      setSuccess(true)
      setTimeout(() => onComplete(), 1200)
    } catch (err) {
      setSaving(false)
      onError?.(err instanceof Error ? err.message : "Unable to save setup.")
    }
  }

  // ─── Success ──────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-[1.5rem] border border-emerald-200 bg-white px-8 py-14 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <div>
          <p className="text-[17px] font-semibold text-zinc-900">{operator.name} is ready</p>
          <p className="mt-1.5 text-[13px] text-zinc-500">Turn it on whenever you&apos;re set.</p>
        </div>
      </div>
    )
  }

  // ─── Progress dots ────────────────────────────────────────────────────────

  const dots = (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <div key={s} className={cn("rounded-full transition-all duration-300", i === stepIndex ? "w-5 h-1.5 bg-indigo-600" : "w-1.5 h-1.5 bg-zinc-200")} />
      ))}
    </div>
  )

  // ─── Step content ─────────────────────────────────────────────────────────

  const renderStep = () => {
    if (prefilling) return <LoadingCard operatorName={operator.name} />

    switch (step) {
      case "voice":
        return (
          <StepSlide dir={dir} key="voice">
            <div className="flex flex-col items-center gap-7 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="space-y-2">
                <p className="text-[20px] font-semibold tracking-tight text-zinc-900">Set up your operator</p>
                <p className="text-[13px] leading-relaxed text-zinc-500 max-w-[260px] mx-auto">
                  Pick a voice — we&apos;ll walk through a few quick questions.
                </p>
              </div>
              <div className="grid w-full gap-3 grid-cols-2">
                {OPERATOR_OPTIONS.map(opt => (
                  <button
                    key={opt.voiceId}
                    type="button"
                    onClick={() => setOperator(opt)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all duration-200",
                      operator.voiceId === opt.voiceId
                        ? "border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-2"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", operator.voiceId === opt.voiceId ? "bg-white/15" : "bg-white")}>
                      <Mic2 className="h-4 w-4" />
                    </span>
                    <span className="mt-3 block text-[13.5px] font-semibold">{opt.name}</span>
                    <span className={cn("mt-0.5 block text-[11.5px]", operator.voiceId === opt.voiceId ? "text-zinc-300" : "text-zinc-400")}>
                      {opt.label} voice
                    </span>
                  </button>
                ))}
              </div>
              {/* Prominent next button on voice card */}
              <button
                type="button"
                onClick={() => void next()}
                className="w-full rounded-full bg-zinc-900 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-zinc-700 active:scale-[0.98]"
              >
                Get started
              </button>
            </div>
          </StepSlide>
        )

      case "business":
        return (
          <StepSlide dir={dir} key="business">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">Your business</p>
                <p className="mt-1 text-[13px] text-zinc-400">What should {operator.name} know about you?</p>
              </div>
              <div className="space-y-4">
                <Field label="Business name">
                  <Input value={fields.business_name} onChange={e => set("business_name", e.target.value)}
                    placeholder="e.g. Valley Landscaping" autoFocus
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
                <Field label="Services offered" hint="Separate with commas">
                  <Input value={fields.services_offered} onChange={e => set("services_offered", e.target.value)}
                    placeholder="e.g. Tree removal, irrigation, grading"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
                <Field label="Things you don't do" hint="Optional — helps decline confidently">
                  <Input value={fields.services_not_offered} onChange={e => set("services_not_offered", e.target.value)}
                    placeholder="e.g. Roofing, electrical"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
                <Field label="Where do you work?">
                  <Input value={fields.service_area} onChange={e => set("service_area", e.target.value)}
                    placeholder="e.g. Gettysburg PA within 50 miles"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
              </div>
            </div>
          </StepSlide>
        )

      case "hours":
        return (
          <StepSlide dir={dir} key="hours">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">Hours</p>
                <p className="mt-1 text-[13px] text-zinc-400">When do you work, and what happens after hours?</p>
              </div>
              <div className="space-y-4">
                <Field label="Regular hours">
                  <Input value={fields.hours_regular} onChange={e => set("hours_regular", e.target.value)}
                    placeholder="e.g. Mon–Fri 8am–5pm, Sat 9am–2pm" autoFocus
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
                <Field label="After-hours policy">
                  <Input value={fields.hours_after_hours} onChange={e => set("hours_after_hours", e.target.value)}
                    placeholder="e.g. Leave a message, we call back next morning"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
              </div>
            </div>
          </StepSlide>
        )

      case "pricing":
        return (
          <StepSlide dir={dir} key="pricing">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">Pricing</p>
                <p className="mt-1 text-[13px] text-zinc-400">{operator.name} won&apos;t quote exact prices — just enough to sound informed.</p>
              </div>
              <div className="space-y-5">
                <Field label="Free estimates?">
                  <div className="flex gap-2 flex-wrap">
                    {([true, false, null] as const).map(v => (
                      <Pill key={String(v)} label={v === null ? "Not sure" : v ? "Yes, free" : "No, we charge"} active={fields.free_estimates === v} onClick={() => set("free_estimates", v)} />
                    ))}
                  </div>
                </Field>
                <Field label="Callout / diagnostic fee" hint="Leave blank if none">
                  <Input value={fields.callout_fee} onChange={e => set("callout_fee", e.target.value)}
                    placeholder="e.g. $75 service call fee"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
                <Field label="General rate info" hint="Ranges are fine">
                  <Input value={fields.rate_info} onChange={e => set("rate_info", e.target.value)}
                    placeholder="e.g. $85–150/hr depending on job"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
              </div>
            </div>
          </StepSlide>
        )

      case "booking":
        return (
          <StepSlide dir={dir} key="booking">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">Booking</p>
                <p className="mt-1 text-[13px] text-zinc-400">What should {operator.name} do when someone wants to book?</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Collect details, owner calls back", sub: "Gather name, number, and project info — you follow up." },
                  { label: "Text the booking link", sub: "Offer to text the online scheduling link." },
                  { label: "Take a message", sub: "Get name and number, say someone will be in touch." },
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => set("booking_behavior", opt.sub)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all duration-150",
                      fields.booking_behavior === opt.sub
                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-400"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                    )}
                  >
                    <span className={cn("block text-[13.5px] font-semibold", fields.booking_behavior === opt.sub ? "text-indigo-900" : "text-zinc-800")}>
                      {opt.label}
                    </span>
                    <span className={cn("mt-0.5 block text-[12px]", fields.booking_behavior === opt.sub ? "text-indigo-600" : "text-zinc-400")}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </StepSlide>
        )

      case "collect":
        return (
          <StepSlide dir={dir} key="collect">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">What to collect</p>
                <p className="mt-1 text-[13px] text-zinc-400">What should {operator.name} always ask callers for?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTAKE_OPTIONS.map(item => (
                  <Pill key={item} label={item} active={fields.intake_fields.includes(item)} onClick={() => toggleList("intake_fields", item)} />
                ))}
              </div>
            </div>
          </StepSlide>
        )

      case "escalation":
        return (
          <StepSlide dir={dir} key="escalation">
            <div className="space-y-6">
              <div>
                <p className="text-[18px] font-semibold tracking-tight text-zinc-900">Escalation</p>
                <p className="mt-1 text-[13px] text-zinc-400">When should {operator.name} transfer to you?</p>
              </div>
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {ESCALATION_OPTIONS.map(item => (
                    <Pill key={item} label={item} active={fields.escalation_when.includes(item)} onClick={() => toggleList("escalation_when", item)} />
                  ))}
                </div>
                <Field label="Your number for live transfers" hint="Optional — leave blank if not needed">
                  <Input value={fields.escalation_number} onChange={e => set("escalation_number", e.target.value)}
                    placeholder="e.g. +1 555 123 4567"
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50 text-[13.5px] focus:bg-white" />
                </Field>
              </div>
            </div>
          </StepSlide>
        )
    }
  }

  const isVoice = step === "voice"
  const isLast = step === "escalation"
  const canNext = step !== "business" || fields.business_name.trim().length > 0

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_4px_32px_-8px_rgb(0_0_0/0.1)]">
      <div className="px-7 pb-6 pt-7 min-h-[340px]">
        {renderStep()}
      </div>

      {/* Footer — hidden on voice step since it has its own button */}
      {!isVoice && !prefilling && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-4">
          {/* Back */}
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-400 transition hover:text-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {/* Dots */}
          {dots}

          {/* Next / Finish */}
          <button
            type="button"
            onClick={() => void next()}
            disabled={!canNext || saving}
            className={cn(
              "rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-150",
              isLast
                ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-[0.97]"
                : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-[0.97]",
              (!canNext || saving) && "opacity-40 cursor-not-allowed",
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLast ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Finish setup
              </span>
            ) : (
              "Next"
            )}
          </button>
        </div>
      )}
    </div>
  )
}
