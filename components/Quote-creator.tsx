"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIPricingSuggestions } from "@/components/ai-pricing-suggestions"
import { MaterialSearchWidget } from "@/components/material-search-widget"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { Lead, ContractorProfile } from "@/lib/types"
import Image from "next/image"

interface LineItem {
  description: string
  quantity: number
  rate: number
  imageUrl?: string
  thumbnailUrl?: string
  brand?: string
  model?: string
  externalUrl?: string
}

// Material Thumbnail Component with proper fallback handling
function MaterialThumbnail({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [imageError, setImageError] = useState(false)

  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted border rounded ${className}`}>
        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden border rounded ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  )
}

interface QuoteCreatorProps {
  leadId?: string | null
}

export function QuoteCreator({ leadId }: QuoteCreatorProps) {
  const [showAIPricing, setShowAIPricing] = useState(false)
  const [serviceDescription, setServiceDescription] = useState("")
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0 }])
  
  // Client information states
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [loadingLead, setLoadingLead] = useState(false)
  
  // Quote creation states
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Markup control
  const [markupPercentage, setMarkupPercentage] = useState(0)

  // Fetch lead data if leadId is provided
  useEffect(() => {
    if (leadId) {
      fetchLeadData()
    }
  }, [leadId])

  const fetchLeadData = async () => {
    if (!leadId) return
    
    try {
      setLoadingLead(true)
      const data = await api.getLead(parseInt(leadId))
      const lead = data as Lead
      
      // Auto-fill client information
      setClientName(lead.name || "")
      setClientEmail(lead.email || "")
      setClientPhone(lead.phone || "")
      setClientAddress(lead.address || "")
      
      // Pre-fill service description if available
      if (lead.description) {
        setServiceDescription(lead.description)
      }
      
      // Pre-fill project type in first line item if available
      if (lead.project_type && items.length === 1 && !items[0].description) {
        updateItem(0, "description", lead.project_type)
      }
    } catch (error) {
      console.error("Failed to fetch lead data:", error)
    } finally {
      setLoadingLead(false)
    }
  }

  const extractZipCode = (address: string): string | undefined => {
    // Extract 5-digit ZIP code from address
    const zipMatch = address.match(/\b\d{5}\b/)
    return zipMatch ? zipMatch[0] : undefined
  }

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

  const validateForm = (): string | null => {
    if (!clientName.trim()) return "Client name is required"
    if (!clientEmail.trim()) return "Client email is required"
    if (!clientAddress.trim()) return "Client address is required"
    
    // Check if at least one line item has description and rate
    const validItems = items.filter(item => 
      item.description.trim() && item.quantity > 0 && item.rate > 0
    )
    
    if (validItems.length === 0) {
      return "At least one line item with description, quantity, and rate is required"
    }
    
    return null
  }

  const handleCreateQuote = async () => {
    // Clear previous errors
    setCreateError(null)
    
    // Validate form
    const validationError = validateForm()
    if (validationError) {
      setCreateError(validationError)
      return
    }
    
    setIsCreatingQuote(true)
    
    try {
      // Filter out empty items
      const validItems = items.filter(item => 
        item.description.trim() && item.quantity > 0 && item.rate > 0
      )
      
      // Prepare job data
      const jobData = {
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim(),
        location_zip_code: extractZipCode(clientAddress),
        items: validItems.map(item => ({
          custom_description: item.description.trim(),
          quantity: item.quantity,
          cost_per_unit: item.rate,
          image_url: item.imageUrl || null,
          thumbnail_url: item.thumbnailUrl || null,
          brand: item.brand || null,
          model: item.model || null,
          unit_of_measure: "each", // Default unit
          is_taxable: true,
          markup_percentage: markupPercentage,
        }))
      }
      
      // Create the job/quote
      const response = await api.createJob(jobData)
      
      // Success! Redirect to job details page
      if (response && (response as any).id) {
        window.location.href = `/jobs/${(response as any).id}`
      } else {
        throw new Error("Invalid response from server")
      }
      
    } catch (error: any) {
      console.error("Failed to create quote:", error)
      setCreateError(
        error.message || 
        "Failed to create quote. Please check your information and try again."
      )
    } finally {
      setIsCreatingQuote(false)
    }
  }

  // Calculate base subtotal (without markup)
  const baseSubtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.rate)
  }, 0)
  
  // Calculate markup amount
  const markupAmount = baseSubtotal * (markupPercentage / 100)
  
  // Calculate subtotal with markup
  const subtotal = baseSubtotal + markupAmount
  
  // Use 8% tax for now (should match backend calculation)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Client Information */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Client Information</h2>
          {leadId && (
            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
              Auto-filled from Lead
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name *</Label>
            <Input 
              id="client-name" 
              placeholder="John Smith" 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={loadingLead}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email *</Label>
            <Input 
              id="client-email" 
              type="email" 
              placeholder="john@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              disabled={loadingLead}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input 
              id="client-phone" 
              type="tel" 
              placeholder="(555) 123-4567"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              disabled={loadingLead}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address">Address</Label>
            <Input 
              id="client-address" 
              placeholder="123 Oak Street, Springfield, IL"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              disabled={loadingLead}
            />
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

      {/* Material Search */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Search Materials</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Search Home Depot for materials to add to your quote
            </p>
          </div>
        </div>
        <MaterialSearchWidget
          zipCode={clientAddress ? extractZipCode(clientAddress) : undefined}
          onAddMaterial={(material) => {
            // Add material as new line item with image data
            setItems([...items, {
              description: material.name,
              quantity: 1,
              rate: parseFloat(material.estimated_cost),
              imageUrl: material.image_url, // Use actual image URL from API
              thumbnailUrl: material.thumbnail_url, // Use actual thumbnail URL from API
              brand: undefined,
              model: undefined,
              externalUrl: undefined
            }])
          }}
        />
      </Card>

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
              {/* Product Image Thumbnail */}
              <div className="sm:col-span-1 flex items-start pt-6">
                <MaterialThumbnail
                  src={item.thumbnailUrl}
                  alt={item.description}
                  className="w-12 h-12"
                />
              </div>
              <div className="sm:col-span-4">
                <Label htmlFor={`item-desc-${index}`} className="text-xs">
                  Description
                </Label>
                <Input
                  id={`item-desc-${index}`}
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Service description"
                />
                {item.brand && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.brand} {item.model && `- ${item.model}`}
                  </p>
                )}
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
            <span className="text-muted-foreground">Subtotal (before markup)</span>
            <span className="font-medium">${baseSubtotal.toFixed(2)}</span>
          </div>
          {markupPercentage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Markup ({markupPercentage}%)</span>
              <span className="font-medium text-primary">+${markupAmount.toFixed(2)}</span>
            </div>
          )}
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

      {/* Markup Controller */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Markup Settings</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <svg className="h-4 w-4 text-muted-foreground cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Markup percentage is applied to each line item. This is for your internal pricing and won't be visible to customers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
            Internal Use Only
          </span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="markup-percentage">Markup Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="markup-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(Number.parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to all line items
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Preview Impact</Label>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (no markup):</span>
                <span>${baseSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Markup amount:</span>
                <span className="text-primary">+${markupAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>New subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
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

      {/* Error Display */}
      {createError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error:</span>
            <span>{createError}</span>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          size="lg" 
          onClick={handleCreateQuote}
          disabled={isCreatingQuote}
        >
          {isCreatingQuote ? (
            <>
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Creating Quote...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Create Quote
            </>
          )}
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
