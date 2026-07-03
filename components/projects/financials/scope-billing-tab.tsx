'use client'

// Scope & Billing — the reconciled view that ties a project's quotes (+ line
// items) → draws → invoices together. Everything here derives from the accepted
// quote(s); this tab is read-only and links out to the quote for billing
// actions, so the numbers are a single source of truth rather than re-entered.

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { api } from '@/lib/api'
import { Project, ProjectScopeBilling } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, AlertTriangle, FileText, ArrowUpRight, CheckCircle2 } from 'lucide-react'

interface ScopeBillingTabProps {
  project: Project
}

const DRAW_STATE_STYLES: Record<string, string> = {
  PAID: 'bg-status-active/15 text-status-active border-status-active/30',
  INVOICED: 'bg-status-pending/15 text-status-pending border-status-pending/30',
  READY: 'bg-primary/15 text-primary border-primary/20',
  SCHEDULED: 'bg-muted text-muted-foreground border-border',
}

const INVOICE_STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-status-active/15 text-status-active border-status-active/30',
  PARTIALLY_PAID: 'bg-status-pending/15 text-status-pending border-status-pending/30',
  SENT: 'bg-primary/15 text-primary border-primary/20',
  PENDING: 'bg-primary/15 text-primary border-primary/20',
  OVERDUE: 'bg-destructive/15 text-destructive border-destructive/30',
  DRAFT: 'bg-muted text-muted-foreground border-border',
}

const pct = (n: number) => `${Math.round(n)}%`

/** A two-segment progress bar: collected/paid (green) then invoiced-but-not-yet-
 * collected (amber), over a muted "remaining" track. */
