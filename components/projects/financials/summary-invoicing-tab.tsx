'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import {
  Project,
  ProjectFinancialSummary,
  QBOInvoiceDetail,
  QBOProjectInvoiceDetailResponse,
  ManualPaidQuoteSnapshot,
} from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import {
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Link2,
  Banknote,
} from 'lucide-react'

interface SummaryInvoicingTabProps {
  project: Project
  summary: ProjectFinancialSummary
}

type InvoiceRow = QBOInvoiceDetail & { job_id: number }

function getStatusBadge(status: string) {
  switch (status) {
    case 'Paid':
      return (
        <Badge className="bg-status-active/15 text-status-active border-status-active/30 font-semibold">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
        </Badge>
      )
    case 'Partially Paid':
      return (
        <Badge className="bg-status-pending/15 text-status-pending border-status-pending/30 font-semibold">
          <Clock className="w-3 h-3 mr-1" /> Partially Paid
        </Badge>
      )
    default:
      return (
        <Badge className="bg-primary/15 text-primary border-primary/20 font-semibold">
          <AlertCircle className="w-3 h-3 mr-1" /> Open
        </Badge>
      )
  }
}

function QboInvoiceCard({ detail }: { detail: InvoiceRow }) {
  const dateStr =
    detail.txn_date && detail.due_date
      ? `${new Date(detail.txn_date).toLocaleDateString()} · Due ${new Date(detail.due_date).toLocaleDateString()}`
      : detail.txn_date
        ? new Date(detail.txn_date).toLocaleDateString()
        : detail.due_date
          ? `Due ${new Date(detail.due_date).toLocaleDateString()}`
          : ''

  return (
    <Card className="border-border overflow-hidden">
      <div className="bg-gradient-to-r from-muted to-card p-4 border-b flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">
              Inv. {detail.doc_number || detail.qbo_invoice_id}
            </h3>
            <span className="text-xs text-muted-foreground">#{detail.job_id}</span>
            {getStatusBadge(detail.status)}
          </div>
          {dateStr && <p className="text-xs text-muted-foreground">{dateStr}</p>}
        </div>
        {detail.qbo_invoice_url && (
          <a href={detail.qbo_invoice_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10 h-8">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> QBO
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x border-b text-center">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total</p>
          <p className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(detail.total)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-status-active uppercase">Paid</p>
          <p className="text-lg font-bold text-status-active mt-0.5">{formatCurrency(detail.amount_paid)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-primary uppercase">Due</p>
          <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(detail.balance)}</p>
        </div>
      </div>

      {detail.line_items.length > 0 && (
        <details className="group border-b">
          <summary className="px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer list-none flex items-center justify-between hover:bg-muted/80 [&::-webkit-details-marker]:hidden">
            <span>Line items ({detail.line_items.length})</span>
            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left p-2 font-semibold">Item</th>
                  <th className="text-right p-2 font-semibold">Qty</th>
                  <th className="text-right p-2 font-semibold">Rate</th>
                  <th className="text-right p-2 font-semibold">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {detail.line_items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="p-2 text-foreground max-w-[200px] truncate" title={item.description || undefined}>
                      {item.description || '—'}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                    <td className="p-2 text-right font-medium text-foreground">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t text-muted-foreground text-xs">
                <tr>
                  <td colSpan={3} className="p-2 text-right font-medium">
                    Subtotal
                  </td>
                  <td className="p-2 text-right font-medium">{formatCurrency(detail.subtotal)}</td>
                </tr>
                {detail.tax_total > 0 && (
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Tax
                    </td>
                    <td className="p-2 text-right font-medium">{formatCurrency(detail.tax_total)}</td>
                  </tr>
                )}
                <tr className="text-foreground font-bold">
                  <td colSpan={3} className="p-2 text-right">
                    Total
                  </td>
                  <td className="p-2 text-right">{formatCurrency(detail.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details>
      )}

      {detail.synced_at && (
        <div className="px-4 py-2 bg-muted text-[11px] text-muted-foreground">
          Synced {new Date(detail.synced_at).toLocaleDateString()}
        </div>
      )}
    </Card>
  )
}

function ManualPaidQuoteCard({ row, locale }: { row: ManualPaidQuoteSnapshot; locale: string }) {
  const href = `/${locale}/quotes/${row.job_id}`
  return (
    <Card className="border-status-active/30 overflow-hidden border-l-4 border-l-status-active shadow-sm">
      <div className="bg-gradient-to-r from-status-active/10 to-card p-4 border-b border-status-active/30 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-active/15 text-status-active">
              <Banknote className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">{row.title}</h3>
            <span className="text-xs text-muted-foreground">#{row.job_id}</span>
            <Badge className="bg-status-active/15 text-status-active border-status-active/30 font-semibold shadow-none">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Paid · App only
            </Badge>
          </div>
          {row.client_name && <p className="text-xs text-muted-foreground pl-10 sm:pl-0">{row.client_name}</p>}
          <p className="text-xs text-muted-foreground pl-10 sm:pl-0">No QuickBooks invoice linked — counted as collected in the snapshot.</p>
        </div>
        <Button variant="outline" size="sm" className="border-border shrink-0 h-8" asChild>
          <Link href={href}>
            <FileText className="w-3.5 h-3.5 mr-1" /> Open quote
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 divide-x border-b border-border text-center">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total</p>
          <p className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(row.total_amount)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-status-active uppercase">Paid</p>
          <p className="text-lg font-bold text-status-active mt-0.5">{formatCurrency(row.total_amount)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Due</p>
          <p className="text-lg font-bold text-muted-foreground mt-0.5">{formatCurrency(0)}</p>
        </div>
      </div>
    </Card>
  )
}

function ManualPaidQuotesSection({
  rows,
  locale,
  className,
}: {
  rows: ManualPaidQuoteSnapshot[]
  locale: string
  className?: string
}) {
  if (rows.length === 0) return null
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Banknote className="w-4 h-4 text-status-active" />
        Other payments
        <span className="text-muted-foreground font-normal">(no QuickBooks invoice)</span>
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xl">
        Paid quotes recorded in the app without a QuickBooks invoice id or link. Totals match the financial snapshot.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <ManualPaidQuoteCard key={row.job_id} row={row} locale={locale} />
        ))}
      </div>
    </div>
  )
}

export function SummaryInvoicingTab({ project, summary }: SummaryInvoicingTabProps) {
  const locale = useLocale()
  const { user } = useAuth()
  const companyName = user?.contractor_profile?.company_name || 'Contractor'
  const settingsIntegrationsHref = `/${locale}/settings?tab=integrations`

  const [qboPayload, setQboPayload] = useState<QBOProjectInvoiceDetailResponse | null>(null)
  const [qboLoading, setQboLoading] = useState(false)
  const [qboError, setQboError] = useState<string | null>(null)

  const fetchQBODetail = useCallback(async () => {
    try {
      setQboLoading(true)
      setQboError(null)
      const data = await api.getQBOProjectInvoiceDetail(project.id)
      setQboPayload(data)

      if (data.quickbooks_connected && data.invoices.length > 0) {
        let anyUpdated = false
        for (const inv of data.invoices) {
          try {
            const sync = await api.syncQBOInvoicePaymentStatus(inv.job_id)
            if (sync.updated) anyUpdated = true
          } catch {
            /* ignore per-job sync errors */
          }
        }
        if (anyUpdated) {
          const refreshed = await api.getQBOProjectInvoiceDetail(project.id)
          setQboPayload(refreshed)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invoice details'
      setQboError(msg)
    } finally {
      setQboLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    fetchQBODetail()
  }, [fetchQBODetail])


  let qboSectionBody: ReactNode = null

  if (qboLoading && !qboPayload) {
    qboSectionBody = (
      <Card className="border-border">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  } else if (qboError) {
    qboSectionBody = (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{qboError}</p>
          <Button variant="outline" size="sm" onClick={fetchQBODetail} className="mt-3">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  } else if (qboPayload && !qboPayload.quickbooks_connected) {
    const manual = qboPayload.manual_paid_quotes ?? []
    qboSectionBody = (
      <div className="space-y-6">
        <Card className="border-dashed border-border bg-muted/80">
          <CardContent className="p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Connect QuickBooks</p>
              <p className="text-xs text-muted-foreground mt-1">Settings → Integrations</p>
            </div>
            <Button asChild>
              <Link href={settingsIntegrationsHref}>Connect</Link>
            </Button>
          </CardContent>
        </Card>
        <ManualPaidQuotesSection rows={manual} locale={locale} />
      </div>
    )
  } else if (qboPayload && qboPayload.quickbooks_connected) {
    const manual = qboPayload.manual_paid_quotes ?? []
    const invoices = qboPayload.invoices ?? []
    const hasQbo = invoices.length > 0
    const hasManual = manual.length > 0

    if (!hasQbo && !hasManual) {
      qboSectionBody = (
        <Card className="border-dashed border-border bg-muted">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">No QuickBooks invoices on linked quotes yet.</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When you sync invoices from QuickBooks, they appear here. Paid quotes without QuickBooks also list under
              Other payments when applicable.
            </p>
          </CardContent>
        </Card>
      )
    } else {
      qboSectionBody = (
        <div className="space-y-6">
          {hasQbo && (
            <div className="space-y-4">
              {qboPayload.multiple_invoices && (
                <Alert className="border-status-pending/30 bg-status-pending/10 text-foreground py-3">
                  <AlertCircle className="h-4 w-4 text-status-pending" />
                  <AlertTitle className="text-status-pending text-sm">{qboPayload.invoice_count} invoices</AlertTitle>
                  <AlertDescription className="text-status-pending/90 text-xs">
                    One card per linked quote; totals are separate.
                  </AlertDescription>
                </Alert>
              )}
              {invoices.map((inv) => (
                <QboInvoiceCard key={`${inv.job_id}-${inv.qbo_invoice_id}`} detail={inv} />
              ))}
            </div>
          )}
          <ManualPaidQuotesSection rows={manual} locale={locale} className={hasQbo ? 'pt-2 border-t border-border' : undefined} />
        </div>
      )
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Snapshot</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="bg-status-pending/10 border-status-pending/30">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-status-pending uppercase tracking-wide">Material Cost</p>
              <p className="text-lg font-bold text-status-pending mt-1 tabular-nums">{formatCurrency(summary.total_materials)}</p>
            </CardContent>
          </Card>

          <Card className="bg-muted border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{companyName} Cost</p>
              <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{formatCurrency(summary.total_cost_items)}</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Total Invoiced</p>
              <p className="text-lg font-bold text-primary mt-1 tabular-nums">{formatCurrency(summary.total_invoiced)}</p>
            </CardContent>
          </Card>

          <Card className="bg-status-active/10 border-status-active/30">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-status-active uppercase tracking-wide">Collected</p>
              <p className="text-lg font-bold text-status-active mt-1 tabular-nums">{formatCurrency(summary.total_paid)}</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">{companyName} Profit</p>
              <p className="text-lg font-bold text-primary mt-1 tabular-nums">{formatCurrency(summary.profit_to_date)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">QuickBooks</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchQBODetail}
            disabled={qboLoading}
            className="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9"
            title="Refresh"
            aria-label="Refresh QuickBooks data"
          >
            <RefreshCw className={`w-4 h-4 ${qboLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {qboSectionBody}
      </div>
    </div>
  )
}
