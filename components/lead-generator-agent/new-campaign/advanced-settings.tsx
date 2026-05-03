"use client"

import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { CampaignExecutionMode } from "@/lib/types"
import { EXECUTION_MODE_OPTIONS } from "@/components/lead-generator-agent/shared"
import type { CampaignFormState } from "@/components/lead-generator-agent/new-campaign/types"

export function AdvancedSettings({
  form,
  updateField,
}: {
  form: CampaignFormState
  updateField: <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => void
}) {
  return (
    <Collapsible>
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <div>
                <CardTitle>Advanced settings</CardTitle>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-500" />
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <select
                className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-xs"
                value={form.executionMode}
                onChange={(event) => updateField("executionMode", event.target.value as CampaignExecutionMode)}
              >
                {EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Max ZIP codes</label>
              <Input type="number" min={1} max={25} value={form.maxZipCodes} onChange={(event) => updateField("maxZipCodes", Math.min(25, Math.max(1, Number(event.target.value) || 1)))} className="h-12 rounded-2xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} className="h-12 rounded-2xl border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End date</label>
              <Input type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} className="h-12 rounded-2xl border-slate-200" />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
