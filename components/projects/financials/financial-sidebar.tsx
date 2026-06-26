'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Project, ProjectPayment, ProjectFinancialSummary, FinancialPaymentMethod } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Plus, CreditCard, Banknote, Landmark, Send, CircleArrowDown, Trash2, AlertTriangle } from 'lucide-react'
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
  // Contract reconciliation: flag when the budget is a manual override that has
  // drifted from the quote-derived total.
  const contractOverridden = summary?.contract_overridden ?? false
  const contractDrift = summary?.contract_drift || 0
  const derivedContract = summary?.derived_contract_total ?? 0
  const showDrift = contractOverridden && Math.abs(contractDrift) > 0.01
  // Over-budget: collected has run past the contract budget. Split the bar into a
  // green (within-budget) and a yellow (overage) segment, and say by how much.
  const overBudget = adjustedBudget > 0 ? Math.max(0, totalPaid - adjustedBudget) : 0
  const isOverBudget = overBudget > 0.01
  const barDenom = isOverBudget ? totalPaid : adjustedBudget > 0 ? adjustedBudget : 1
  const greenWidth = isOverBudget ? (adjustedBudget / barDenom) * 100 : Math.min(collectedPct, 100)
  const yellowWidth = isOverBudget ? (overBudget / barDenom) * 100 : 0

  return (
    <div className="space-y-6">
      {/* 1. PAYMENTS RECEIVED CARD */}
      <Card className="border shadow-sm top-6 sticky">
        <CardHeader className="bg-muted border-b flex flex-row items-center justify-between pb-3 pt-4 px-4 sticky top-0 rounded-t-lg z-10">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Payments Received
          </CardTitle>
          
          <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-white transition-colors">
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
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
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
                  <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                    {isSubmitting ? 'Logging...' : 'Save Payment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="p-4 space-y-4 bg-card">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Collected</p>
                <p className="text-2xl font-bold text-status-active">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Due</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(remainingBalance)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span className="tabular-nums">
                  {Number.isInteger(collectedPct) ? collectedPct : collectedPct.toFixed(1)}% collected
                </span>
                {adjustedBudget > 0 && (
                  <span className="tabular-nums">Budget {formatCurrency(adjustedBudget)}</span>
                )}
              </div>
              <div className="flex w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-status-active h-2 transition-all duration-500"
                  style={{ width: `${greenWidth}%` }}
                />
                {isOverBudget && (
                  <div
                    className="bg-status-pending h-2 transition-all duration-500"
                    style={{ width: `${yellowWidth}%` }}
                  />
                )}
              </div>
              {isOverBudget && (
                <p className="text-[11px] font-medium text-status-pending tabular-nums">
                  Over budget by {formatCurrency(overBudget)} ({Math.round((overBudget / adjustedBudget) * 100)}%)
                </p>
              )}
            </div>

            {showDrift && (
              <div className="flex items-start gap-1.5 rounded-md bg-status-pending/10 border border-status-pending/30 px-2.5 py-2 text-[11px] leading-snug text-status-pending">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span>
                  Budget is overridden — quote-derived total is {formatCurrency(derivedContract)}
                  {' '}({contractDrift > 0 ? '+' : '−'}{formatCurrency(Math.abs(contractDrift))}).
                </span>
              </div>
            )}
          </div>

          <div className="divide-y border-t bg-muted/50">
            {payments.length === 0 ? (
              <div className="p-5 text-center text-xs text-muted-foreground">No entries</div>
            ) : (
              payments.map(payment => (
                <div key={payment.id} className="p-4 flex items-center justify-between group">
                  <div className="flex items-start space-x-3">
                    <div className="bg-background p-2 border rounded-md shadow-sm text-muted-foreground">
                      {getMethodIcon(payment.payment_method)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                      <div className="text-xs text-muted-foreground flex items-center space-x-2 mt-0.5">
                        <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                        {payment.invoice_number && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-medium text-muted-foreground">{payment.invoice_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
