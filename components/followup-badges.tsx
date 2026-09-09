"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BotIcon, UserIcon, ZapIcon, PhoneIcon, BellIcon, CheckCheckIcon, AlertTriangleIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import type { CancelReason, DeliveryStatus, FollowupSource, ScheduledFollowup } from "@/lib/types/followup"

/** "Who sent it" chip. */
export function SourceBadge({ source, className }: { source?: FollowupSource | null; className?: string }) {
  const t = useTranslations("scheduling.list")
  const meta: Record<FollowupSource, { icon: React.ReactNode; label: string; cls: string }> = {
    automation: { icon: <ZapIcon className="h-3 w-3" />, label: t("sourceAutomation"), cls: "bg-violet-500/10 text-violet-600" },
    owner: { icon: <UserIcon className="h-3 w-3" />, label: t("sourceOwner"), cls: "bg-slate-500/10 text-slate-600" },
    ai_agent: { icon: <BotIcon className="h-3 w-3" />, label: t("sourceAiAgent"), cls: "bg-sky-500/10 text-sky-600" },
    frontline: { icon: <PhoneIcon className="h-3 w-3" />, label: t("sourceFrontline"), cls: "bg-amber-500/10 text-amber-600" },
    system: { icon: <BellIcon className="h-3 w-3" />, label: t("sourceSystem"), cls: "bg-slate-500/10 text-slate-600" },
  }
  const m = meta[(source ?? "owner") as FollowupSource] ?? meta.owner
  return (
    <Badge variant="secondary" className={cn("gap-1 px-1.5 py-0 text-[10px] font-medium", m.cls, className)}>
      {m.icon}
      {m.label}
    </Badge>
  )
}

/** Carrier delivery state, only shown once a row was sent. */
export function DeliveryBadge({ status, code, className }: { status?: DeliveryStatus | null; code?: string | null; className?: string }) {
  const t = useTranslations("scheduling.list")
  if (!status || status === "queued") return null
  const meta: Record<Exclude<DeliveryStatus, "queued">, { icon: React.ReactNode; label: string; cls: string }> = {
    sent: { icon: <ClockIcon className="h-3 w-3" />, label: t("deliverySent"), cls: "bg-blue-500/10 text-blue-600" },
    delivered: { icon: <CheckCheckIcon className="h-3 w-3" />, label: t("deliveryDelivered"), cls: "bg-green-500/10 text-green-600" },
    undelivered: { icon: <AlertTriangleIcon className="h-3 w-3" />, label: t("deliveryUndelivered"), cls: "bg-red-500/10 text-red-600" },
    failed: { icon: <AlertTriangleIcon className="h-3 w-3" />, label: t("deliveryFailed"), cls: "bg-red-500/10 text-red-600" },
  }
  const m = meta[status]
  const chip = (
    <Badge variant="secondary" className={cn("gap-1 px-1.5 py-0 text-[10px] font-medium", m.cls, className)}>
      {m.icon}
      {m.label}
    </Badge>
  )
  if (!code) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{t("carrierCode", { code })}</TooltipContent>
    </Tooltip>
  )
}

export function useCancelReasonLabel() {
  const t = useTranslations("scheduling.list")
  return (reason?: CancelReason | string | null): string | null => {
    if (!reason) return null
    const map: Record<string, string> = {
      customer_replied: t("reasonCustomerReplied"),
      quote_accepted: t("reasonQuoteAccepted"),
      quote_rejected: t("reasonQuoteRejected"),
      quote_closed: t("reasonQuoteClosed"),
      booking_cancelled: t("reasonBookingCancelled"),
      booking_rescheduled: t("reasonBookingRescheduled"),
      booking_passed: t("reasonBookingPassed"),
      owner_cancelled: t("reasonOwnerCancelled"),
      automation_disabled: t("reasonAutomationDisabled"),
      opted_out: t("reasonOptedOut"),
      sequence_cancelled: t("reasonSequenceCancelled"),
    }
    return map[reason] ?? reason
  }
}

/** "Step 2 of 3" for cadence rows. */
export function StepLabel({ f }: { f: Pick<ScheduledFollowup, "step_number" | "total_steps"> }) {
  const t = useTranslations("scheduling.list")
  if (!f.step_number || !f.total_steps) return null
  return <span className="text-xs text-muted-foreground">{t("stepOf", { step: f.step_number, total: f.total_steps })}</span>
}
