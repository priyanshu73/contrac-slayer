"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2, Mic2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { FrontlineSetupContextResponse } from "@/lib/types/frontline"

type Props = {
  onComplete: () => void
  onError?: (message: string) => void
}

type Phase = "idle" | "configuring" | "success"

const OPERATOR_OPTIONS = [
  {
    name: "Henry",
    voiceId: "matthew",
    label: "Male",
  },
  {
    name: "Jane",
    voiceId: "tiffany",
    label: "Female",
  },
] as const

const CONFIGURING_LINES = [
  (name: string) => `${name} is on the way.`,
  (name: string) => `${name} found the clean polo shirt.`,
  (name: string) => `${name} is driving to the office now.`,
  (name: string) => `${name} is testing the headset.`,
  (name: string) => `${name} is opening the front desk notebook.`,
] as const

export function FrontlineInitialSetupCard({ onComplete, onError }: Props) {
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>("idle")
  const [setup, setSetup] = useState<FrontlineSetupContextResponse | null>(null)
  const [configuringLineIndex, setConfiguringLineIndex] = useState(0)
  const [operator, setOperator] = useState<(typeof OPERATOR_OPTIONS)[number]>(
    OPERATOR_OPTIONS[0],
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getFrontlineSetupContext()
      setSetup(data)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to load setup.")
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (phase !== "configuring") {
      setConfiguringLineIndex(0)
      return
    }

    const timer = window.setInterval(() => {
      setConfiguringLineIndex((current) => (current + 1) % CONFIGURING_LINES.length)
    }, 1600)

    return () => window.clearInterval(timer)
  }, [phase])

  const configure = async () => {
    if (setup?.setup_available === false) return
    try {
      setPhase("configuring")
      const generated = await api.generateFrontlineSetup({
        operator_display_name: operator.name,
        operator_voice_id: operator.voiceId,
      })
      await api.confirmFrontlineSetup(generated.preview)
      setPhase("success")
      window.setTimeout(() => onComplete(), 1400)
    } catch (err) {
      setPhase("idle")
      onError?.(err instanceof Error ? err.message : "Unable to configure operator.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing setup…
      </div>
    )
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
            Your AI front desk is ready. Train it below or turn it on when you&apos;re set.
          </p>
        </div>
      </div>
    )
  }

  const businessName =
    setup?.business_display_name?.trim() ||
    String((setup?.context as Record<string, unknown> | undefined)?.company_name || "").trim() ||
    "your business"
  const configuringLine =
    CONFIGURING_LINES[configuringLineIndex % CONFIGURING_LINES.length](operator.name)

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
          Pick the operator voice first, then we&apos;ll configure it for{" "}
          <span className="font-medium text-slate-900">{businessName}</span>. It learns how to
          answer calls and texts in your voice — you can refine it anytime.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {OPERATOR_OPTIONS.map((option) => {
            const active = operator.voiceId === option.voiceId
            return (
              <button
                key={option.voiceId}
                type="button"
                onClick={() => setOperator(option)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    active ? "bg-white/15 text-white" : "bg-white text-slate-600"
                  }`}
                >
                  <Mic2 className="h-4 w-4" />
                </span>
                <span className="mt-3 block text-sm font-semibold">{option.name}</span>
                <span className={`mt-1 block text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                  {option.label} operator voice
                </span>
              </button>
            )
          })}
        </div>

        <Button
          onClick={() => void configure()}
          disabled={phase === "configuring" || setup?.setup_available === false}
          className="mt-8 min-w-[220px] gap-2 rounded-full bg-slate-950 px-8 py-6 text-sm font-medium text-white hover:bg-slate-800"
        >
          {phase === "configuring" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Configuring operator…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Configure operator
            </>
          )}
        </Button>

        {phase === "configuring" && (
          <p className="mx-auto mt-3 min-h-5 max-w-xs text-xs font-medium text-slate-500">
            {configuringLine}
          </p>
        )}

        {setup?.setup_available === false && (
          <p className="mt-4 text-xs text-amber-700">
            Setup service is updating — refresh in a moment and try again.
          </p>
        )}
      </div>
    </div>
  )
}
