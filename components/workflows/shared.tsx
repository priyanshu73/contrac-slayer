"use client"

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import type { WorkflowRunStatus, WorkflowStepStatus } from "@/lib/types/workflow"

export const RUN_STATUS_META: Record<WorkflowRunStatus, { className: string; icon: React.ReactNode }> = {
  DRAFTING:        { className: "border-sky-200 bg-sky-50 text-sky-700",         icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  AWAITING_REVIEW: { className: "border-amber-200 bg-amber-50 text-amber-700",   icon: <Clock className="h-3.5 w-3.5" /> },
  APPLYING:        { className: "border-violet-200 bg-violet-50 text-violet-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  COMPLETED:       { className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  FAILED:          { className: "border-rose-200 bg-rose-50 text-rose-700",       icon: <XCircle className="h-3.5 w-3.5" /> },
  REJECTED:        { className: "border-slate-200 bg-slate-100 text-slate-600",   icon: null },
  CANCELLED:       { className: "border-slate-200 bg-slate-100 text-slate-600",   icon: null },
}

export const STEP_STATUS_META: Record<WorkflowStepStatus, { className: string }> = {
  PENDING:  { className: "border-slate-200 bg-slate-50 text-slate-500" },
  PROPOSED: { className: "border-sky-200 bg-sky-50 text-sky-700" },
  EDITED:   { className: "border-violet-200 bg-violet-50 text-violet-700" },
  SKIPPED:  { className: "border-slate-200 bg-slate-100 text-slate-500" },
  BLOCKED:  { className: "border-amber-200 bg-amber-50 text-amber-700" },
  APPLIED:  { className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  FAILED:   { className: "border-rose-200 bg-rose-50 text-rose-700" },
}

/** Labels for backend-provided identifiers; unknown values fall back to the raw string. */
export function useWorkflowLabels() {
  const t = useTranslations("leads.workflows")
  const pick = (group: string, key: string | null | undefined) =>
    key ? (t.has(`${group}.${key}`) ? t(`${group}.${key}`) : key) : ""
  return {
    kind: (k: string) => pick("kind", k),
    step: (k: string) => pick("stepLabel", k),
    refKind: (k: string) => pick("refKind", k),
    confidence: (k: string | null | undefined) => pick("confidence", k ? k.toLowerCase() : k),
  }
}

export function RunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  const t = useTranslations("leads.workflows")
  const meta = RUN_STATUS_META[status]
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      {meta.icon}
      {t(`runStatus.${status}`)}
    </Badge>
  )
}

export function StepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  const t = useTranslations("leads.workflows")
  const meta = STEP_STATUS_META[status]
  return <Badge variant="outline" className={meta.className}>{t(`stepStatus.${status}`)}</Badge>
}

const dateLocale = (locale: string) => (locale === "es" ? "es-US" : "en-US")

export const money = (n: number, locale: string = "en") =>
  new Intl.NumberFormat(dateLocale(locale), { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export function formatWhen(iso: string | null | undefined, locale: string = "en"): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(dateLocale(locale), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function leadNameOf(context: Record<string, any> | undefined | null): string | null {
  return context?.lead?.name ?? null
}
