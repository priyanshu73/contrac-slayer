"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Loader2, Sparkles, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type {
  FrontlineSetupContextResponse,
  FrontlineSetupPreview,
} from "@/lib/types/frontline"

type Props = {
  onComplete: () => void
  onError?: (message: string) => void
}

function SnapshotRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  )
}

export function FrontlineInitialSetupCard({ onComplete, onError }: Props) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [setup, setSetup] = useState<FrontlineSetupContextResponse | null>(null)
  const [preview, setPreview] = useState<FrontlineSetupPreview | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getFrontlineSetupContext()
      setSetup(data)
      if (data.setup_preview_json) {
        setPreview(data.setup_preview_json as FrontlineSetupPreview)
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to load setup context.")
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void load()
  }, [load])

  const generate = async () => {
    try {
      setGenerating(true)
      const result = await api.generateFrontlineSetup()
      setPreview(result.preview)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to generate receptionist setup.")
    } finally {
      setGenerating(false)
    }
  }

  const confirm = async () => {
    if (!preview) return
    try {
      setConfirming(true)
      await api.confirmFrontlineSetup(preview)
      onComplete()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to save receptionist setup.")
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your business profile…
      </div>
    )
  }

  const ctx = setup?.context as Record<string, unknown> | undefined
  const recentJobs = Array.isArray(ctx?.recent_jobs) ? ctx.recent_jobs : []

  return (
    <div className="rounded-[1.25rem] border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-950">Configure your AI receptionist</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            We pull your company profile and recent quote context, then generate a starting
            receptionist prompt specific to your business — not a generic template.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4" />
            What we found in your account
          </div>
          <div className="space-y-3">
            <SnapshotRow label="Company" value={String(ctx?.company_name || "")} />
            <SnapshotRow label="Trade" value={String(ctx?.contractor_type || "")} />
            <SnapshotRow label="Phone" value={String(ctx?.phone || "")} />
            <SnapshotRow label="Service area" value={String(ctx?.service_area || "")} />
            <SnapshotRow label="Website" value={String(ctx?.website || "")} />
            {recentJobs.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Recent jobs / quotes
                </p>
                <ul className="mt-2 space-y-2">
                  {recentJobs.slice(0, 4).map((job, idx) => {
                    const row = job as Record<string, unknown>
                    return (
                      <li
                        key={`job-${idx}`}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium">
                          {String(row.title || row.project_type || "Untitled job")}
                        </span>
                        {row.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {String(row.description)}
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wand2 className="h-4 w-4" />
            Generated receptionist starting point
          </div>
          {!preview ? (
            <p className="text-sm text-slate-600">
              Generate a preview to see how your AI receptionist will represent{" "}
              {String(ctx?.company_name || "your business")} on calls and SMS.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {preview.business_display_name}
              </p>
              <p className="text-sm leading-6 text-slate-600">{preview.receptionist_brief}</p>
              <details className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">
                  View system prompt preview
                </summary>
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">
                  {preview.receptionist_system_prompt}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={() => void generate()}
          disabled={generating || confirming}
          className="gap-2 rounded-full bg-slate-950 text-white hover:bg-slate-800"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {preview ? "Regenerate preview" : "Generate preview"}
        </Button>
        {preview && (
          <Button
            variant="outline"
            onClick={() => void confirm()}
            disabled={confirming || generating}
            className="gap-2 rounded-full border-slate-200"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm and use this receptionist
          </Button>
        )}
      </div>
    </div>
  )
}
