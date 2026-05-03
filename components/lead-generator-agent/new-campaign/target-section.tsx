"use client"

import type { ComponentType } from "react"
import {
  BriefcaseBusiness,
  Building2,
  HardHat,
  Home,
  Landmark,
  Plus,
  ShieldCheck,
  Users,
  Warehouse,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CampaignFormState, SegmentForm } from "@/components/lead-generator-agent/new-campaign/types"
import { EXECUTION_MODE_OPTIONS, SEGMENT_OPTIONS, sentenceCase } from "@/components/lead-generator-agent/shared"

const SEGMENT_META: Record<string, { icon: ComponentType<{ className?: string }>; hint: string }> = {
  property_manager: { icon: Building2, hint: "Recurring building work" },
  hoa: { icon: Home, hint: "Communities and associations" },
  small_commercial_property_owner: { icon: Warehouse, hint: "Retail, office, light industrial" },
  insurance_adjuster_restoration: { icon: ShieldCheck, hint: "Insurance and restoration" },
  general_contractor: { icon: HardHat, hint: "Overflow and trade partners" },
  facility_manager: { icon: BriefcaseBusiness, hint: "Operational maintenance" },
  real_estate: { icon: Landmark, hint: "Portfolio and property turnover" },
  custom: { icon: Users, hint: "Define your own target" },
}

function segmentLabel(segment: SegmentForm) {
  if (segment.type === "custom") {
    return segment.customLabel?.trim() || "Custom"
  }
  return sentenceCase(segment.type)
}

export function TargetSection({
  form,
  updateField,
  addSegment,
  removeSegment,
}: {
  form: CampaignFormState
  updateField: <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => void
  addSegment: (segment?: SegmentForm) => void
  removeSegment: (index: number) => void
}) {
  const selectedKeys = new Set(
    form.segments
      .filter((segment) => segment.type !== "custom")
      .map((segment) => segment.type)
  )

  function toggleSegment(segmentType: string) {
    const existingIndex = form.segments.findIndex((segment) => segment.type === segmentType)
    if (existingIndex >= 0) {
      removeSegment(existingIndex)
      return
    }
    addSegment({ type: segmentType })
  }

  function addCustomSegment() {
    addSegment({ type: "custom", customLabel: "" })
  }

  function updateCustomSegment(index: number, value: string) {
    updateField(
      "segments",
      form.segments.map((segment, segmentIndex) => (
        segmentIndex === index ? { ...segment, customLabel: value } : segment
      ))
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Campaign setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Campaign name"
          className="h-11 rounded-2xl border-slate-200 text-[15px]"
        />

        <div className="grid gap-3 md:grid-cols-2">
          {EXECUTION_MODE_OPTIONS.map((option) => {
            const active = form.executionMode === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField("executionMode", option.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  active ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <div className="font-medium text-slate-950">{option.label}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {option.value === "REVIEW" ? "You approve the key steps." : "The agent keeps moving automatically."}
                </div>
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-900">Who to reach</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SEGMENT_OPTIONS.filter((option) => option.value !== "custom").map((option) => {
              const meta = SEGMENT_META[option.value] ?? SEGMENT_META.property_manager
              const Icon = meta.icon
              const active = selectedKeys.has(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSegment(option.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    active ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-950">{option.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{meta.hint}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {form.segments.map((segment, index) => (
              <Badge
                key={`${segment.type}-${segment.customLabel ?? ""}-${index}`}
                variant="outline"
                className="rounded-full border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800"
              >
                {segmentLabel(segment)}
                <button
                  type="button"
                  className="ml-2 inline-flex"
                  onClick={() => removeSegment(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Custom type</div>
                <div className="text-sm text-slate-500">Add a niche business target not listed above.</div>
              </div>
              <Button type="button" variant="outline" className="h-10 rounded-2xl border-slate-200" onClick={addCustomSegment}>
                <Plus className="mr-2 h-4 w-4" />
                Add custom
              </Button>
            </div>

            {form.segments.map((segment, index) => (
              segment.type === "custom" ? (
                <Input
                  key={`custom-${index}`}
                  value={segment.customLabel ?? ""}
                  onChange={(event) => updateCustomSegment(index, event.target.value)}
                  placeholder="Type a custom target"
                  className="h-11 rounded-2xl border-slate-200 bg-white"
                />
              ) : null
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
