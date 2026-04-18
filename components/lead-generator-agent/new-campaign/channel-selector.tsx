"use client"

import type { ReactNode } from "react"
import { Mail, MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CampaignFormState } from "@/components/lead-generator-agent/new-campaign/types"

function ChannelCard({
  title,
  subtitle,
  selected,
  onClick,
  icon,
}: {
  title: string
  subtitle: string
  selected: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700")}>
          {icon}
        </div>
        <div>
          <div className="font-medium text-slate-950">{title}</div>
          <div className="text-sm text-slate-500">{subtitle}</div>
        </div>
      </div>
      <div className={cn("h-5 w-5 rounded-full border-2", selected ? "border-sky-600 bg-sky-600" : "border-slate-300")} />
    </button>
  )
}

export function ChannelSelector({
  form,
  updateField,
}: {
  form: CampaignFormState
  updateField: <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => void
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Channels</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ChannelCard
          title="Email"
          subtitle="Recommended"
          selected={form.emailEnabled}
          onClick={() => {
            const next = !form.emailEnabled
            updateField("emailEnabled", next)
            if (next) updateField("preferredChannel", "email")
          }}
          icon={<Mail className="h-5 w-5" />}
        />
        <ChannelCard
          title="SMS"
          subtitle="Optional"
          selected={form.smsEnabled}
          onClick={() => {
            const next = !form.smsEnabled
            updateField("smsEnabled", next)
            if (next && !form.emailEnabled) updateField("preferredChannel", "phone")
          }}
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </CardContent>
    </Card>
  )
}
