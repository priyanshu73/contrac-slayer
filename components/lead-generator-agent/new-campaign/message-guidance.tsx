"use client"

import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { CampaignFormState } from "@/components/lead-generator-agent/new-campaign/types"
import { sentenceCase } from "@/components/lead-generator-agent/shared"

type PreviewResponse = {
  subject: string
  body: string
}

export function MessageGuidance({
  form,
  updateField,
}: {
  form: CampaignFormState
  updateField: <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => void
}) {
  const [activeTab, setActiveTab] = useState<"brief" | "example">("brief")
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (activeTab !== "example") return

    async function loadPreview() {
      try {
        setLoadingPreview(true)
        const response = await fetch("/api/preview-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: form.emailInstructions,
            city: form.city,
            state: form.state,
            segment: form.segments[0]?.type ?? "property_manager",
          }),
        })
        const data = await response.json()
        setPreview(data)
      } catch {
        setPreview(null)
      } finally {
        setLoadingPreview(false)
      }
    }

    loadPreview()
  }, [activeTab, form.emailInstructions, form.city, form.state, form.segments])

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === "brief" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            onClick={() => setActiveTab("brief")}
          >
            Brief
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === "example" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            onClick={() => setActiveTab("example")}
          >
            Example output
          </button>
        </div>

        {activeTab === "brief" ? (
          <Textarea
            value={form.emailInstructions}
            onChange={(event) => updateField("emailInstructions", event.target.value)}
            rows={5}
            placeholder="Short notes for tone, offer, and CTA"
            className="rounded-2xl border-slate-200"
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Generating sample outreach...
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Example subject</div>
                  <div className="mt-2 text-base font-medium text-slate-950">{preview.subject}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Example output</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.body}</p>
                </div>
                <div className="text-xs text-slate-500">
                  Preview uses {sentenceCase(form.segments[0]?.type ?? "property_manager")} in {form.city || "your city"}.
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Add guidance, then preview.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
