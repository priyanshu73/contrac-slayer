"use client"

import { Check } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { IntegrationProviderIcon } from "@/components/integration-provider-icon"

type Provider = "google" | "outlook"

export function IntegrationProviderSelector({ label, value, googleConnected, outlookConnected, disabled, onChange }: {
  label: string
  value: Provider | null
  googleConnected: boolean
  outlookConnected: boolean
  disabled: boolean
  onChange: (provider: Provider) => void
}) {
  return (
    <ToggleGroup type="single" value={value || ""} disabled={disabled} aria-label={label}
      onValueChange={(next) => {
        if ((next === "google" || next === "outlook") && next !== value) onChange(next)
      }}
      className="grid w-full sm:w-72 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {(["google", "outlook"] as const).map((provider) => {
        const name = provider === "google" ? "Google" : "Outlook"
        const connected = provider === "google" ? googleConnected : outlookConnected
        return (
          <ToggleGroupItem key={provider} value={provider} disabled={!connected || disabled}
            title={!connected ? `Connect ${name} to use this account` : undefined}
            aria-label={`${name}${connected ? "" : " (not connected)"}`}
            className="h-11 gap-1.5 px-2 rounded-lg first:rounded-lg last:rounded-lg text-slate-500 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm disabled:opacity-40">
            <IntegrationProviderIcon provider={provider} className="h-5 w-5 shrink-0" />
            <span>{name}</span>
            {value === provider && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
