"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ProductSelector } from "@/components/product-selector"
import { SignatureCapture } from "@/components/signature-capture"

interface LineItem {
  id: number
  category: "labor" | "material" | "tax"
  description: string
  quantity?: number
  unit?: string
  unitPrice?: number
  total: number
  replaceable?: boolean
}

export function CustomerQuoteView({ quoteId }: { quoteId: string }) {
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null)
  const [showSignature, setShowSignature] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: 1,
      category: "labor",
      description: "Site Preparation & Excavation",
      quantity: 1,
      unit: "job",
      unitPrice: 850,
      total: 850,
    },
    {
      id: 2,
      category: "labor",
      description: "Patio Installation Labor",
      quantity: 20,
      unit: "hours",
      unitPrice: 75,
      total: 1500,
    },
    {
      id: 3,
      category: "material",
      description: "Natural Flagstone Pavers - Earth Tone Mix",
      quantity: 300,
      unit: "sq ft",
      unitPrice: 8.5,
      total: 2550,
      replaceable: true,
    },
    {
      id: 4,
      category: "material",
      description: "Polymeric Sand",
      quantity: 10,
      unit: "bags",
      unitPrice: 35,
      total: 350,
      replaceable: true,
    },
    {
      id: 5,
      category: "material",
      description: "Gravel Base (Class 5)",
      quantity: 4,
      unit: "yards",
      unitPrice: 45,
      total: 180,
      replaceable: true,
    },
    {
      id: 6,
      category: "tax",
      description: "Sales Tax (7.5%)",
      total: 403.5,
    },
  ])

  const [hasChanges, setHasChanges] = useState(false)

  // Mock quote data
  const quote = {
    id: quoteId,
    contractorName: "Johnson Landscaping",
    contractorLogo: "/landscaping-company-logo.png",
    customerName: "Sarah Johnson",
    projectTitle: "Backyard Patio Installation",
    expirationDate: "Nov 1, 2025",
    createdDate: "Oct 18, 2025",
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const total = subtotal

  const handleReplaceProduct = (item: LineItem) => {
    setSelectedLineItem(item)
    setShowProductSelector(true)
  }

  const handleProductSelected = (newProduct: any) => {
    if (selectedLineItem) {
      setLineItems(
        lineItems.map((item) =>
          item.id === selectedLineItem.id
            ? {
                ...item,
                description: newProduct.name,
                unitPrice: newProduct.unitPrice,
                total: (item.quantity || 1) * newProduct.unitPrice,
              }
            : item,
        ),
      )
      setHasChanges(true)
    }
    setShowProductSelector(false)
    setSelectedLineItem(null)
  }

  const handleAcceptQuote = () => {
    setShowSignature(true)
  }

  const handleSendChanges = () => {
    // Would send changes to contractor
    alert("Your suggested changes have been sent to the contractor!")
  }

  const handleSignatureComplete = (signature: string) => {
    // Would save signature and mark quote as accepted
    alert("Quote accepted! You'll receive a confirmation email shortly.")
    setShowSignature(false)
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <Card className="mb-6 p-6">
          <div className="flex items-start gap-4">
            <img
              src={quote.contractorLogo || "/placeholder.svg"}
              alt={quote.contractorName}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{quote.contractorName}</h1>
              <p className="mt-1 text-muted-foreground">Quote for {quote.customerName}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-semibold">{quote.projectTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quote Date</p>
              <p className="font-semibold">{quote.createdDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valid Until</p>
              <p className="font-semibold text-[var(--status-pending)]">{quote.expirationDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-bold">Quote Breakdown</h2>
          <Accordion type="multiple" defaultValue={["labor", "materials"]}>
            {/* Labor */}
            <AccordionItem value="labor">
              <AccordionTrigger className="text-lg font-semibold">
                Labor
                <span className="ml-auto mr-4 text-muted-foreground">
                  $
                  {lineItems
                    .filter((i) => i.category === "labor")
                    .reduce((sum, i) => sum + i.total, 0)
                    .toFixed(2)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {lineItems
                    .filter((item) => item.category === "labor")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          {item.quantity && item.unit && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.quantity} {item.unit} × ${item.unitPrice?.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">${item.total.toFixed(2)}</p>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Materials */}
            <AccordionItem value="materials">
              <AccordionTrigger className="text-lg font-semibold">
                Materials
                <span className="ml-auto mr-4 text-muted-foreground">
                  $
                  {lineItems
                    .filter((i) => i.category === "material")
                    .reduce((sum, i) => sum + i.total, 0)
                    .toFixed(2)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {lineItems
                    .filter((item) => item.category === "material")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          {item.quantity && item.unit && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.quantity} {item.unit} × ${item.unitPrice?.toFixed(2)}
                            </p>
                          )}
                          {item.replaceable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-auto p-0 text-primary hover:text-primary/80"
                              onClick={() => handleReplaceProduct(item)}
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                              </svg>
                              Suggest Replacement
                            </Button>
                          )}
                        </div>
                        <p className="font-semibold">${item.total.toFixed(2)}</p>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tax */}
            <AccordionItem value="tax">
              <AccordionTrigger className="text-lg font-semibold">
                Tax
                <span className="ml-auto mr-4 text-muted-foreground">
                  $
                  {lineItems
                    .filter((i) => i.category === "tax")
                    .reduce((sum, i) => sum + i.total, 0)
                    .toFixed(2)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {lineItems
                    .filter((item) => item.category === "tax")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <p className="font-medium">{item.description}</p>
                        <p className="font-semibold">${item.total.toFixed(2)}</p>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xl font-bold">Total</p>
            <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          {hasChanges ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--status-pending)]/10 p-4 text-sm text-[var(--status-pending)]">
                <p className="font-semibold">You've made changes to this quote</p>
                <p className="mt-1">Send your suggested changes to the contractor for review.</p>
              </div>
              <Button size="lg" className="w-full" onClick={handleSendChanges}>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send Suggested Changes to Contractor
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button size="lg" className="w-full" onClick={handleAcceptQuote}>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Accept & Sign Quote
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                By accepting, you agree to the terms and pricing outlined above
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && selectedLineItem && (
        <ProductSelector
          currentProduct={selectedLineItem}
          onSelect={handleProductSelected}
          onClose={() => {
            setShowProductSelector(false)
            setSelectedLineItem(null)
          }}
        />
      )}

      {/* Signature Capture Modal */}
      {showSignature && (
        <SignatureCapture
          customerName={quote.customerName}
          onComplete={handleSignatureComplete}
          onClose={() => setShowSignature(false)}
        />
      )}
    </>
  )
}
