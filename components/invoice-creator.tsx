"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIPricingSuggestions } from "@/components/ai-pricing-suggestions"

export function InvoiceCreator() {
  const [showAIPricing, setShowAIPricing] = useState(false)
  const [serviceDescription, setServiceDescription] = useState("")
  const [items, setItems] = useState([{ description: "", quantity: 1, rate: 0 }])

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + tax

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Client Information */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Client Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name</Label>
            <Input id="client-name" placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" type="email" placeholder="john@example.com" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="client-address">Address</Label>
            <Input id="client-address" placeholder="123 Oak Street, Springfield, IL 62701" />
          </div>
        </div>
      </Card>

      {/* AI Pricing Assistant */}
      <Card className="border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">AI Pricing Assistant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get competitive pricing suggestions based on your service description and local market rates
            </p>
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Describe the service (e.g., 'Weekly lawn mowing for 5,000 sq ft property with edging and cleanup')"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="min-h-[80px] bg-background"
              />
              <Button onClick={() => setShowAIPricing(true)} disabled={!serviceDescription.trim()}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get AI Pricing Suggestions
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {showAIPricing && serviceDescription && (
        <AIPricingSuggestions
          serviceDescription={serviceDescription}
          onSelectPrice={(price) => {
            if (items.length === 1 && !items[0].description) {
              updateItem(0, "description", serviceDescription)
              updateItem(0, "rate", price)
            }
            setShowAIPricing(false)
          }}
        />
      )}

      {/* Line Items */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Line Items</h2>
          <Button variant="outline" size="sm" onClick={addItem}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Label htmlFor={`item-desc-${index}`} className="text-xs">
                  Description
                </Label>
                <Input
                  id={`item-desc-${index}`}
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Service description"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`item-qty-${index}`} className="text-xs">
                  Quantity
                </Label>
                <Input
                  id={`item-qty-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor={`item-rate-${index}`} className="text-xs">
                  Rate
                </Label>
                <Input
                  id={`item-rate-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => updateItem(index, "rate", Number.parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">${(item.quantity * item.rate).toFixed(2)}</span>
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (8%)</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Additional Details */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Additional Details</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Add any additional notes or terms..." className="min-h-[100px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input id="due-date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Input id="payment-terms" placeholder="Net 30" />
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button size="lg">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Create Invoice
        </Button>
        <Button size="lg" variant="outline">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Preview
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="/invoices">Cancel</a>
        </Button>
      </div>
    </div>
  )
}
