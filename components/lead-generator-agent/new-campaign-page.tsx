"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, Bot, CheckCircle2, LoaderCircle, MapPin, MessageSquare, Rocket, User } from "lucide-react"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LocationSection } from "@/components/lead-generator-agent/new-campaign/location-section"
import { RadiusMap } from "@/components/lead-generator-agent/new-campaign/radius-map"
import { INITIAL_FORM, buildPayload, type CampaignFormState } from "@/components/lead-generator-agent/new-campaign/types"

// ─── Segment options ─────────────────────────────────────────────────────────
const SEGMENT_OPTIONS = [
  { id: "property_manager", label: "Property Managers" },
  { id: "general_contractor", label: "General Contractors" },
  { id: "facility_manager", label: "Facility Managers" },
  { id: "real_estate", label: "Real Estate" },
  { id: "hoa", label: "HOAs" },
  { id: "commercial_property", label: "Commercial Properties" },
  { id: "insurance_adjuster", label: "Insurance / Restoration" },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3

const STEP_LABELS: Record<Step, string> = {
  1: "Where & Who",
  2: "Mode & Message",
  3: "Review & Launch",
}

export function NewCampaignPage() {
  const router = useRouter()
  const locale = useLocale()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<CampaignFormState>(INITIAL_FORM)
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [messageGuidance, setMessageGuidance] = useState("")
  const [executionMode, setExecutionMode] = useState<"REVIEW" | "AUTOPILOT">("REVIEW")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleSegment(id: string) {
    setSelectedSegments((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const step1Valid = form.lat !== null && form.lng !== null && selectedSegments.length > 0
  const step2Valid = true // message guidance is optional

  async function launch() {
    try {
      setSaving(true)
      setError(null)

      const payload = buildPayload({
        ...form,
        name: form.name || `Campaign – ${form.addressLabel || "new"}`,
        executionMode,
        emailInstructions: messageGuidance,
        segments: selectedSegments.map((id) => ({
          type: id,
          customLabel: SEGMENT_OPTIONS.find((s) => s.id === id)?.label ?? id,
        })),
      })

      const created = await api.createCampaign(payload)

      // Launch immediately — backend spawns a background thread that handles
      // brief generation + discovery + draft generation. Returns instantly.
      await api.launchCampaign(created.uuid)

      // Navigate to the detail page where SSE shows live progress
      router.push(`/${locale}/lead-generator-agent/${created.uuid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch campaign.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#ffffff_36%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-6">

          {/* Back */}
          <Button asChild variant="ghost" className="h-auto px-0 text-slate-500 hover:bg-transparent hover:text-sky-700">
            <Link href={`/${locale}/lead-generator-agent`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Campaigns
            </Link>
          </Button>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => s < step && setStep(s)}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    s === step ? "bg-sky-600 text-white" :
                    s < step ? "cursor-pointer bg-emerald-100 text-emerald-700" :
                    "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                </button>
                <span className={[
                  "text-sm",
                  s === step ? "font-medium text-slate-900" : "text-slate-400",
                ].join(" ")}>
                  {STEP_LABELS[s]}
                </span>
                {s < 3 && <div className="mx-2 h-px w-8 bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Where + Who ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Where do you want to find leads?</h1>
                <p className="mt-1 text-sm text-slate-500">Pick a location and the types of businesses you want to reach.</p>
              </div>

              {/* Location */}
              <Card className="border-slate-200 bg-white">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MapPin className="h-4 w-4 text-sky-500" />
                    Target area
                  </div>
                  <LocationSection form={form} updateField={updateField} />
                  <RadiusMap lng={form.lng} lat={form.lat} radiusMiles={form.radiusMiles} addressLabel={form.addressLabel} />
                </CardContent>
              </Card>

              {/* Segments */}
              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                    <User className="h-4 w-4 text-sky-500" />
                    Who are you targeting?
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SEGMENT_OPTIONS.map((seg) => {
                      const active = selectedSegments.includes(seg.id)
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => toggleSegment(seg.id)}
                          className={[
                            "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                            active
                              ? "border-sky-400 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/50",
                          ].join(" ")}
                        >
                          {seg.label}
                        </button>
                      )
                    })}
                  </div>
                  {selectedSegments.length === 0 && (
                    <p className="mt-3 text-xs text-slate-400">Select at least one target type to continue.</p>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-700"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          )}

          {/* ── Step 2: Mode + Message ────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">How should the campaign run?</h1>
                <p className="mt-1 text-sm text-slate-500">Choose how involved you want to be, and give a brief message hint.</p>
              </div>

              {/* Mode selector */}
              <div className="grid gap-3 sm:grid-cols-2">
                {(["REVIEW", "AUTOPILOT"] as const).map((mode) => {
                  const isCopilot = mode === "REVIEW"
                  const active = executionMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setExecutionMode(mode)}
                      className={[
                        "rounded-2xl border p-5 text-left transition-all",
                        active ? "border-sky-400 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-sky-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        {isCopilot
                          ? <User className={`h-5 w-5 ${active ? "text-sky-600" : "text-slate-400"}`} />
                          : <Bot className={`h-5 w-5 ${active ? "text-sky-600" : "text-slate-400"}`} />
                        }
                        <span className={`font-semibold ${active ? "text-sky-700" : "text-slate-700"}`}>
                          {isCopilot ? "Copilot" : "Autopilot"}
                        </span>
                        {active && <span className="ml-auto rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">Selected</span>}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        {isCopilot
                          ? "You review leads and approve messaging before anything is sent."
                          : "The agent finds leads, drafts emails, and sends — up to 10/day over 7 days."}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Message guidance */}
              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MessageSquare className="h-4 w-4 text-sky-500" />
                    Message guidance <span className="font-normal text-slate-400">(optional)</span>
                  </div>
                  <Textarea
                    placeholder="e.g. Keep it short and professional. Mention we've worked with HOAs in the area and offer a free estimate. No pushy sales language."
                    className="min-h-28 resize-none rounded-xl border-slate-200 text-sm"
                    value={messageGuidance}
                    onChange={(e) => setMessageGuidance(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">This guides the AI when it writes outreach emails for your leads.</p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="h-11 flex-1 rounded-2xl border-slate-200" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="h-11 flex-1 rounded-2xl bg-sky-600 hover:bg-sky-700" onClick={() => setStep(3)}>
                  Review
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Launch ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Ready to launch?</h1>
                <p className="mt-1 text-sm text-slate-500">Review your settings and start the campaign.</p>
              </div>

              {/* Summary card */}
              <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-900">{form.addressLabel || "—"} · {form.radiusMiles}mi</span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Targets</span>
                    <span className="font-medium text-slate-900">
                      {selectedSegments
                        .map((id) => SEGMENT_OPTIONS.find((s) => s.id === id)?.label ?? id)
                        .join(", ")}
                    </span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode</span>
                    <span className="font-medium text-slate-900">{executionMode === "REVIEW" ? "Copilot" : "Autopilot"}</span>
                  </div>
                  {executionMode === "AUTOPILOT" && (
                    <>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between">
                        <span className="text-slate-500">Send limit</span>
                        <span className="font-medium text-slate-900">Up to 10 emails/day · 7 day window</span>
                      </div>
                    </>
                  )}
                  {messageGuidance && (
                    <>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 shrink-0">Message hint</span>
                        <span className="font-medium text-slate-900 text-right line-clamp-2">{messageGuidance}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Copilot callout */}
              {executionMode === "REVIEW" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <strong>Copilot mode:</strong> The agent will find leads and pause for your approval before sending any emails.
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="h-11 flex-1 rounded-2xl border-slate-200" onClick={() => setStep(2)} disabled={saving}>
                  Back
                </Button>
                <Button className="h-11 flex-1 rounded-2xl bg-sky-600 hover:bg-sky-700" onClick={launch} disabled={saving}>
                  {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                  {saving ? "Starting…" : "Start Campaign"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
