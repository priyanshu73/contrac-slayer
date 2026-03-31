'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  Project,
  ProjectFinancialSummary,
  QBOInvoiceDetail,
  QBOProjectInvoiceDetailResponse,
  ManualPaidQuoteSnapshot,
} from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
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

function pctDisplay(n: number): string {
  const t = Math.round(n * 10) / 10
  return Number.isInteger(t) ? String(t) : t.toFixed(1)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Paid':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
        </Badge>
      )
    case 'Partially Paid':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold">
          <Clock className="w-3 h-3 mr-1" /> Partially Paid
        </Badge>
      )
    default:
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold">
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
    <Card className="border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-800">
              Inv. {detail.doc_number || detail.qbo_invoice_id}
            </h3>
            <span className="text-xs text-slate-500">#{detail.job_id}</span>
            {getStatusBadge(detail.status)}
          </div>
          {dateStr && <p className="text-xs text-slate-500">{dateStr}</p>}
        </div>
        {detail.qbo_invoice_url && (
          <a href={detail.qbo_invoice_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50 h-8">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> QBO
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x border-b text-center">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Total</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">{formatCurrency(detail.total)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Paid</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(detail.amount_paid)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-orange-600 uppercase">Due</p>
          <p className="text-lg font-bold text-orange-600 mt-0.5">{formatCurrency(detail.balance)}</p>
        </div>
      </div>

      {detail.line_items.length > 0 && (
        <details className="group border-b">
          <summary className="px-4 py-2.5 text-xs font-medium text-slate-600 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50/80 [&::-webkit-details-marker]:hidden">
            <span>Line items ({detail.line_items.length})</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left p-2 font-semibold">Item</th>
                  <th className="text-right p-2 font-semibold">Qty</th>
                  <th className="text-right p-2 font-semibold">Rate</th>
                  <th className="text-right p-2 font-semibold">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {detail.line_items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2 text-slate-700 max-w-[200px] truncate" title={item.description || undefined}>
                      {item.description || '—'}
                    </td>
                    <td className="p-2 text-right text-slate-600">{item.quantity}</td>
                    <td className="p-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                    <td className="p-2 text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t text-slate-600 text-xs">
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
                <tr className="text-slate-800 font-bold">
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
        <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-400">
          Synced {new Date(detail.synced_at).toLocaleDateString()}
        </div>
      )}
    </Card>
  )
}

function ManualPaidQuoteCard({ row, locale }: { row: ManualPaidQuoteSnapshot; locale: string }) {
  const href = `/${locale}/quotes/${row.job_id}`
  return (
    <Card className="border-emerald-200/80 overflow-hidden border-l-4 border-l-emerald-500 shadow-sm">
      <div className="bg-gradient-to-r from-emerald-50/90 to-white p-4 border-b border-emerald-100/80 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Banknote className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">{row.title}</h3>
            <span className="text-xs text-slate-500">#{row.job_id}</span>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold shadow-none">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Paid · App only
            </Badge>
          </div>
          {row.client_name && <p className="text-xs text-slate-600 pl-10 sm:pl-0">{row.client_name}</p>}
          <p className="text-xs text-slate-500 pl-10 sm:pl-0">No QuickBooks invoice linked — counted as collected in the snapshot.</p>
        </div>
        <Button variant="outline" size="sm" className="border-slate-200 shrink-0 h-8" asChild>
          <Link href={href}>
            <FileText className="w-3.5 h-3.5 mr-1" /> Open quote
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 divide-x border-b border-slate-100 text-center">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Total</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">{formatCurrency(row.total_amount)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Paid</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(row.total_amount)}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Due</p>
          <p className="text-lg font-bold text-slate-400 mt-0.5">{formatCurrency(0)}</p>
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
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <Banknote className="w-4 h-4 text-emerald-600" />
        Other payments
        <span className="text-slate-500 font-normal">(no QuickBooks invoice)</span>
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-3 max-w-xl">
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

  const invoicedNum = Number(summary.total_invoiced)
  const budgetAdj = Number(summary.adjusted_budget)
  const chartBudget = Math.max(budgetAdj, invoicedNum, budgetAdj > 0 || invoicedNum > 0 ? 0 : 1)
  const remainingToInvoice = Math.max(0, chartBudget - invoicedNum)

  const chartData = [
    { name: 'Invoiced', value: invoicedNum },
    { name: 'Remaining to Invoice', value: remainingToInvoice },
  ]

  const COLORS = ['#F26522', '#cbd5e1']

  let qboSectionBody: ReactNode = null

  if (qboLoading && !qboPayload) {
    qboSectionBody = (
      <Card className="border-slate-200">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    )
  } else if (qboError) {
    qboSectionBody = (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{qboError}</p>
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
        <Card className="border-dashed border-slate-300 bg-slate-50/80">
          <CardContent className="p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Connect QuickBooks</p>
              <p className="text-xs text-slate-500 mt-1">Settings → Integrations</p>
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
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-500">No QuickBooks invoices on linked quotes yet.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
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
                <Alert className="border-amber-200 bg-amber-50/80 text-amber-950 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-900 text-sm">{qboPayload.invoice_count} invoices</AlertTitle>
                  <AlertDescription className="text-amber-900/90 text-xs">
                    One card per linked quote; totals are separate.
                  </AlertDescription>
                </Alert>
              )}
              {invoices.map((inv) => (
                <QboInvoiceCard key={`${inv.job_id}-${inv.qbo_invoice_id}`} detail={inv} />
              ))}
            </div>
          )}
          <ManualPaidQuotesSection rows={manual} locale={locale} className={hasQbo ? 'pt-2 border-t border-slate-200' : undefined} />
        </div>
      )
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Snapshot</h2>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Adjusted Budget</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(summary.adjusted_budget)}</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-100">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase">Total Invoiced</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(summary.total_invoiced)}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Payments Logged</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">
                  {formatCurrency(
                    summary.payments_logged_total !== undefined
                      ? summary.payments_logged_total
                      : (summary.total_paid ?? 0),
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase">Collected</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.total_paid)}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-100 col-span-2">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase">GC Profit to Date</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(summary.profit_to_date)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">Invoiced</span>
                  <span className="text-slate-800 tabular-nums">{pctDisplay(summary.invoiced_pct)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-3"
                    style={{ width: `${Math.min(summary.invoiced_pct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">Collected</span>
                  <span className="text-slate-800 tabular-nums">{pctDisplay(summary.collected_pct)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-3"
                    style={{ width: `${Math.min(summary.collected_pct, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Billing</h2>

          <Card className="flex flex-col items-center p-6 border-slate-200">
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
                  {pctDisplay(summary.invoiced_pct)}%
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
                  invoiced
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">QuickBooks</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchQBODetail}
            disabled={qboLoading}
            className="text-slate-500 hover:text-slate-700 shrink-0 h-9 w-9"
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
