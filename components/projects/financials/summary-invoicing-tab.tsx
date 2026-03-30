'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectFinancialSummary, QBOInvoiceDetail } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { FileText, Send, ExternalLink, Loader2, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface SummaryInvoicingTabProps {
  project: Project
  summary: ProjectFinancialSummary
}

export function SummaryInvoicingTab({ project, summary }: SummaryInvoicingTabProps) {
  const [qboDetail, setQboDetail] = useState<(QBOInvoiceDetail & { has_invoice: boolean }) | null>(null)
  const [qboLoading, setQboLoading] = useState(false)
  const [qboError, setQboError] = useState<string | null>(null)

  const fetchQBODetail = async () => {
    try {
      setQboLoading(true)
      setQboError(null)
      const data = await api.getQBOProjectInvoiceDetail(project.id)
      setQboDetail(data)
    } catch (err: any) {
      if (err?.message?.includes('not connected') || err?.message?.includes('No quote/job linked')) {
        setQboDetail(null)
      } else {
        setQboError(err?.message || 'Failed to load invoice details')
      }
    } finally {
      setQboLoading(false)
    }
  }

  useEffect(() => {
    fetchQBODetail()
  }, [project.id])

  const chartData = [
    { name: 'Invoiced', value: Number(summary.total_invoiced) },
    { name: 'Remaining to Invoice', value: Math.max(0, Number(summary.adjusted_budget) - Number(summary.total_invoiced)) }
  ]
  
  const COLORS = ['#F26522', '#cbd5e1']

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
      case 'Partially Paid':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold"><Clock className="w-3 h-3 mr-1" /> Partially Paid</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold"><AlertCircle className="w-3 h-3 mr-1" /> Open</Badge>
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Financial Snapshot + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Financial Snapshot */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Financial Snapshot</h2>
          
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
            
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.total_paid)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-100">
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
                  <span className="text-slate-600">Invoiced vs Budget</span>
                  <span className="text-slate-800">{summary.invoiced_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-3" style={{ width: `${Math.min(summary.invoiced_pct, 100)}%` }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">Collected vs Budget</span>
                  <span className="text-slate-800">{summary.collected_pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-3" style={{ width: `${Math.min(summary.collected_pct, 100)}%` }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Chart */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Client Billing Status</h2>
          
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
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">{summary.invoiced_pct}%</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Invoiced</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* QBO Invoice Detail Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">QuickBooks Invoice</h2>
          {qboDetail?.has_invoice && (
            <Button variant="ghost" size="sm" onClick={fetchQBODetail} disabled={qboLoading} className="text-slate-500 hover:text-slate-700">
              <RefreshCw className={`w-4 h-4 mr-1 ${qboLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          )}
        </div>

        {qboLoading && !qboDetail ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </CardContent>
          </Card>
        ) : qboError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{qboError}</p>
              <Button variant="outline" size="sm" onClick={fetchQBODetail} className="mt-3">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : !qboDetail || !qboDetail.has_invoice ? (
          <Card className="border-dashed border-slate-300 bg-slate-50">
            <CardContent className="p-8 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No QuickBooks invoice linked to this project.</p>
              <p className="text-xs text-slate-400 mt-1">Create an invoice from the quote page to see details here.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 overflow-hidden">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-slate-50 to-white p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    Invoice {qboDetail.doc_number || `#${qboDetail.qbo_invoice_id}`}
                  </h3>
                  {getStatusBadge(qboDetail.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {qboDetail.txn_date && <span>Issued: {new Date(qboDetail.txn_date).toLocaleDateString()}</span>}
                  {qboDetail.due_date && <span>Due: {new Date(qboDetail.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              {qboDetail.qbo_invoice_url && (
                <a href={qboDetail.qbo_invoice_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View in QuickBooks
                  </Button>
                </a>
              )}
            </div>

            {/* Payment Summary Cards */}
            <div className="grid grid-cols-3 divide-x border-b">
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(qboDetail.total)}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(qboDetail.amount_paid)}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Balance Due</p>
                <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(qboDetail.balance)}</p>
              </div>
            </div>

            {/* Line Items Table */}
            {qboDetail.line_items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <th className="text-left p-3 font-semibold">Description</th>
                      <th className="text-right p-3 font-semibold">Qty</th>
                      <th className="text-right p-3 font-semibold">Rate</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {qboDetail.line_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-700">{item.description || '—'}</td>
                        <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                        <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr className="text-slate-600">
                      <td colSpan={3} className="p-3 text-right font-medium">Subtotal</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(qboDetail.subtotal)}</td>
                    </tr>
                    {qboDetail.tax_total > 0 && (
                      <tr className="text-slate-600">
                        <td colSpan={3} className="p-3 text-right font-medium">Tax</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(qboDetail.tax_total)}</td>
                      </tr>
                    )}
                    <tr className="text-slate-800 font-bold text-base">
                      <td colSpan={3} className="p-3 text-right">Total</td>
                      <td className="p-3 text-right">{formatCurrency(qboDetail.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Footer with sync info */}
            {qboDetail.synced_at && (
              <div className="px-5 py-3 bg-slate-50 border-t text-xs text-slate-400 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                Synced to QuickBooks on {new Date(qboDetail.synced_at).toLocaleDateString()} at {new Date(qboDetail.synced_at).toLocaleTimeString()}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
