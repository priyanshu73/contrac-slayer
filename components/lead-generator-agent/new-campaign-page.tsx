"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, LoaderCircle, Rocket, Sparkles } from "lucide-react"

import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPayload, INITIAL_FORM, type CampaignFormState, type SegmentForm } from "@/components/lead-generator-agent/new-campaign/types"
import { ChannelSelector } from "@/components/lead-generator-agent/new-campaign/channel-selector"
import { LocationSection } from "@/components/lead-generator-agent/new-campaign/location-section"
import { MessageGuidance } from "@/components/lead-generator-agent/new-campaign/message-guidance"
import { RadiusMap } from "@/components/lead-generator-agent/new-campaign/radius-map"
import { TargetSection } from "@/components/lead-generator-agent/new-campaign/target-section"

export function NewCampaignPage() {
  const router = useRouter()
  const locale = useLocale()
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState<"draft" | "brief" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(() => buildPayload(form), [form])

  function updateField<K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addSegment(segment?: SegmentForm) {
    setForm((current) => ({
      ...current,
      segments: [...current.segments, segment ?? { type: "custom", customLabel: "" }],
    }))
  }

  function removeSegment(index: number) {
    setForm((current) => ({
      ...current,
      segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index),
    }))
  }

  async function submit(mode: "draft" | "brief") {
    try {
      setSaving(mode)
      setError(null)
      const created = await api.createCampaign(payload)
      if (mode === "brief") {
        await api.generateCampaignBrief(created.uuid)
      }
      router.push(`/${locale}/lead-generator-agent/${created.uuid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign.")
    } finally {
      setSaving(null)
    }
  }
  const canSubmit = Boolean(form.name.trim() && form.lat !== null && form.lng !== null && payload.segments.length > 0)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#ffffff_36%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-5">
          <div className="space-y-4">
            <Button asChild variant="ghost" className="h-auto px-0 text-slate-500 hover:bg-transparent hover:text-sky-700">
              <Link href={`/${locale}/lead-generator-agent`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to campaigns
              </Link>
            </Button>

            <div className="rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,_#ffffff_0%,_#f2f8ff_55%,_#edf7ff_100%)] p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span className="font-medium text-sky-600">Configure</span>
                <span>•</span>
                <span>Preview</span>
                <span>•</span>
                <span>Launch</span>
              </div>
              <div className="mt-5 max-w-3xl">
                <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">Lead Generator Agent</Badge>
                <h1 className="hidden mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:block">New campaign</h1>
                <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-600 md:mt-3">
                  Pick a market, choose who to reach, and preview the lead volume.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
            <div className="space-y-5">
              <TargetSection
                form={form}
                updateField={updateField}
                addSegment={addSegment}
                removeSegment={removeSegment}
              />
              <LocationSection form={form} updateField={updateField} />
              <ChannelSelector form={form} updateField={updateField} />
              <MessageGuidance form={form} updateField={updateField} />

              <div className="flex flex-wrap gap-3 pt-1">
                <Button className="h-11 rounded-2xl bg-sky-600 px-5 hover:bg-sky-700" disabled={saving !== null || !canSubmit} onClick={() => submit("draft")}>
                  {saving === "draft" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Save Draft
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl border-slate-200 px-5" disabled={saving !== null || !canSubmit} onClick={() => submit("brief")}>
                  {saving === "brief" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                  Save and Generate Brief
                </Button>
              </div>

              {error && (
                <Card className="border-rose-200 bg-rose-50/70">
                  <CardContent className="pt-6 text-sm text-rose-700">{error}</CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <RadiusMap
                lng={form.lng}
                lat={form.lat}
                radiusMiles={form.radiusMiles}
                addressLabel={form.addressLabel}
              />

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Campaign summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-sm font-medium text-slate-900">{form.addressLabel || "Choose an address"}</div>
                    <div className="mt-1 text-xs text-slate-500">Radius · {form.radiusMiles} miles</div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Mode</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">{form.executionMode === "REVIEW" ? "Copilot" : "Autopilot"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Segments</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">
                        {payload.segments.map((segment) => segment.type).join(", ") || "None selected"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
