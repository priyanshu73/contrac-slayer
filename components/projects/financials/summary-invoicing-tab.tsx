'use client'

import { Project, ProjectFinancialSummary } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileText, Send } from 'lucide-react'

interface SummaryInvoicingTabProps {
  project: Project
  summary: ProjectFinancialSummary
}

export function SummaryInvoicingTab({ project, summary }: SummaryInvoicingTabProps) {
  // Chart Data
  const chartData = [
    { name: 'Invoiced', value: Number(summary.total_invoiced) },
    { name: 'Remaining to Invoice', value: Math.max(0, Number(summary.adjusted_budget) - Number(summary.total_invoiced)) }
  ]
  
  const COLORS = ['#F26522', '#cbd5e1'] // Orange for invoiced, slate-300 for remaining

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        {/* Progress Bars */}
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

      {/* RIGHT COLUMN: Chart & Invoicing */}
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
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{summary.invoiced_pct}%</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Invoiced</span>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6 w-full max-w-sm">
            <Button variant="outline" className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold">
              <FileText className="w-4 h-4 mr-2" /> View Invoices
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <Send className="w-4 h-4 mr-2" /> Create Invoice
            </Button>
          </div>
        </Card>
        
        {/* Placeholder for actual invoice list if we had the data in summary */}
        <div className="bg-slate-50 rounded-lg p-6 border text-center border-dashed">
          <div className="text-slate-400 mb-2">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No recent invoices generated.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
