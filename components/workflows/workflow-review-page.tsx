"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { AlertTriangle, ArrowLeft, Check, RotateCcw, Trash2, X } from "lucide-react"

import { api } from "@/lib/api"
import type { WorkflowRunDetail, WorkflowStep } from "@/lib/types/workflow"
import { WORKFLOW_KIND_LABEL, WORKFLOW_STEP_LABEL } from "@/lib/types/workflow"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RunStatusBadge, StepStatusBadge, formatWhen, leadNameOf, money } from "@/components/workflows/shared"

type Proposal = Record<string, any>

// Steps the reviewer may skip. Client and quote feed later steps; the estimate
// has no apply of its own, so skipping it means nothing.
const SKIPPABLE = new Set(["project", "email"])

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

// ─── Step editors ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ClientEditor({ value, onChange, disabled }: { value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value })
  const changes = value.changes ?? {}
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {value.mode === "link" ? (
          <>
            Links to existing client <span className="font-medium">#{value.client_id}</span>
            {value.match_reason ? <span className="text-muted-foreground"> (matched by {value.match_reason})</span> : null}.
          </>
        ) : (
          <>Creates a new client.</>
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><Input value={value.name ?? ""} onChange={set("name")} disabled={disabled} /></Field>
        <Field label="Email"><Input value={value.email ?? ""} onChange={set("email")} disabled={disabled} /></Field>
        <Field label="Phone"><Input value={value.phone ?? ""} onChange={set("phone")} disabled={disabled} /></Field>
        <Field label="Address"><Input value={value.address ?? ""} onChange={set("address")} disabled={disabled} /></Field>
      </div>
      {Object.keys(changes).length > 0 && (
        <div className="rounded-md bg-muted/60 p-3 text-xs">
          <p className="mb-1 font-medium">Will update on the existing client</p>
          {Object.entries(changes).map(([k, v]: [string, any]) => (
            <p key={k} className="text-muted-foreground">
              {k}: <span className="line-through">{String(v.from ?? "—")}</span> → {String(v.to)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectEditor({ value, onChange, disabled }: { value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  return (
    <div className="grid gap-3">
      <Field label="Title"><Input value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} disabled={disabled} /></Field>
      <Field label="Objective"><Textarea rows={3} value={value.objective ?? ""} onChange={(e) => onChange({ ...value, objective: e.target.value })} disabled={disabled} /></Field>
    </div>
  )
}

function EstimateView({ value }: { value: Proposal }) {
  if (value.mode === "clarify") {
    return (
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" />{value.reason}</p>
        <ol className="list-decimal space-y-1 pl-5">
          {(value.questions ?? []).map((q: any) => (
            <li key={q.id}>
              {q.text}
              {q.options?.length ? <span className="text-muted-foreground"> ({q.options.map((o: any) => o.label).join(" / ")})</span> : null}
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground">The quote step is skipped. The email below asks the customer these questions.</p>
      </div>
    )
  }
  const items: any[] = value.line_items ?? []
  return (
    <div className="space-y-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="py-1 pr-2">Item</th><th className="py-1 pr-2">Qty</th><th className="py-1 pr-2">Unit</th><th className="py-1 pr-2 text-right">Rate</th><th className="py-1">Confidence</th></tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="py-1 pr-2">{it.title}{it.requires_review ? <span className="ml-1 text-amber-600">*</span> : null}</td>
                <td className="py-1 pr-2">{it.quantity}</td>
                <td className="py-1 pr-2">{it.unit}</td>
                <td className="py-1 pr-2 text-right">{money(Number(it.rate ?? 0))}</td>
                <td className="py-1 capitalize text-muted-foreground">{it.confidence ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {value.assumptions?.length ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Assumptions</p>
          <ul className="list-disc pl-5 text-muted-foreground">{value.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
        </div>
      ) : null}
      {value.warnings?.length ? (
        <div>
          <p className="text-xs font-medium text-amber-700">Warnings</p>
          <ul className="list-disc pl-5 text-amber-700">{value.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">Edit prices and quantities on the quote step below. * needs a look.</p>
    </div>
  )
}

function QuoteEditor({ value, onChange, disabled }: { value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  const items: any[] = value.items ?? []
  const markup = Number(value.markup_percentage ?? 0)
  const total = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.cost_per_unit || 0) * (1 + markup / 100), 0)
  const setItem = (i: number, patch: Proposal) => {
    const next = items.map((it, j) => (j === i ? { ...it, ...patch } : it))
    onChange({ ...value, items: next, estimated_total: Math.round(total * 100) / 100 })
  }
  const removeItem = (i: number) => onChange({ ...value, items: items.filter((_, j) => j !== i) })
  const addItem = () => onChange({ ...value, items: [...items, { title: "", description: "", quantity: 1, unit: "Each", cost_per_unit: 0, category: "materials" }] })
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quote title"><Input value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} disabled={disabled} /></Field>
        <Field label="Valid until"><Input type="date" value={value.expiration_date ?? ""} onChange={(e) => onChange({ ...value, expiration_date: e.target.value })} disabled={disabled} /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={value.description ?? ""} onChange={(e) => onChange({ ...value, description: e.target.value })} disabled={disabled} /></Field>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="py-1 pr-2">Item</th><th className="w-20 py-1 pr-2">Qty</th><th className="w-28 py-1 pr-2">Unit</th><th className="w-28 py-1 pr-2">Cost/unit</th><th className="w-8" /></tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t align-top">
                <td className="py-1 pr-2">
                  <Input value={it.title ?? ""} onChange={(e) => setItem(i, { title: e.target.value })} disabled={disabled} className="h-8" />
                  {it.description ? <p className="mt-1 text-xs text-muted-foreground">{it.description}</p> : null}
                </td>
                <td className="py-1 pr-2"><Input type="number" step="0.01" value={it.quantity ?? 0} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} disabled={disabled} className="h-8" /></td>
                <td className="py-1 pr-2"><Input value={it.unit ?? ""} onChange={(e) => setItem(i, { unit: e.target.value })} disabled={disabled} className="h-8" /></td>
                <td className="py-1 pr-2"><Input type="number" step="0.01" value={it.cost_per_unit ?? 0} onChange={(e) => setItem(i, { cost_per_unit: Number(e.target.value) })} disabled={disabled} className="h-8" /></td>
                <td className="py-1">
                  {!disabled && (
                    <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-rose-600" aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        {!disabled ? <Button type="button" variant="outline" size="sm" onClick={addItem}>Add item</Button> : <span />}
        <p className="text-sm">
          <span className="text-muted-foreground">Est. total with {markup}% markup: </span>
          <span className="font-medium">{money(total)}</span>
        </p>
      </div>
    </div>
  )
}

function EmailEditor({ value, onChange, disabled }: { value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="To"><Input value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value })} disabled={disabled} /></Field>
        <Field label="Subject"><Input value={value.subject ?? ""} onChange={(e) => onChange({ ...value, subject: e.target.value })} disabled={disabled} /></Field>
      </div>
      <Field label={value.mode === "clarify" ? "Message (the questions are added below it)" : "Personal note (sits above the quote link)"}>
        <Textarea rows={4} value={value.note ?? ""} onChange={(e) => onChange({ ...value, note: e.target.value })} disabled={disabled} />
      </Field>
      {value.mode === "clarify" && value.questions?.length ? (
        <ol className="list-decimal pl-5 text-sm text-muted-foreground">{value.questions.map((q: any) => <li key={q.id}>{q.text}</li>)}</ol>
      ) : (
        <p className="text-xs text-muted-foreground">The email uses the standard quote template with the public quote link. Only the note and subject are yours to change.</p>
      )}
    </div>
  )
}

function JsonEditor({ value, onChange, disabled }: { value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2))
  const [bad, setBad] = useState(false)
  useEffect(() => { setText(JSON.stringify(value, null, 2)) }, [value])
  return (
    <div className="space-y-1">
      <Textarea
        rows={8}
        className="font-mono text-xs"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value)
          try { onChange(JSON.parse(e.target.value)); setBad(false) } catch { setBad(true) }
        }}
      />
      {bad && <p className="text-xs text-rose-600">Not valid JSON</p>}
    </div>
  )
}

function StepEditor({ stepKey, value, onChange, disabled }: { stepKey: string; value: Proposal; onChange: (p: Proposal) => void; disabled: boolean }) {
  switch (stepKey) {
    case "client": return <ClientEditor value={value} onChange={onChange} disabled={disabled} />
    case "project": return <ProjectEditor value={value} onChange={onChange} disabled={disabled} />
    case "estimate": return <EstimateView value={value} />
    case "quote": return <QuoteEditor value={value} onChange={onChange} disabled={disabled} />
    case "email": return <EmailEditor value={value} onChange={onChange} disabled={disabled} />
    default: return <JsonEditor value={value} onChange={onChange} disabled={disabled} />
  }
}

function ResultLinks({ stepKey, result, locale }: { stepKey: string; result: Proposal; locale: string }) {
  if (stepKey === "client" && result.client_id) return <Link className="text-sm underline" href={`/${locale}/clients/${result.client_id}`}>Open client</Link>
  if (stepKey === "quote" && result.job_id) return <Link className="text-sm underline" href={`/${locale}/quotes/${result.job_id}`}>Open quote</Link>
  if (stepKey === "project" && result.project_id) return <Link className="text-sm underline" href={`/${locale}/projects/${result.project_id}`}>Open project</Link>
  if (stepKey === "email" && result.to) return <span className="text-sm text-muted-foreground">Sent to {result.to}</span>
  return null
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function WorkflowReviewPage({ runId }: { runId: string }) {
  const locale = useLocale()
  const { toast } = useToast()
  const [run, setRun] = useState<WorkflowRunDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Proposal>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getWorkflowRun(runId)
      setRun(data)
      setError(null)
      // Reset local edits to what the server has, but keep unsaved typing on
      // steps the user is mid-edit on (their draft differs from the saved one).
      setDrafts((prev) => {
        const next: Record<string, Proposal> = {}
        for (const s of data.steps) {
          if (s.proposal == null) continue
          const local = prev[s.key]
          next[s.key] = local && !sameJson(local, s.proposal) && data.status === "AWAITING_REVIEW" ? local : s.proposal
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this run")
    }
  }, [runId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    if (run?.status === "DRAFTING" || run?.status === "APPLYING") {
      pollRef.current = setInterval(load, 5_000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [run?.status, load])

  const reviewing = run?.status === "AWAITING_REVIEW"
  const stepsByKey = useMemo(() => Object.fromEntries((run?.steps ?? []).map((s) => [s.key, s])), [run])
  const dirtyKeys = useMemo(
    () => Object.keys(drafts).filter((k) => stepsByKey[k] && !sameJson(drafts[k], stepsByKey[k].proposal)),
    [drafts, stepsByKey],
  )
  const blocked = (run?.steps ?? []).filter((s) => s.status === "BLOCKED")
  const undrafted = (run?.steps ?? []).filter((s) => s.status === "PENDING")

  async function act(label: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(label)
    try {
      await fn()
      if (ok) toast({ title: ok })
      await load()
    } catch (e) {
      toast({ title: `Couldn't ${label}`, description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const saveStep = (key: string) => act("save", () => api.updateWorkflowStep(runId, key, { proposal: drafts[key] }), "Saved")
  const resetStep = (key: string) => {
    const step = stepsByKey[key]
    if (!step?.proposal_original) return
    setDrafts((d) => ({ ...d, [key]: step.proposal_original as Proposal }))
    act("reset", () => api.updateWorkflowStep(runId, key, { proposal: step.proposal_original as Proposal }))
  }
  const toggleSkip = (key: string, skipped: boolean) => act("update", () => api.updateWorkflowStep(runId, key, { skipped }))

  if (error && !run) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-rose-600">{error}</p>
        <Button className="mt-4" variant="outline" asChild><Link href={`/${locale}/workflows`}>Back to workflows</Link></Button>
      </main>
    )
  }
  if (!run) {
    return (
      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-10 w-1/2" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
      </main>
    )
  }

  const progress = run.job_progress ?? {}
  const live = run.status === "DRAFTING" || run.status === "APPLYING"
  const leadName = leadNameOf(run.context)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-6 pb-32 md:pb-28">
        <Link href={`/${locale}/workflows`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Workflows
        </Link>

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{WORKFLOW_KIND_LABEL[run.kind] ?? run.kind}{leadName ? ` · ${leadName}` : ""}</h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Started {formatWhen(run.created_at)} from {run.trigger_ref_kind} {run.trigger_ref_id}
            {run.trigger === "EVENT" ? " (automatic)" : run.trigger === "CHAT" ? " (assistant)" : ""}.
          </p>
          {run.summary && reviewing && <p className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">{run.summary}</p>}
          {live && (
            <div className="mt-3">
              <p className="text-sm">{progress.message ?? "Working…"}</p>
              {progress.steps_total ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(((progress.steps_done ?? 0) / progress.steps_total) * 100)}%` }} />
                </div>
              ) : null}
              {run.status === "DRAFTING" && <p className="mt-1 text-xs text-muted-foreground">The estimate is the slow part; this can take a few minutes. You can leave and come back.</p>}
            </div>
          )}
          {run.status === "FAILED" && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <p className="font-medium">The {run.failed_phase ?? "run"} step failed.</p>
              <p className="mt-1">{run.error}</p>
              <p className="mt-1 text-xs">Retry picks up where it stopped; steps that already applied are not repeated.</p>
            </div>
          )}
          {run.status === "COMPLETED" && <p className="mt-3 text-sm text-emerald-700">Everything applied. Links to what was created are on each step.</p>}
        </div>

        <div className="space-y-4">
          {run.steps.map((step: WorkflowStep) => {
            const draft = drafts[step.key]
            const dirty = dirtyKeys.includes(step.key)
            const editable = reviewing && step.status !== "SKIPPED" && step.key !== "estimate"
            const canSkip = reviewing && SKIPPABLE.has(step.key) && step.status !== "PENDING"
            return (
              <Card key={step.key} className={`p-5 ${step.status === "SKIPPED" ? "opacity-70" : ""}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{WORKFLOW_STEP_LABEL[step.key] ?? step.key}</h2>
                    <StepStatusBadge status={step.status} />
                    {dirty && <span className="text-xs text-violet-700">unsaved</span>}
                  </div>
                  {canSkip && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Skip
                      <Switch checked={step.status === "SKIPPED"} onCheckedChange={(v) => toggleSkip(step.key, v)} disabled={busy !== null} />
                    </label>
                  )}
                </div>

                {step.blockers.length > 0 && step.status !== "SKIPPED" && (
                  <ul className="mb-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {step.blockers.map((b) => <li key={b.code} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{b.message}</li>)}
                  </ul>
                )}
                {step.error && <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{step.error}</p>}

                {step.status === "PENDING" ? (
                  <p className="text-sm text-muted-foreground">{live ? "Not drafted yet." : "Not drafted."}</p>
                ) : step.status === "SKIPPED" && !draft ? (
                  <p className="text-sm text-muted-foreground">Skipped.</p>
                ) : draft ? (
                  <StepEditor stepKey={step.key} value={draft} onChange={(p) => setDrafts((d) => ({ ...d, [step.key]: p }))} disabled={!editable || busy !== null} />
                ) : null}

                {(editable || step.result) && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div>{step.result && <ResultLinks stepKey={step.key} result={step.result} locale={locale} />}</div>
                    {editable && (
                      <div className="flex gap-2">
                        {step.proposal_original && !sameJson(draft, step.proposal_original) && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => resetStep(step.key)} disabled={busy !== null}>
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                          </Button>
                        )}
                        <Button type="button" size="sm" variant={dirty ? "default" : "outline"} onClick={() => saveStep(step.key)} disabled={!dirty || busy !== null}>
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {run.events.length > 0 && (
          <details className="mt-8 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Timeline ({run.events.length})</summary>
            <ul className="mt-2 space-y-1">
              {run.events.map((e, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <span className="w-28 shrink-0 text-xs">{formatWhen(e.created_at)}</span>
                  <span>{e.summary}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>

      {(reviewing || run.status === "FAILED" || run.status === "DRAFTING") && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <div className="container mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {reviewing && blocked.length > 0 && <span>Fix or skip the blocked step{blocked.length > 1 ? "s" : ""} first.</span>}
              {reviewing && undrafted.length > 0 && <span>Some steps are not drafted yet.</span>}
              {reviewing && dirtyKeys.length > 0 && <span>Save your edits before approving.</span>}
              {reviewing && !blocked.length && !undrafted.length && !dirtyKeys.length && <span>Approving creates the records and sends the email.</span>}
            </div>
            <div className="flex gap-2">
              {(run.status === "DRAFTING" || run.status === "FAILED") && (
                <Button variant="outline" onClick={() => act("cancel", () => api.cancelWorkflowRun(runId), "Cancelled")} disabled={busy !== null}>
                  Cancel run
                </Button>
              )}
              {run.status === "FAILED" && (
                <Button onClick={() => act("retry", () => api.retryWorkflowRun(runId), "Retrying")} disabled={busy !== null}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
              )}
              {reviewing && (
                <>
                  <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy !== null}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    onClick={() => act("approve", () => api.approveWorkflowRun(runId), "Approved. Applying now.")}
                    disabled={busy !== null || blocked.length > 0 || undrafted.length > 0 || dirtyKeys.length > 0}
                  >
                    <Check className="mr-2 h-4 w-4" /> Approve and run
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this packet?</AlertDialogTitle>
            <AlertDialogDescription>Nothing was created, so there is nothing to undo. A note helps you remember why later.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRejectOpen(false)
                act("reject", () => api.rejectWorkflowRun(runId, rejectReason.trim() || undefined), "Rejected")
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
