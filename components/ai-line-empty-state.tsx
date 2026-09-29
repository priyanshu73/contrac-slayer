"use client"

import { useState } from "react"
import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpsAiNumberPickerDialog } from "@/components/ops-ai-number-picker-dialog"

type AiLineEmptyStateProps = {
  title: string
  description: string
  ctaLabel: string
  retryLabel?: string
  onRetry?: () => void
  onConnected?: () => void
}

/**
 * Plain-language empty state for surfaces that need a provisioned ContractorOps
 * number (the ContractorAI link). Opens the number picker in place so the user
 * can get a number instead of hitting a jargon error or a dead end.
 */
export function AiLineEmptyState({
  title,
  description,
  ctaLabel,
  retryLabel,
  onRetry,
  onConnected,
}: AiLineEmptyStateProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Phone className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setPickerOpen(true)}
        >
          {ctaLabel}
        </Button>
        {onRetry && retryLabel ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
      <OpsAiNumberPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSuccess={onConnected}
      />
    </div>
  )
}
