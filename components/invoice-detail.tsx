"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  // Mock data - would come from database
  const invoice = {
    id: invoiceId,
    number: "INV-002",
    client: {
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      address: "456 Elm Street, Springfield, IL 62701",
      phone: "(555) 123-4567",
    },
    status: "pending",
    issueDate: "Oct 14, 2025",
    dueDate: "Oct 28, 2025",
    items: [
      { description: "Garden Design Consultation", quantity: 1, rate: 500, amount: 500 },
      { description: "Plant Selection & Sourcing", quantity: 1, rate: 800, amount: 800 },
      { description: "Installation Labor (2 days)", quantity: 2, rate: 600, amount: 1200 },
    ],
    subtotal: 2500,
    tax: 200,
    total: 2700,
    notes: "Payment due within 14 days. Thank you for your business!",
    paymentTerms: "Net 14",
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "pending":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "overdue":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Invoice Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Invoice</h2>
            <p className="mt-1 text-lg text-muted-foreground">#{invoice.number}</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-medium ${getStatusColor(invoice.status)}`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Bill To:</h3>
            <p className="font-semibold">{invoice.client.name}</p>
            <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
            <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
            <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Issue Date:</span>
                <span className="font-medium">{invoice.issueDate}</span>
              </div>
              <div className="flex justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Payment Terms:</span>
                <span className="font-medium">{invoice.paymentTerms}</span>
              </div>
            </div>
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
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">${item.rate.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">${item.amount.toFixed(2)}</td>
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (8%)</span>
            <span className="font-medium">${invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-xl font-bold">
            <span>Total</span>
            <span>${invoice.total.toFixed(2)}</span>
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
      <div className="flex flex-wrap gap-3">
        {invoice.status === "pending" && (
          <Button size="lg">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            Record Payment
          </Button>
        )}
        <Button size="lg" variant="outline">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Send to Client
        </Button>
        <Button size="lg" variant="outline">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download PDF
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href={`/invoices/${invoice.id}/edit`}>
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </a>
        </Button>
      </div>
    </div>
  )
}