function BillingBar({ paid, billed, total, className }: { paid: number; billed: number; total: number; className?: string }) {
  const denom = total > 0 ? total : 1
  const paidPct = Math.max(0, Math.min(100, (paid / denom) * 100))
  const billedExtraPct = Math.max(0, Math.min(100 - paidPct, ((billed - paid) / denom) * 100))
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-muted ${className ?? 'h-2'}`}>
      <div className="bg-status-active transition-all duration-500" style={{ width: `${paidPct}%` }} />
      <div className="bg-status-pending transition-all duration-500" style={{ width: `${billedExtraPct}%` }} />
    </div>
  )
}

export function ScopeBillingTab({ project }: ScopeBillingTabProps) {
  const { toast } = useToast()
  const locale = useLocale()
  // Open quotes / invoices in a new browser tab so the financials page stays put.
  const openTab = (path: string) => window.open(`/${locale}${path}`, '_blank', 'noopener,noreferrer')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProjectScopeBilling | null>(null)
  // The draw currently being billed (its line id), so we can show a spinner on
  // just that row and disable the rest while the invoice is created.
  const [billingId, setBillingId] = useState<number | null>(null)

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true)
        const res = await api.getProjectScopeBilling(project.id)
        setData(res)
      } catch (err: any) {
        toast({ title: 'Error loading scope & billing', description: err.message, variant: 'destructive' })
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [project.id],
  )

  useEffect(() => {
    load()
  }, [load])

  // Bill a single draw in place: create its invoice, then silently refresh so the
  // row flips to INVOICED and the invoices list picks it up — no page reload, no
  // trip out to the quote.
  const handleBillDraw = async (jobId: number, line: { id: number; label: string; computed_amount: number }) => {
    setBillingId(line.id)
    try {
      const invoice = await api.billDraw(jobId, line.id)
      toast({
        title: 'Draw billed',
        description: `${line.label} — invoice ${invoice?.invoice_number ?? ''} for ${formatCurrency(line.computed_amount)}.`,
      })
      await load(false)
    } catch (err: any) {
      toast({
        title: "Couldn't bill this draw",
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBillingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No financial data available.</div>
  }

  const { contract, quotes, schedules, invoices, reconciliation } = data
  const anchor = quotes.find((q) => q.is_anchor)
  // Show EVERY linked quote (anchor first), not just anchor + change orders — a
  // project can have multiple independent quotes linked, and they must all show.
  const orderedQuotes = [...quotes].sort((a, b) => Number(b.is_anchor) - Number(a.is_anchor))
  const baseQuoteCount = quotes.filter((q) => !q.is_change_order).length
  const hasDrift = contract.source === 'override' && Math.abs(contract.drift) > 0.01
  const fullyReconciled =
    Math.abs(reconciliation.uninvoiced_remaining) < 0.01 &&
    Math.abs(reconciliation.contract_total - reconciliation.collected_total) < 0.01

  // Headline figures + progress.
  const contractTotal = reconciliation.contract_total
  const invoicedTotal = reconciliation.invoiced_total
  const collectedTotal = reconciliation.collected_total
  const overInvoiced = reconciliation.uninvoiced_remaining < -0.01
  const denom = contractTotal > 0 ? contractTotal : 1
  const invoicedPct = Math.max(0, Math.min(100, (invoicedTotal / denom) * 100))
  const collectedPct = Math.max(0, Math.min(100, (collectedTotal / denom) * 100))

  // Section subtotals (placed in each section's header).
  const scopeTotal = quotes.reduce((s, q) => s + q.grand_total, 0)
  const invTotal = invoices.reduce((s, i) => s + i.total_amount, 0)
  const invPaid = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const invBalance = invoices.reduce((s, i) => s + i.balance_due, 0)

  // Keep the lists clean: every quote/plan starts collapsed; the user expands
  // the ones they care about.
  const defaultOpenScope: string[] = []
  const defaultOpenPlan: string[] = []

  const stats: { label: string; value: string; accent: string }[] = [
    { label: 'Invoiced', value: formatCurrency(invoicedTotal), accent: 'text-status-pending' },
    { label: 'Collected', value: formatCurrency(collectedTotal), accent: 'text-status-active' },
    overInvoiced
      ? { label: 'Over-invoiced', value: formatCurrency(Math.abs(reconciliation.uninvoiced_remaining)), accent: 'text-destructive' }
      : { label: 'Uninvoiced', value: formatCurrency(reconciliation.uninvoiced_remaining), accent: 'text-primary' },
  ]

  return (
    <div className="p-4 space-y-6">
      {/* ── Billing summary (headline) ── */}
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-5">
          {/* Contract total + where it comes from, with a status pill */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Contract total</p>
              <p className="text-3xl font-bold tabular-nums text-foreground leading-tight">{formatCurrency(contractTotal)}</p>
              <div className="mt-1 text-xs text-muted-foreground">
                {contract.source === 'quote' && (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    Derived from {baseQuoteCount > 1 ? `${baseQuoteCount} quotes` : (anchor ? anchor.title : 'the accepted quote')}
                    {' '}({formatCurrency(contract.base_contract)})
                    {contract.approved_co_total > 0 && (
                      <> + {formatCurrency(contract.approved_co_total)} change orders</>
                    )}
                  </span>
                )}
                {contract.source === 'override' && (
                  <span>Manually set · quote-derived is {formatCurrency(contract.derived_total)}</span>
                )}
                {contract.source === 'none' && <span>No accepted quote linked yet.</span>}
              </div>
            </div>
            <div className="shrink-0">
              {hasDrift ? (
                <Badge variant="outline" className="border-status-pending/30 bg-status-pending/10 text-status-pending">Overridden</Badge>
              ) : fullyReconciled ? (
                <Badge variant="outline" className="border-status-active/30 bg-status-active/10 text-status-active">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Reconciled
                </Badge>
              ) : contract.source === 'quote' ? (
                <Badge variant="outline" className="border-status-active/30 bg-status-active/10 text-status-active">From scope</Badge>
              ) : null}
            </div>
          </div>

          {/* Progress: collected (green) + invoiced-not-collected (amber) of contract */}
          <div className="space-y-1.5">
            <BillingBar paid={collectedTotal} billed={invoicedTotal} total={contractTotal} className="h-2.5" />
            <div className="flex flex-wrap justify-between gap-x-4 text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-status-active" /> {pct(collectedPct)} collected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-status-pending" /> {pct(invoicedPct)} invoiced
                </span>
              </span>
              {!overInvoiced && (
                <span className="tabular-nums">{formatCurrency(reconciliation.uninvoiced_remaining)} left to invoice</span>
              )}
            </div>
          </div>

          {/* The remaining figures, as a clean responsive grid of chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {hasDrift && (
            <div className="flex items-start gap-2 rounded-md bg-status-pending/10 border border-status-pending/30 px-3 py-2 text-xs text-status-pending">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                The contract value is overridden and differs from the quote by{' '}
                <strong>{formatCurrency(Math.abs(contract.drift))}</strong>{' '}
                ({contract.drift > 0 ? 'over' : 'under'} the quoted scope). Update the quote or clear the
                override to reconcile.
              </span>
            </div>
          )}
          {overInvoiced && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Invoiced <strong>{formatCurrency(Math.abs(reconciliation.uninvoiced_remaining))}</strong> more than the
                contract total. Check the Invoices list for stray or duplicate invoices.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Scope: quotes + line items (collapsible) ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Scope {quotes.length > 0 && <span className="text-muted-foreground font-medium normal-case">· {quotes.length} quote{quotes.length === 1 ? '' : 's'}</span>}
          </CardTitle>
          {quotes.length > 0 && (
            <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(scopeTotal)}</span>
          )}
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes linked to this project.</p>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpenScope} className="space-y-3">
              {orderedQuotes.map((q) => (
                <AccordionItem key={q.job_id} value={`q-${q.job_id}`} className="rounded-lg border border-border overflow-hidden">
                  <AccordionTrigger className="px-4 py-2.5 bg-muted hover:no-underline [&[data-state=open]]:border-b">
                    <div className="flex flex-1 items-center justify-between gap-2 min-w-0 pr-2">
                      <span className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="truncate text-sm font-semibold text-foreground">{q.title}</span>
                        {q.is_anchor && <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Primary contract</Badge>}
                        {q.is_change_order && <Badge variant="outline" className="border-chart-4/20 bg-chart-4/10 text-chart-4">Change order</Badge>}
                        <Badge variant="outline" className="text-muted-foreground">{q.status}</Badge>
                        <span className="text-xs text-muted-foreground">{q.line_items.length} item{q.line_items.length === 1 ? '' : 's'}</span>
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatCurrency(q.grand_total)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex justify-end border-b bg-muted/30 px-4 py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground hover:text-primary"
                        onClick={() => openTab(`/quotes/${q.job_id}`)}
                      >
                        Open quote <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {q.line_items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                            <th className="px-4 py-1.5 text-left font-semibold">Item</th>
                            <th className="px-4 py-1.5 text-right font-semibold whitespace-nowrap">Qty × Rate</th>
                            <th className="px-4 py-1.5 text-right font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {q.line_items.map((li) => (
                            <tr key={li.id}>
                              <td className="px-4 py-2 text-foreground">{li.description}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                                {li.quantity} {li.unit_of_measure || ''} × {formatCurrency(li.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                                {formatCurrency(li.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-4 py-3 text-xs text-muted-foreground">No line items on this quote.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ── Payments & Invoices — the draw schedule (billable in place) and the
           invoices those draws produce, in one place ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Payments &amp; Invoices
            {schedules.length > 1 && (
              <span className="text-muted-foreground font-medium normal-case"> · {schedules.length} quotes</span>
            )}
          </CardTitle>
          {schedules.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Planned <span className="font-semibold text-foreground">{formatCurrency(reconciliation.scheduled_total)}</span> of {formatCurrency(reconciliation.contract_total)}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ── Payment plan: draws per quote, billable in place ── */}
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No billing plan yet — link an accepted quote to bill against it.
            </p>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpenPlan} className="space-y-3">
              {schedules.map((sch) => {
                // A quote with no draws bills as one payment — show the amount payable
                // through it rather than hiding the quote entirely.
                const lumpSum = !sch.has_draws || sch.lines.length === 0
                return (
                  <AccordionItem key={sch.job_id} value={`s-${sch.job_id}`} className="rounded-lg border border-border overflow-hidden">
                    <AccordionTrigger className="px-4 py-2.5 bg-muted hover:no-underline [&[data-state=open]]:border-b">
                      <div className="flex flex-1 items-center justify-between gap-2 min-w-0 pr-2">
                        <span className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="truncate text-sm font-semibold text-foreground">{sch.quote_title}</span>
                          {sch.is_anchor && <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Primary contract</Badge>}
                          {sch.is_change_order && <Badge variant="outline" className="border-chart-4/20 bg-chart-4/10 text-chart-4">Change order</Badge>}
                          {lumpSum && <Badge variant="outline" className="text-muted-foreground">Single payment</Badge>}
                        </span>
                        <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatCurrency(sch.contract_total)}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="p-3 space-y-1.5">
                        {lumpSum ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2">
                            <span className="text-sm font-medium text-foreground">
                              Payable in full <span className="text-muted-foreground">· no draw schedule</span>
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {formatCurrency(sch.contract_total)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7"
                                onClick={() => openTab(`/quotes/${sch.job_id}`)}
                              >
                                Bill <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          sch.lines.map((line) => {
                            const billed = line.state === 'PAID' || line.state === 'INVOICED'
                            const billable = !billed && (line.state === 'READY' || line.state === 'SCHEDULED')
                            return (
                              <div key={line.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate text-sm font-medium text-foreground">{line.label}</span>
                                  <Badge variant="outline" className={DRAW_STATE_STYLES[line.state] || 'text-muted-foreground'}>{line.state}</Badge>
                                  {line.invoice_id && line.invoice_number ? (
                                    <button
                                      type="button"
                                      onClick={() => openTab(`/invoices/${line.invoice_id}`)}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      {line.invoice_number}
                                    </button>
                                  ) : (
                                    line.invoice_number && <span className="text-xs text-muted-foreground">{line.invoice_number}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-sm font-semibold tabular-nums text-foreground">
                                    {formatCurrency(line.computed_amount)}
                                  </span>
                                  {billable && (
                                    <Button
                                      size="sm"
                                      className="h-7"
                                      disabled={billingId !== null}
                                      onClick={() => handleBillDraw(sch.job_id, line)}
                                    >
                                      {billingId === line.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Bill'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                        {/* Per-quote billed/paid progress */}
                        <div className="pt-1.5">
                          <BillingBar paid={sch.summary.paid} billed={sch.summary.billed} total={sch.contract_total} className="h-1.5" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {lumpSum
                              ? `Payable ${formatCurrency(sch.contract_total)}`
                              : `Scheduled ${formatCurrency(sch.scheduled_total)} of ${formatCurrency(sch.contract_total)}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="tabular-nums">
                              Billed {formatCurrency(sch.summary.billed)} · <span className="text-status-active">Paid {formatCurrency(sch.summary.paid)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openTab(`/quotes/${sch.job_id}`)}
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              Edit schedule <ArrowUpRight className="ml-0.5 h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
          {schedules.length > 1 && (
            <div className="flex justify-between pt-1 text-xs font-semibold text-foreground border-t">
              <span>Planned across {schedules.length} quotes</span>
              <span className="tabular-nums">
                {formatCurrency(reconciliation.scheduled_total)} of {formatCurrency(reconciliation.contract_total)}
              </span>
            </div>
          )}

          {/* ── Invoices raised so far (draws that have been billed + any standalone) ── */}
          {invoices.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Invoices <span className="normal-case font-medium">· {invoices.length}</span>
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="text-status-active font-semibold">{formatCurrency(invPaid)}</span> collected of {formatCurrency(invTotal)}
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="px-3 py-1.5 text-left font-semibold">Invoice</th>
                    <th className="px-3 py-1.5 text-left font-semibold">Status</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Total</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Paid</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => openTab(`/invoices/${inv.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openTab(`/invoices/${inv.id}`)
                        }
                      }}
                      className="cursor-pointer hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-primary hover:underline">{inv.invoice_number}</span>
                          {inv.is_draw && <Badge variant="outline" className="text-muted-foreground text-[10px]">draw</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={INVOICE_STATUS_STYLES[inv.status || 'DRAFT'] || 'text-muted-foreground'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCurrency(inv.total_amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-status-active">{formatCurrency(inv.amount_paid)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">{formatCurrency(inv.balance_due)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={2} className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Total · {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCurrency(invTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-status-active">{formatCurrency(invPaid)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-primary">{formatCurrency(invBalance)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
