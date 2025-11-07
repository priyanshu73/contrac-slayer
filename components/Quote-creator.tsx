"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AIPricingSuggestions } from "@/components/ai-pricing-suggestions"
import { MaterialSearchWidget } from "@/components/material-search-widget"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
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
  unitOfMeasure?: string
  searchResults?: any[] // All search results for substitutes
  packSize?: number // Number of pieces per pack
  packPrice?: number // Total price for the pack
  sourceParsedItem?: any // Reference to the parsed item this match came from
}

// Common units for construction and landscaping
const COMMON_UNITS = [
  // Area units
  { value: "sq ft", label: "Square Feet (sq ft)" },
  { value: "sq yd", label: "Square Yards (sq yd)" },
  { value: "sq m", label: "Square Meters (sq m)" },
  
  // Volume units
  { value: "cu ft", label: "Cubic Feet (cu ft)" },
  { value: "cu yd", label: "Cubic Yards (cu yd)" },
  { value: "cu m", label: "Cubic Meters (cu m)" },
  
  // Weight units
  { value: "lb", label: "Pounds (lb)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "ton", label: "Tons" },
  
  // Length units
  { value: "linear ft", label: "Linear Feet" },
  { value: "linear yd", label: "Linear Yards" },
  { value: "m", label: "Meters (m)" },
  
  // Count units
  { value: "each", label: "Each" },
  { value: "piece", label: "Piece" },
  { value: "set", label: "Set" },
  { value: "box", label: "Box" },
  { value: "pallet", label: "Pallet" },
  { value: "bag", label: "Bag" },
  
  // Time units
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
]

// Smart unit suggestions based on description
function getSuggestedUnits(description: string): string[] {
  const desc = description.toLowerCase()
  
  if (desc.includes('paver') || desc.includes('tile') || desc.includes('flooring')) {
    return ['sq ft', 'each', 'pallet']
  }
  if (desc.includes('concrete') || desc.includes('mix')) {
    return ['bag', 'cu yd', 'lb']
  }
  if (desc.includes('mulch') || desc.includes('soil')) {
    return ['cu ft', 'bag', 'cu yd']
  }
  if (desc.includes('lumber') || desc.includes('board')) {
    return ['linear ft', 'board ft', 'each']
  }
  if (desc.includes('labor') || desc.includes('installation')) {
    return ['hour', 'sq ft', 'each']
  }
  
  return ['each', 'sq ft', 'cu ft', 'lb', 'hour']
}

// Unit Selector Component
function UnitSelector({ value, onChange, description }: { value: string; onChange: (value: string) => void; description: string }) {
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState("")
  
  const suggestedUnits = getSuggestedUnits(description)
  const commonUnitValues = COMMON_UNITS.map(unit => unit.value)
  
  useEffect(() => {
    if (value && !commonUnitValues.includes(value)) {
      setIsCustom(true)
      setCustomValue(value)
    }
  }, [value, commonUnitValues])
  
  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "custom") {
      setIsCustom(true)
      setCustomValue("")
    } else {
      setIsCustom(false)
      onChange(selectedValue)
    }
  }
  
  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue)
    onChange(newValue)
  }
  
  const handleCustomClose = () => {
    setIsCustom(false)
    setCustomValue("")
    onChange("")
  }
  
  return (
    <div className="space-y-1">
      {!isCustom ? (
        <Select value={value || ""} onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select unit..." />
          </SelectTrigger>
          <SelectContent>
            {/* Suggested units based on description */}
            {suggestedUnits.length > 0 && (
              <>
                {suggestedUnits.map(unit => {
                  const unitInfo = COMMON_UNITS.find(u => u.value === unit)
                  return (
                    <SelectItem key={unit} value={unit}>
                      {unitInfo?.label || unit}
                    </SelectItem>
                  )
                })}
                <div className="border-t my-1"></div>
              </>
            )}
            
            {/* All common units */}
            {COMMON_UNITS.map(unit => (
              <SelectItem key={unit.value} value={unit.value}>
                {unit.label}
              </SelectItem>
            ))}
            
            {/* Custom option */}
            <div className="border-t my-1"></div>
            <SelectItem value="custom">
              + Add custom unit
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-1">
          <Input
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Custom unit..."
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCustomClose}
            className="px-2"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}

// Material Thumbnail Component with proper fallback handling
function MaterialThumbnail({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [src])

  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted border border-border rounded-md ${className}`}>
        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden border border-border rounded-md ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        onLoadingComplete={() => setImageLoaded(true)}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}

interface QuoteCreatorProps {
  leadId?: string | null
}

export function QuoteCreator({ leadId }: QuoteCreatorProps) {
  const { toast } = useToast()
  const [showAIPricing, setShowAIPricing] = useState(false)
  const [serviceDescription, setServiceDescription] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<any[]>([])
  const [aiWorkingItems, setAiWorkingItems] = useState<LineItem[]>([])
  const [selectedForInvoice, setSelectedForInvoice] = useState<Set<number>>(new Set())
  const [isAiItemsOpen, setIsAiItemsOpen] = useState(true)
  const [items, setItems] = useState<LineItem[]>([])
  
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
  const [showSubstitute, setShowSubstitute] = useState(false)
  const [substituteItemIndex, setSubstituteItemIndex] = useState<number | null>(null)

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

  const fetchAiItems = async () => {
    setAiLoading(true)
    setAiResults([])
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
      const res = await fetch(`${base}/api/generate-lineitems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: serviceDescription, catalog_version: "v1" })
      })
      if (!res.ok) throw new Error(`Request failed ${res.status}`)
      const data = await res.json()
      const parsed = data?.parsed_items || []
      setAiResults(parsed)
      // Convert ALL AI matches to working items (not added to main items yet)
      const working: LineItem[] = []
      for (const pi of parsed) {
        const matches = Array.isArray(pi.matches) ? pi.matches : []
        if (matches.length === 0) continue
        
        // Add all matches for this parsed item
        for (const match of matches) {
          // Calculate per-piece price: divide pack price by pack_size if available
          const packPrice = Number(match.price_unit) || 0
          const packSize = match.pack_size ? Number(match.pack_size) : null
          
          // If packSize exists and > 1, calculate per-piece price; otherwise use packPrice as-is
          const perPiecePrice = (packSize && packSize > 1) ? packPrice / packSize : packPrice
          
          working.push({
            description: match.name,
            quantity: pi.parsed_object?.quantity || 1,
            rate: perPiecePrice, // Always store per-piece price
            imageUrl: match.image,
            thumbnailUrl: match.image,
            brand: match.vendor || pi.parsed_object?.brand || undefined,
            model: undefined,
            unitOfMeasure: match.unit || pi.parsed_object?.unit || "each",
            searchResults: [match],
            packSize: (packSize && packSize > 1) ? packSize : undefined,
            packPrice: (packPrice > 0 && packSize && packSize > 1) ? packPrice : undefined,
            sourceParsedItem: pi.parsed_object // Keep reference to which parsed item this came from
          })
        }
      }
      setAiWorkingItems(working)
      // Auto-select all items initially
      setSelectedForInvoice(new Set(working.map((_, idx) => idx)))
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubstitute = (index: number) => {
    setSubstituteItemIndex(index)
    setShowSubstitute(true)
  }

  const handleSubstituteSelect = (substitute: any) => {
    if (substituteItemIndex !== null) {
      const updatedItems = [...items]
      updatedItems[substituteItemIndex] = {
        ...updatedItems[substituteItemIndex],
        description: substitute.name,
        rate: parseFloat(substitute.estimated_cost),
        imageUrl: substitute.image_url,
        thumbnailUrl: substitute.thumbnail_url,
        brand: substitute.brand,
        model: substitute.model
      }
      setItems(updatedItems)
    }
    setShowSubstitute(false)
    setSubstituteItemIndex(null)
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
          external_url: item.externalUrl || null,
          unit_of_measure: item.unitOfMeasure || "each", // Use actual unit from material or default
          is_taxable: true,
          markup_percentage: markupPercentage,
        }))
      }
      
      // Create the job/quote
      const response = await api.createJob(jobData)
      
      // Success! Redirect to quote details page
      if (response && (response as any).id) {
        window.location.href = `/quotes/${(response as any).id}`
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
      <Card className="p-6" id="material-search">
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
              Get competitive pricing suggestions based on your line item description and local market rates
            </p>
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Describe the line item (e.g., '12x12 inch Charcoal Concrete Pavers - Pavestone - Home Depot')"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="min-h-[80px] bg-background"
              />
              {(() => {
                const desc = serviceDescription.trim()
                const wordCount = desc ? desc.split(/\s+/).length : 0
                const tooShort = desc.length < 30 || wordCount < 6
                return (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setShowAIPricing(true)} disabled={!serviceDescription.trim()}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get AI Pricing Suggestions
                </Button>
                <Button variant="outline" onClick={fetchAiItems} disabled={aiLoading || tooShort}>
                  {aiLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 animate-ping rounded-full bg-purple-500" />
                      Getting AI Line Items...
                    </span>
                  ) : (
                    "Get AI Line Items"
                  )}
                </Button>
                {tooShort && (
                  <p className="text-xs text-muted-foreground w-full">
                    Please add at least 30 characters and 6 words (material, size, brand/use) for better results.
                  </p>
                )}
              </div>
                )
              })()}
            </div>
          </div>
        </div>
      </Card>

      {showAIPricing && serviceDescription && (
        <AIPricingSuggestions
          serviceDescription={serviceDescription}
          onSelectPrice={(price) => {
            // Add new line item with the AI suggestion
            setItems([...items, {
              description: serviceDescription,
              quantity: 1,
              rate: price
            }])
            setShowAIPricing(false)
            toast({
              title: "Item added",
              description: `${serviceDescription ? `"${serviceDescription}"` : "Item"} has been added to your quote`,
            })
          }}
        />
      )}

      {/* AI Working Area */}
      {(aiLoading || aiResults.length > 0 || aiWorkingItems.length > 0) && (
        <Card className="p-6">
          <Collapsible open={isAiItemsOpen} onOpenChange={setIsAiItemsOpen}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                    <h2 className="text-lg font-semibold">AI Line Items - Working Area</h2>
                    <svg 
                      className={`h-5 w-5 transition-transform ${isAiItemsOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </CollapsibleTrigger>
                {aiWorkingItems.length > 0 && selectedForInvoice.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={async () => {
                        const selectedItems = aiWorkingItems.filter((_, idx) => selectedForInvoice.has(idx))
                        try {
                          const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
                          const res = await fetch(`${base}/api/generate-invoice`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              items: selectedItems,
                              client_name: clientName,
                              client_email: clientEmail,
                              client_phone: clientPhone,
                              client_address: clientAddress,
                              service_description: serviceDescription
                            })
                          })
                          if (!res.ok) throw new Error(`Request failed ${res.status}`)
                          const data = await res.json()
                          console.log("Invoice generated:", data)
                        } catch (e) {
                          console.error("Error generating invoice:", e)
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 group relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="h-5 w-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Invoice
                        <span className="ml-1 text-xs opacity-90">({selectedForInvoice.size})</span>
                      </span>
                      <div className="absolute inset-0 bg-primary/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center justify-center w-6 h-6 rounded-full border border-border bg-background hover:bg-muted transition-colors">
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Selected items ({selectedForInvoice.size}) will be used by AI to generate a professional invoice with pricing, quantities, and client information.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Review and manage AI-suggested items. Select items to include in invoice generation.
              </p>
              
              {/* Search Bar */}
              <div id="ai-material-search" className="mb-6">
                <MaterialSearchWidget
                  zipCode={clientAddress ? extractZipCode(clientAddress) : undefined}
                  onAddMaterial={(material) => {
                    const packPrice = parseFloat(material.estimated_cost) || 0
                    const packSize = 1 // Default if not available
                    const perPiecePrice = packPrice
                    const newIdx = aiWorkingItems.length
                    setAiWorkingItems(prev => [...prev, {
                      description: material.name,
                      quantity: parseInt(material.estimated_quantity) || 1,
                      rate: perPiecePrice,
                      imageUrl: material.image_url,
                      thumbnailUrl: material.thumbnail_url,
                      brand: material.brand,
                      model: material.model,
                      externalUrl: material.url,
                      unitOfMeasure: material.unit_of_measure,
                      searchResults: material.searchResults,
                      packSize: packSize > 1 ? packSize : undefined,
                      packPrice: packPrice > 0 ? packPrice : undefined
                    }])
                    setSelectedForInvoice(prev => new Set([...prev, newIdx]))
                    toast({
                      title: "Item added",
                      description: `${material.name || "Item"} has been added to AI working area`,
                    })
                  }}
                />
              </div>
            </div>

            <CollapsibleContent>
              {aiLoading && (
                <div className="space-y-4 mb-6 py-6">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="h-8 w-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">Analyzing your project description...</p>
                      <p className="text-sm text-muted-foreground mt-1">Finding the best matching materials from our catalog</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[0,1,2].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-primary/10 bg-primary/5 p-4">
                        <div className="h-5 w-56 bg-primary/20 rounded mb-2" />
                        <div className="h-4 w-72 bg-primary/10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Working Items List */}
              {aiWorkingItems.length > 0 && (
                <div className="mb-6 border rounded-lg overflow-hidden bg-gray-50/50">
                  <div className="max-h-96 overflow-y-auto p-3 custom-scrollbar">
                    <div className="space-y-2">
                      {aiWorkingItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 border rounded p-3 hover:bg-gray-50 transition-colors bg-white">
                  {/* Selection Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setSelectedForInvoice(prev => {
                              const next = new Set(prev)
                              if (next.has(idx)) {
                                next.delete(idx)
                              } else {
                                next.add(idx)
                              }
                              return next
                            })
                          }}
                          className={`flex-shrink-0 w-6 h-6 rounded border-2 transition-all ${
                            selectedForInvoice.has(idx)
                              ? "bg-green-500 border-green-600"
                              : "bg-white border-gray-300 hover:border-green-400"
                          }`}
                        >
                          {selectedForInvoice.has(idx) && (
                            <svg className="w-full h-full text-white p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedForInvoice.has(idx) ? "Deselect from invoice" : "Select for invoice generation"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <MaterialThumbnail src={item.imageUrl} alt={item.description} className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-2">{item.description}</div>
                    <div className="text-sm text-muted-foreground">
                      Qty: {item.quantity} {item.unitOfMeasure || "each"} • 
                      {item.packSize && item.packSize > 1 && item.packPrice ? (
                        <span> ${item.packPrice.toFixed(2)}/{item.packSize} {item.unitOfMeasure || "piece"} (${item.rate.toFixed(2)}/each)</span>
                      ) : (
                        <span> ${item.rate.toFixed(2)}/{item.unitOfMeasure || "each"}</span>
                      )}
                      {item.brand && ` • ${item.brand}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-9 w-9 p-0"
                            onClick={() => {
                              setItems(prev => [...prev, item])
                              toast({
                                title: "Item added",
                                description: `${item.description || "Item"} has been added to your quote`,
                              })
                            }}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add to main quote items</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button size="sm" variant="outline" onClick={() => {
                      const el = document.getElementById("ai-material-search")
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}>
                      Substitute
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      // Remove item and reindex selections
                      setAiWorkingItems(prev => prev.filter((_, i) => i !== idx))
                      setSelectedForInvoice(prev => {
                        const reindexed = new Set<number>()
                        Array.from(prev).forEach(oldIdx => {
                          if (oldIdx < idx) reindexed.add(oldIdx)
                          else if (oldIdx > idx) reindexed.add(oldIdx - 1)
                        })
                        return reindexed
                      })
                    }}>
                      Remove
                    </Button>
                  </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>
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
            // Add material as new line item with image data and search results
            setItems([...items, {
              description: material.name,
              quantity: parseInt(material.estimated_quantity) || 1,
              rate: parseFloat(material.estimated_cost),
              imageUrl: material.image_url, // Use actual image URL from API
              thumbnailUrl: material.thumbnail_url, // Use actual thumbnail URL from API
              brand: material.brand,
              model: material.model,
              externalUrl: material.url,
              unitOfMeasure: material.unit_of_measure, // Add unit of measure
              searchResults: material.searchResults // Store all search results for substitutes
            }])
            toast({
              title: "Item added",
              description: `${material.name || "Item"} has been added to your quote`,
            })
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
            <div key={index} className="rounded-lg border border-border p-4">
              {/* Mobile Layout */}
              <div className="block sm:hidden space-y-4">
                {/* Image and Description */}
                <div className="flex gap-3">
                  <MaterialThumbnail
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.description}
                    className="w-12 h-12 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`item-desc-${index}`} className="text-xs font-medium">
                      Line Item Description
                    </Label>
                    <Textarea
                      id={`item-desc-${index}`}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Describe the line item with dimensions, color, brand, and supplier..."
                      className="min-h-[60px] resize-none mt-1"
                    />
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.brand} {item.model && `- ${item.model}`}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Quantity, Unit, Rate Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`item-qty-${index}`} className="text-xs font-medium">
                      Qty
                    </Label>
                    <Input
                      id={`item-qty-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-unit-${index}`} className="text-xs font-medium">
                      Unit
                    </Label>
                    <div className="mt-1">
                      <UnitSelector
                        value={item.unitOfMeasure || ""}
                        onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                        description={item.description}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`item-rate-${index}`} className="text-xs font-medium">
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
                      className="mt-1"
                    />
                  </div>
                </div>
                
                {/* Total and Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">${(item.quantity * item.rate).toFixed(2)}</span>
                  <div className="flex gap-1">
                    {item.searchResults && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSubstitute(index)}
                        title="View substitutes"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </Button>
                    )}
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
                  </div>
                </div>
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4">
                {/* Product Image Thumbnail */}
                <div className="col-span-1 flex items-start">
                  <MaterialThumbnail
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.description}
                    className="w-12 h-12"
                  />
                </div>
                
                {/* Line Item Description */}
                <div className="col-span-5">
                  <Label htmlFor={`item-desc-${index}`} className="text-xs font-medium">
                    Line Item Description
                  </Label>
                  <Textarea
                    id={`item-desc-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Describe the line item with dimensions, color, brand, and supplier (e.g., '12x12 inch Charcoal Concrete Pavers - Pavestone - Home Depot')"
                    className="min-h-[60px] resize-none mt-1"
                  />
                  {item.brand && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.brand} {item.model && `- ${item.model}`}
                    </p>
                  )}
                </div>
                
                {/* Quantity */}
                <div className="col-span-1">
                  <Label htmlFor={`item-qty-${index}`} className="text-xs font-medium">
                    Qty
                  </Label>
                  <Input
                    id={`item-qty-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                
                {/* Unit of Measure */}
                <div className="col-span-2">
                  <Label htmlFor={`item-unit-${index}`} className="text-xs font-medium">
                    Unit
                  </Label>
                  <div className="mt-1">
                    <UnitSelector
                      value={item.unitOfMeasure || ""}
                      onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                      description={item.description}
                    />
                  </div>
                </div>
                
                {/* Rate */}
                <div className="col-span-2">
                  <Label htmlFor={`item-rate-${index}`} className="text-xs font-medium">
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
                    className="mt-1"
                  />
                </div>
                
                {/* Total and Actions */}
                <div className="col-span-1 flex items-end">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">${(item.quantity * item.rate).toFixed(2)}</span>
                    <div className="flex gap-1">
                      {item.searchResults && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSubstitute(index)}
                          title="View substitutes"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </Button>
                      )}
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
                    </div>
                  </div>
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

      {/* Substitute Modal */}
      {showSubstitute && substituteItemIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose Substitute</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSubstitute(false)}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            <div className="space-y-3">
              {items[substituteItemIndex]?.searchResults?.map((substitute: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSubstituteSelect(substitute)}
                >
                  {/* Substitute Image */}
                  <div className="flex-shrink-0">
                    <MaterialThumbnail
                      src={substitute.image_url}
                      alt={substitute.name}
                      className="h-20 w-20"
                    />
                  </div>
                  
                  {/* Substitute Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{substitute.name}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-lg font-bold text-primary">
                        ${parseFloat(substitute.estimated_cost).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {substitute.brand && `${substitute.brand} `}
                        {substitute.model}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {substitute.confidence * 100}% confidence
                      </span>
                    </div>
                  </div>
                  
                  {/* Select Button with Rate */}
                  <div className="flex flex-col items-end">
                    <Button size="sm" className="mb-1">
                      Select
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      ${parseFloat(substitute.estimated_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
