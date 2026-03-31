'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Project, ProjectPayment, ProjectFinancialSummary, FinancialPaymentMethod } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Plus, CreditCard, Banknote, Landmark, Send, CircleArrowDown, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FinancialSidebarProps {
  project: Project
  payments: ProjectPayment[]
  summary: ProjectFinancialSummary | null
  onPaymentAdded: () => void
}

export function FinancialSidebar({ project, payments, summary, onPaymentAdded }: FinancialSidebarProps) {
  const { toast } = useToast()
  
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Payment Form State
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<FinancialPaymentMethod>('CHECK')
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0])
  const [invoiceRef, setInvoiceRef] = useState('')
  const [notes, setNotes] = useState('')

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) return
    
    try {
      setIsSubmitting(true)
      await api.createProjectPayment(project.id, {
        amount: Number(amount),
        payment_method: method,
        payment_date: dateStr,
        invoice_number: invoiceRef || null,
        notes: notes || null
      })
      
      toast({ title: 'Payment logged successfully' })
      setOpenPaymentModal(false)
      onPaymentAdded()
      
      // Reset form
      setAmount('')
      setInvoiceRef('')
      setNotes('')
    } catch (err: any) {
      toast({
        title: 'Error logging payment',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return
    try {
      await api.deleteProjectPayment(project.id, paymentId)
      toast({ title: 'Payment deleted' })
      onPaymentAdded()
    } catch (err: any) {
      toast({
        title: 'Error deleting payment',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CHECK': return <Banknote className="w-4 h-4" />
      case 'WIRE': return <Send className="w-4 h-4" />
      case 'ACH': return <Landmark className="w-4 h-4" />
      case 'CREDIT_CARD': return <CreditCard className="w-4 h-4" />
      default: return <CircleArrowDown className="w-4 h-4" />
    }
  }

  // Use the safe summary or default to 0s
  const totalPaid = summary?.total_paid ?? 0
  const remainingBalance = summary?.remaining_balance || 0
  const adjustedBudget = summary?.adjusted_budget || 0
  const collectedPct = summary?.collected_pct || 0

  return (
    <div className="space-y-6">
      {/* 1. PAYMENTS RECEIVED CARD */}
      <Card className="border shadow-sm top-6 sticky">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between pb-3 pt-4 px-4 sticky top-0 rounded-t-lg z-10">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Payments Received
          </CardTitle>
          
          <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Log payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      required 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={dateStr} 
                      onChange={e => setDateStr(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="WIRE">Wire Transfer</SelectItem>
                      <SelectItem value="ACH">ACH</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Invoice # (Optional)</Label>
                  <Input 
                    placeholder="e.g. INV-2025-001" 
                    value={invoiceRef} 
                    onChange={e => setInvoiceRef(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600">
                    {isSubmitting ? 'Logging...' : 'Save Payment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="p-4 space-y-4 bg-white">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Collected</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Due</p>
                <p className="text-lg font-bold text-orange-500">{formatCurrency(remainingBalance)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span className="tabular-nums">
                  {Number.isInteger(collectedPct) ? collectedPct : collectedPct.toFixed(1)}% collected
                </span>
                {adjustedBudget > 0 && (
                  <span className="tabular-nums">Budget {formatCurrency(adjustedBudget)}</span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(collectedPct, 100)}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="divide-y border-t bg-slate-50/50">
            {payments.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">No entries</div>
            ) : (
              payments.map(payment => (
                <div key={payment.id} className="p-4 flex items-center justify-between group">
                  <div className="flex items-start space-x-3">
                    <div className="bg-white p-2 border rounded-md shadow-sm text-slate-500">
                      {getMethodIcon(payment.payment_method)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(payment.amount)}</p>
                      <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                        {payment.invoice_number && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-600">{payment.invoice_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
