"use client"

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { WorkflowRunStatus, WorkflowStepStatus } from "@/lib/types/workflow"

export const RUN_STATUS_META: Record<WorkflowRunStatus, { label: string; className: string; icon: React.ReactNode }> = {
  DRAFTING:        { label: "Drafting",        className: "border-sky-200 bg-sky-50 text-sky-700",         icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  AWAITING_REVIEW: { label: "Needs review",    className: "border-amber-200 bg-amber-50 text-amber-700",   icon: <Clock className="h-3.5 w-3.5" /> },
  APPLYING:        { label: "Applying",        className: "border-violet-200 bg-violet-50 text-violet-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  COMPLETED:       { label: "Completed",       className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  FAILED:          { label: "Failed",          className: "border-rose-200 bg-rose-50 text-rose-700",       icon: <XCircle className="h-3.5 w-3.5" /> },
  REJECTED:        { label: "Rejected",        className: "border-slate-200 bg-slate-100 text-slate-600",   icon: null },
  CANCELLED:       { label: "Cancelled",       className: "border-slate-200 bg-slate-100 text-slate-600",   icon: null },
}

export const STEP_STATUS_META: Record<WorkflowStepStatus, { label: string; className: string }> = {
  PENDING:  { label: "Not drafted", className: "border-slate-200 bg-slate-50 text-slate-500" },
  PROPOSED: { label: "Proposed",    className: "border-sky-200 bg-sky-50 text-sky-700" },
  EDITED:   { label: "Edited",      className: "border-violet-200 bg-violet-50 text-violet-700" },
  SKIPPED:  { label: "Skipped",     className: "border-slate-200 bg-slate-100 text-slate-500" },
  BLOCKED:  { label: "Blocked",     className: "border-amber-200 bg-amber-50 text-amber-700" },
  APPLIED:  { label: "Done",        className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  FAILED:   { label: "Failed",      className: "border-rose-200 bg-rose-50 text-rose-700" },
}

export function RunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  const meta = RUN_STATUS_META[status]
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </Badge>
  )
}

export function StepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  const meta = STEP_STATUS_META[status]
  return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function leadNameOf(context: Record<string, any> | undefined | null): string | null {
  return context?.lead?.name ?? null
}
