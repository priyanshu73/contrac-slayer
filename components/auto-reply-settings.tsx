"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { AutoReplySettings as AutoReplySettingsType } from "@/lib/types/twilio"
import { MessageSquare, RotateCcw, Loader2 } from "lucide-react"

/**
 * Settings panel where a contractor edits the SMS auto-reply that goes to
 * brand-new customers who text their public Twilio number. Default behavior
 * is preserved — saving an empty message clears the override and reverts to
 * the platform default.
 */
export function AutoReplySettings() {
  const [data, setData] = useState<AutoReplySettingsType | null>(null)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await api.getAutoReply()
        if (cancelled) return
        setData(result)
        setDraft(result.message)
      } catch (err: any) {
        if (cancelled) return
        setError(
          err?.message?.includes("404")
            ? "Your contractor profile isn't linked yet. Finish onboarding first."
            : "Couldn't load auto-reply settings.",
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const isDirty = useMemo(() => {
    if (!data) return false
    return draft.trim() !== (data.message || "").trim()
  }, [draft, data])

  const isUsingDefault = data ? data.is_default && !isDirty : false

  const previewMessage = useMemo(() => {
    return draft
      .replace(/\{quote_link\}/g, "https://contractorops.ai/quote-request/a1b2c3d4-e5f6-7890-abcd-ef1234567890")
      .replace(/\{contractor_name\}/g, "Your Business")
      .replace(/\{customer_name\}/g, "Sam")
  }, [draft])

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const result = await api.updateAutoReply(draft.trim() || null)
      setData(result)
      setDraft(result.message)
      setSavedAt(Date.now())
    } catch (err: any) {
      setError(err?.message || "Failed to save auto-reply.")
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!data) return
    setDraft(data.default_template)
  }

  const handleClearOverride = async () => {
    setSaving(true)
    setError("")
    try {
      const result = await api.updateAutoReply(null)
      setData(result)
      setDraft(result.message)
      setSavedAt(Date.now())
    } catch (err: any) {
      setError(err?.message || "Failed to reset auto-reply.")
    } finally {
      setSaving(false)
    }
  }

  const insertPlaceholder = (placeholder: string) => {
    setDraft((current) => `${current}${current.endsWith(" ") || !current ? "" : " "}${placeholder}`)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex items-center gap-3 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading auto-reply settings…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="text-red-600 text-sm">{error || "Unable to load."}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">SMS Auto-Reply</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              The first message a new customer gets when they text your business
              number. Use placeholders to personalize it.
            </p>
          </div>
        </div>

        {isUsingDefault && (
          <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            You're using the platform default. Edit below to customize.
          </div>
        )}

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {savedAt && !isDirty && (
          <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            Saved.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Message ({draft.length}/1400)
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              maxLength={1400}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="Type your auto-reply…"
            />

            <div className="mt-2">
              <div className="text-xs text-slate-500 mb-1.5">Insert placeholder:</div>
              <div className="flex flex-wrap gap-1.5">
                {data.placeholders.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Preview (with sample values)
            </label>
            <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 min-h-[8rem] whitespace-pre-wrap">
              {previewMessage || (
                <span className="text-slate-400">Your message will preview here.</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {"{quote_link}"} → <span className="font-mono">contractorops.ai/quote-request/your-id</span>.{" "}
              {"{contractor_name}"} → your business name.{" "}
              {"{customer_name}"} → the customer's name if we know it, otherwise
              "there".
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefault}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset draft to default
          </Button>
          {!isUsingDefault && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearOverride}
              disabled={saving}
              className="text-slate-600"
            >
              Clear override (use platform default)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
