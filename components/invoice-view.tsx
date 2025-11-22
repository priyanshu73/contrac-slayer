"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Invoice {
  id: number
  invoice_number: string
  issue_date: string
  due_date: string
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'PAID' | 'OVERDUE'
  subtotal: number
  tax_amount: number
  discount_amount?: number
  discount_percentage?: number
  total_amount: number
  amount_paid: number
  balance_due: number
  payment_terms?: string
  notes?: string
  line_items: Array<{
    id: number
    description: string
    quantity: number
    unit_price: number
    tax_rate?: number
    is_taxable: boolean
    subtotal: number
  }>
  contractor: {
    company_name: string
    address?: string
    phone_number?: string
    email: string
    website_url?: string
    logo_url?: string
  }
  client: {
    name: string
    email: string
    address?: string
    phone?: string
  }
  shareable_token?: string
}

interface InvoiceViewProps {
  invoice: Invoice
  isCustomerView?: boolean
  onPayment?: () => void
  onSignature?: () => void
  showActions?: boolean
}

export function InvoiceView({
  invoice,
  isCustomerView = false,
  onPayment,
  onSignature,
  showActions = true
}: InvoiceViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "SIGNED":
        return "bg-blue-100 text-blue-800"
      case "VIEWED":
        return "bg-yellow-100 text-yellow-800"
      case "SENT":
        return "bg-gray-100 text-gray-800"
      case "OVERDUE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Invoice Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Invoice</h2>
            <p className="mt-1 text-lg text-muted-foreground">#{invoice.invoice_number}</p>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Contractor Info */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">From:</h3>
            <p className="font-semibold">{invoice.contractor.company_name}</p>
            {invoice.contractor.address && (
              <p className="text-sm text-muted-foreground">{invoice.contractor.address}</p>
            )}
            {invoice.contractor.email && (
              <p className="text-sm text-muted-foreground">{invoice.contractor.email}</p>
            )}
            {invoice.contractor.phone_number && (
              <p className="text-sm text-muted-foreground">{invoice.contractor.phone_number}</p>
            )}
          </div>

          {/* Client Info */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Bill To:</h3>
            <p className="font-semibold">{invoice.client.name}</p>
            {invoice.client.address && (
              <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
            )}
            {invoice.client.email && (
              <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
            )}
            {invoice.client.phone && (
              <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground">Issue Date:</span>
              <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            {invoice.payment_terms && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">Payment Terms:</span>
                <span className="font-medium">{invoice.payment_terms}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 text-center font-medium">Qty</th>
                <th className="pb-3 text-right font-medium">Rate</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discount_amount && invoice.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Discount {invoice.discount_percentage ? `(${invoice.discount_percentage}%)` : ''}
              </span>
              <span className="font-medium text-green-600">-${invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">${invoice.tax_amount.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-green-600">${invoice.amount_paid.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-xl font-bold">
            <span>{invoice.amount_paid > 0 ? 'Balance Due' : 'Total'}</span>
            <span>${(invoice.amount_paid > 0 ? invoice.balance_due : invoice.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Notes:</p>
            <p className="mt-1 text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      {showActions && isCustomerView && (
        <div className="flex flex-wrap gap-3">
          {invoice.status === 'SENT' || invoice.status === 'VIEWED' ? (
            <>
              {onSignature && (
                <Button size="lg" onClick={onSignature}>
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Sign Invoice
                </Button>
              )}
              {onPayment && invoice.balance_due > 0 && (
                <Button size="lg" variant="default" onClick={onPayment}>
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay ${invoice.balance_due.toFixed(2)}
                </Button>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

