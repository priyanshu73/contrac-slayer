"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MaterialSearchWidget } from "@/components/material-search-widget"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Lead, ContractorProfile, Client, Measurements } from "@/lib/types"
import { MeasurementsInput } from "@/components/measurements-input"
import Image from "next/image"

interface LineItem {
  description: string
  quantity: number
  rate: number | string
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
  confidence?: "low" | "medium" | "high" // Confidence level from AI estimate
  productSource?: string // Product source (e.g., "Home Depot")
  category?: string // Category: materials | labor | equipment | disposal
}

interface MaterialResult {
  name: string
  description: string
  category: string
  estimated_quantity: string
  unit_of_measure: string
  estimated_cost: string
  confidence: number
  source: string
  image_url?: string
  thumbnail_url?: string
  availability?: string
  url?: string
  brand?: string
  model?: string
  searchResults?: any[] // All search results for substitutes
}

interface MaterialSearchResponse {
  materials: MaterialResult[]
  total_count: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
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

function sanitizeDecimalInput(value: string): string {
  // Allow only digits and a single dot. Keep intermediate states like "" or "." while typing.
  const cleaned = value.replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  if (parts.length <= 1) return cleaned
  const decimal = parts.slice(1).join("").slice(0, 2) // max 2 decimals
  return `${parts[0]}.${decimal}`
}

function getRateNumber(rate: LineItem["rate"]): number {
  if (typeof rate === "number") return rate
  const n = Number.parseFloat(rate)
  return Number.isFinite(n) ? n : 0
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
  
  // Filter out suggested units from common units to avoid duplicates
  const remainingUnits = COMMON_UNITS.filter(unit => !suggestedUnits.includes(unit.value))

  return (
    <div className="space-y-1 w-full min-w-0">
      {!isCustom ? (
        <Select value={value || ""} onValueChange={handleSelect}>
          <SelectTrigger className="w-full min-w-0 border-0 shadow-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 px-0 h-auto">
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
                {remainingUnits.length > 0 && <div className="border-t my-1"></div>}
              </>
            )}
            
            {/* Remaining common units (excluding suggested ones) */}
            {remainingUnits.map(unit => (
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
        <div className="flex gap-1 w-full">
          <Input
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Custom unit..."
            className="flex-1 min-w-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCustomClose}
            className="px-2 flex-shrink-0"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}

// Get colorful abstract icon based on item description/category
function getItemIcon(description: string, category?: string, index: number = 0) {
  const desc = description.toLowerCase()
  const cat = category?.toLowerCase() || ""
  
  // Icon set with 5 different colorful abstract designs
  const icons = [
    // Icon 1: Blue gradient with tools
    <svg key="icon1" className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill="url(#grad1)" />
      <path d="M30 35 L50 25 L70 35 L70 65 L50 75 L30 65 Z" fill="white" fillOpacity="0.3" />
      <circle cx="50" cy="50" r="8" fill="white" fillOpacity="0.5" />
      <path d="M35 50 L45 50 M55 50 L65 50 M50 40 L50 60" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
    </svg>,
    
    // Icon 2: Orange/Red gradient with construction
    <svg key="icon2" className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill="url(#grad2)" />
      <rect x="25" y="30" width="50" height="40" rx="4" fill="white" fillOpacity="0.25" />
      <rect x="30" y="35" width="15" height="15" rx="2" fill="white" fillOpacity="0.4" />
      <rect x="55" y="35" width="15" height="15" rx="2" fill="white" fillOpacity="0.4" />
      <path d="M40 55 L60 55" stroke="white" strokeWidth="3" strokeOpacity="0.5" />
    </svg>,
    
    // Icon 3: Green gradient with geometric shapes
    <svg key="icon3" className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
          <stop offset="100%" stopColor="#059669" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill="url(#grad3)" />
      <circle cx="35" cy="35" r="12" fill="white" fillOpacity="0.3" />
      <circle cx="65" cy="35" r="12" fill="white" fillOpacity="0.3" />
      <path d="M35 47 L65 47 L50 65 Z" fill="white" fillOpacity="0.4" />
    </svg>,
    
    // Icon 4: Purple/Pink gradient with abstract design
    <svg key="icon4" className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="1" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill="url(#grad4)" />
      <path d="M30 50 Q50 30, 70 50 T30 50" fill="white" fillOpacity="0.2" />
      <circle cx="40" cy="45" r="6" fill="white" fillOpacity="0.5" />
      <circle cx="60" cy="55" r="6" fill="white" fillOpacity="0.5" />
      <path d="M50 30 L50 70 M30 50 L70 50" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    </svg>,
    
    // Icon 5: Teal/Cyan gradient with modern design
    <svg key="icon5" className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
          <stop offset="100%" stopColor="#0891B2" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill="url(#grad5)" />
      <rect x="30" y="30" width="40" height="40" rx="8" fill="white" fillOpacity="0.2" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.4" />
      <circle cx="50" cy="50" r="8" fill="white" fillOpacity="0.5" />
    </svg>
  ]
  
  // Select icon based on category or description keywords
  if (cat.includes("material") || desc.includes("paver") || desc.includes("stone") || desc.includes("brick")) {
    return icons[0] // Blue gradient
  } else if (cat.includes("labor") || desc.includes("install") || desc.includes("work") || desc.includes("service")) {
    return icons[1] // Orange/Red gradient
  } else if (cat.includes("equipment") || desc.includes("tool") || desc.includes("machine")) {
    return icons[2] // Green gradient
  } else if (cat.includes("disposal") || desc.includes("waste") || desc.includes("remove")) {
    return icons[3] // Purple/Pink gradient
  } else {
    // Use index-based rotation for variety
    return icons[index % icons.length]
  }
}

// Material Thumbnail Component with colorful fallback icons
function MaterialThumbnail({ src, alt, className, category, index }: { 
  src?: string; 
  alt: string; 
  className?: string;
  category?: string;
  index?: number;
}) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [src])

  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center border border-border rounded-md overflow-hidden ${className}`}>
        {getItemIcon(alt, category, index || 0)}
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
  callLeadId?: string | null
  phone?: string | null
  quoteId?: string | null
  initialData?: any // Job/Quote data for editing
}

export function QuoteCreator({ leadId, callLeadId, phone, quoteId, initialData }: QuoteCreatorProps) {
  const { getContractorAISpId } = useAuth()
  const { toast } = useToast()
  const [serviceDescription, setServiceDescription] = useState("")
  const [projectType, setProjectType] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [items, setItems] = useState<LineItem[]>([])
  const [measurements, setMeasurements] = useState<Measurements>({ items: [] })
  const [assumptions, setAssumptions] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false)
  
  // Client information states
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [loadingLead, setLoadingLead] = useState(false)
  
  // Client matching states
  const [allClients, setAllClients] = useState<Client[]>([])
  const [matchingClients, setMatchingClients] = useState<Client[]>([])
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  
  // Additional details states
  const [notes, setNotes] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  
  // Quote creation states
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Markup and labor rate control - fetch from contractor profile
  const [markupPercentage, setMarkupPercentage] = useState<number>(20) // Default 20%, will be updated from profile
  const [taxRate, setTaxRate] = useState<number>(8.25) // Default 8.25%, will be updated from profile
  const [laborRatePerHour, setLaborRatePerHour] = useState<number>(75) // Default $75/hr, will be updated from profile
  const [loadingMarkup, setLoadingMarkup] = useState(true)
  const [showSubstitute, setShowSubstitute] = useState(false)
  const [substituteItemIndex, setSubstituteItemIndex] = useState<number | null>(null)
  
  // Inline search states for line items
  const [searchingItemIndex, setSearchingItemIndex] = useState<number | null>(null)
  const [itemSearchQueries, setItemSearchQueries] = useState<Record<number, string>>({})
  const [itemSearchResults, setItemSearchResults] = useState<Record<number, MaterialResult[]>>({})
  const [itemSearchLoading, setItemSearchLoading] = useState<Record<number, boolean>>({})

  // Fetch contractor profile to get default markup
  useEffect(() => {
    fetchContractorMarkup()
  }, [])

  // Load clients on mount
  useEffect(() => {
    fetchClients()
  }, [])

  // Fetch lead data if leadId is provided
  useEffect(() => {
    if (leadId) {
      fetchLeadData()
    }
  }, [leadId])

  // Fetch call lead data if callLeadId is provided
  // Also handle phone parameter if provided without callLeadId (fallback)
  useEffect(() => {
    if (callLeadId) {
      fetchCallLeadData()
    } else if (phone) {
      // If only phone is provided without callLeadId, just set the phone
      setClientPhone(phone)
    }
  }, [callLeadId, phone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Match clients when name, email, or phone changes
  useEffect(() => {
    if (selectedClientId) return // Don't match if a client is already selected
    
    const matches: Client[] = []
    
    if (allClients.length === 0) {
      setMatchingClients([])
      setShowClientSuggestions(false)
      return
    }

    const phoneClean = clientPhone.replace(/\D/g, '') // Remove non-digits

    // Only match on phone number, and require at least 7 digits
    if (phoneClean.length >= 7) {
      allClients.forEach(client => {
        const clientPhoneClean = (client.phone || '').replace(/\D/g, '')

        // Phone match: check if the entered phone contains the client's phone or vice versa
        // This handles cases like "5551234" matching "555-123-4567"
        const phoneMatch = phoneClean.length >= 7 && clientPhoneClean.length >= 7 && (
          clientPhoneClean.includes(phoneClean) || phoneClean.includes(clientPhoneClean)
        )

        if (phoneMatch) {
          // Avoid duplicates
          if (!matches.find(m => m.id === client.id)) {
            matches.push(client)
          }
        }
      })
    }

    setMatchingClients(matches)
    setShowClientSuggestions(matches.length > 0 && phoneClean.length >= 7)
  }, [clientPhone, allClients, selectedClientId])

  // Load initial quote data if editing
  useEffect(() => {
    if (initialData && quoteId) {
      // Reset selected client when loading existing quote
      setSelectedClientId(null)
      
      // Set client information - handle both nested client object and flat structure
      const client = initialData.client
      setClientName(client?.name || initialData.client_name || "")
      setClientEmail(client?.email || initialData.client_email || "")
      setClientPhone(client?.phone || initialData.client_phone || "")
      setClientAddress(client?.address || initialData.client_address || "")

      // Load project type and title if available
      if (initialData.project_type) {
        setProjectType(initialData.project_type)
        setProjectTitle(initialData.project_type)
      }
      if (initialData.title) {
        setProjectTitle(initialData.title)
      }

      // Load service description if available
      if (initialData.job_description) {
        setServiceDescription(initialData.job_description)
      }

      // Load additional details
      setNotes(initialData.customer_notes || "")
      setPaymentTerms(initialData.payment_terms || "")
      
      // Handle due date or quote expiration date
      const dateValue = initialData.due_date || initialData.quote_expiration_date
      if (dateValue) {
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          setDueDate(date.toISOString().split('T')[0])
        }
      }

      // Convert job items to line items format
      if (initialData.items && initialData.items.length > 0) {
        const lineItems = initialData.items.map((item: any) => ({
          description: item.custom_description || item.description || "",
          quantity: item.quantity || 1,
          rate: item.cost_per_unit || item.rate || 0,
          imageUrl: item.image_url || item.imageUrl,
          thumbnailUrl: item.thumbnail_url || item.thumbnailUrl,
          brand: item.brand,
          model: item.model,
          externalUrl: item.external_url || item.externalUrl,
          unitOfMeasure: item.unit_of_measure || item.unitOfMeasure || "each",
        }))
        setItems(lineItems)
        
        // If editing and items have markup, use the first item's markup
        const firstItem = initialData.items[0]
        if (firstItem?.markup_percentage !== undefined && firstItem.markup_percentage !== null) {
          setMarkupPercentage(parseFloat(firstItem.markup_percentage) || 20)
        }
      }
    }
  }, [initialData, quoteId])

  const fetchContractorMarkup = async () => {
    try {
      setLoadingMarkup(true)
      const profile = await api.getMyProfile() as any
      if (profile?.default_markup_percentage !== undefined) {
        setMarkupPercentage(parseFloat(profile.default_markup_percentage) || 20)
      }
      // Store tax rate for calculations
      if (profile?.default_sales_tax_rate !== undefined) {
        setTaxRate(parseFloat(profile.default_sales_tax_rate) || 8.25)
      }
      // Store labor rate for calculations
      if (profile?.default_labor_rate_per_hour !== undefined) {
        setLaborRatePerHour(parseFloat(profile.default_labor_rate_per_hour) || 75)
      }
    } catch (error) {
      console.error("Failed to fetch contractor markup:", error)
      // Keep defaults: 20% markup, 8.25% tax, $75/hr labor
    } finally {
      setLoadingMarkup(false)
    }
  }

  const fetchClients = async () => {
    try {
      setLoadingClients(true)
      const clients = await api.getClients(0, 100) as Client[]
      setAllClients(Array.isArray(clients) ? clients : [])
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      setAllClients([])
    } finally {
      setLoadingClients(false)
    }
  }

  const handleSelectClient = (client: Client) => {
    setClientName(client.name || "")
    setClientEmail(client.email || "")
    setClientPhone(client.phone || "")
    setClientAddress(client.address || "")
    setSelectedClientId(client.id)
    setShowClientSuggestions(false)
    setMatchingClients([])
    
    toast({
      title: "Client selected",
      description: `Using existing client: ${client.name}`,
    })
  }

  const handleClientFieldChange = (field: 'name' | 'email' | 'phone' | 'address', value: string) => {
    // Reset selected client if user manually edits
    if (selectedClientId) {
      setSelectedClientId(null)
    }
    
    if (field === 'name') setClientName(value)
    else if (field === 'email') setClientEmail(value)
    else if (field === 'phone') setClientPhone(value)
    else if (field === 'address') setClientAddress(value)
  }

  const fetchLeadData = async () => {
    if (!leadId || isNaN(Number(leadId))) return
    
    try {
      setLoadingLead(true)
      const data = await api.getLead(parseInt(leadId, 10))
      const lead = data as Lead
      
      // Reset selected client when loading from lead
      setSelectedClientId(null)
      
      // Auto-fill client information
      setClientName(lead.name || "")
      setClientEmail(lead.email || "")
      setClientPhone(lead.phone || "")
      setClientAddress(lead.address || "")
      
      // Pre-fill service description if available
      if (lead.description) {
        setServiceDescription(lead.description)
      }
      
      // Pre-fill project type if available
      if (lead.project_type) {
        setProjectType(lead.project_type)
        // Use project_type as title
        setProjectTitle(lead.project_type)
      }
      
      // Extract measurements from lead
      if (lead.measurements) {
        setMeasurements(lead.measurements as Measurements)
      }
    } catch (error) {
      console.error("Failed to fetch lead data:", error)
    } finally {
      setLoadingLead(false)
    }
  }

  const fetchCallLeadData = async () => {
    if (!callLeadId) return
    
    try {
      setLoadingLead(true)
      const data = await contractorAI.getLead(callLeadId)
      const lead = data as any
      
      // Reset selected client when loading from call lead
      setSelectedClientId(null)
      
      // Auto-fill client information from call lead
      setClientName(lead.name || `Customer ${lead.phone_number?.slice(-4) || ''}`)
      setClientEmail(lead.email || "")
      setClientPhone(lead.phone_number || phone || "")
      setClientAddress(lead.location || "")
      
      // Pre-fill service description if available (use summary_text from call lead)
      if (lead.summary_text) {
        setServiceDescription(lead.summary_text)
      }
    } catch (error) {
      console.error("Failed to fetch call lead data:", error)
      // If fetching fails but phone is provided, at least set the phone number
      if (phone) {
        setClientPhone(phone)
      }
    } finally {
      setLoadingLead(false)
    }
  }

  const extractZipCode = (address: string): string | undefined => {
    // Extract 5-digit ZIP code from address
    const zipMatch = address.match(/\b\d{5}\b/)
    return zipMatch ? zipMatch[0] : undefined
  }

  // Inline search functions for line items
  const handleStartSearch = (index: number) => {
    setSearchingItemIndex(index)
    setItemSearchQueries(prev => ({ ...prev, [index]: "" }))
    setItemSearchResults(prev => ({ ...prev, [index]: [] }))
  }

  const handleCancelSearch = (index: number) => {
    setSearchingItemIndex(null)
    setItemSearchQueries(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setItemSearchResults(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setItemSearchLoading(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  // Debounced search for inline search
  useEffect(() => {
    if (searchingItemIndex === null) return

    const query = itemSearchQueries[searchingItemIndex] || ""
    
    if (!query.trim() || query.trim().length < 3) {
      setItemSearchResults(prev => ({ ...prev, [searchingItemIndex]: [] }))
      setItemSearchLoading(prev => ({ ...prev, [searchingItemIndex]: false }))
      return
    }

    const timer = setTimeout(() => {
      performInlineSearch(searchingItemIndex, query)
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [itemSearchQueries, searchingItemIndex])

  const performInlineSearch = async (index: number, query: string) => {
    setItemSearchLoading(prev => ({ ...prev, [index]: true }))
    
    try {
      const zipCode = clientAddress ? extractZipCode(clientAddress) : undefined
      const response = await api.searchMaterials(query, zipCode, 10) as MaterialSearchResponse
      setItemSearchResults(prev => ({ ...prev, [index]: response.materials || [] }))
    } catch (err) {
      console.error("Inline search error:", err)
      setItemSearchResults(prev => ({ ...prev, [index]: [] }))
    } finally {
      setItemSearchLoading(prev => ({ ...prev, [index]: false }))
    }
  }

  const handleSelectMaterial = (index: number, material: MaterialResult) => {
    // Update the line item with selected material data
    const updatedItems = [...items]
    const parsedMaterialRate = Number.parseFloat(material.estimated_cost)
    const materialRate = Number.isFinite(parsedMaterialRate) && parsedMaterialRate > 0
      ? parsedMaterialRate
      : getRateNumber(updatedItems[index].rate)
    updatedItems[index] = {
      ...updatedItems[index],
      description: material.name,
      rate: Math.round(materialRate * 100) / 100, // Round to 2 decimal places
      imageUrl: material.image_url,
      thumbnailUrl: material.thumbnail_url,
      brand: material.brand,
      model: material.model,
      externalUrl: material.url,
      unitOfMeasure: material.unit_of_measure || updatedItems[index].unitOfMeasure || "each",
      searchResults: [material],
    }
    setItems(updatedItems)
    
    // Close search mode
    handleCancelSearch(index)
    
    toast({
      title: "Item added",
      description: `${material.name || "Item"} has been added to your quote`,
    })
  }

  const fetchAiEstimate = async () => {
    if (!serviceDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a project description to generate an estimate",
        variant: "destructive",
      })
      return
    }
    
    setAiLoading(true)
    try {
      const zipCode = clientAddress ? extractZipCode(clientAddress) : undefined
      // Send measurements if available (either from lead or manually entered)
      // Backend will use lead measurements if lead_id provided and no manual measurements
      const response = await api.generateEstimate({
        description: serviceDescription,
        project_type: projectType || undefined,
        measurements: measurements.items.length > 0 ? measurements : undefined,
        lead_id: leadId ? parseInt(leadId, 10) : undefined,
        location_zip_code: zipCode,
        labor_rate_per_hour: laborRatePerHour, // Send labor rate from form
        markup_percentage: markupPercentage, // Send markup from form
      }) as any
      
      // Log for debugging
      console.log("📐 Estimate generation request:", {
        description: serviceDescription.substring(0, 50) + "...",
        project_type: projectType,
        has_measurements: measurements.items.length > 0,
        measurements_count: measurements.items.length,
        lead_id: leadId,
      })
      
      // Convert response line items to LineItem format
      const newItems: LineItem[] = (response.line_items || []).map((item: any, idx: number) => ({
        description: item.description,
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        imageUrl: item.image_url,
        thumbnailUrl: item.image_url,
        brand: item.brand,
        model: item.model,
        externalUrl: item.external_url,
        unitOfMeasure: item.unit || "each",
        confidence: item.confidence,
        productSource: item.product_source,
        category: item.category, // Include category for icon selection
      }))
      
      // Auto-fill line items directly
      setItems(newItems)
      
      // Store assumptions and warnings
      setAssumptions(response.assumptions || [])
      setWarnings(response.warnings || [])
      
      toast({
        title: "Estimate generated",
        description: `Generated ${newItems.length} line items with AI`,
      })
    } catch (error: any) {
      console.error("Failed to generate estimate:", error)
      toast({
        title: "Estimate generation failed",
        description: error.message || "Failed to generate estimate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAiLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 0, rate: "" }])
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
      const substituteRate = parseFloat(substitute.estimated_cost) || 0
      updatedItems[substituteItemIndex] = {
        ...updatedItems[substituteItemIndex],
        description: substitute.name,
        rate: Math.round(substituteRate * 100) / 100, // Round to 2 decimal places
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
      item.description.trim() && 
      (item.quantity || 0) > 0 && 
      getRateNumber(item.rate) > 0
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
        item.description.trim() && 
        (item.quantity || 0) > 0 && 
        getRateNumber(item.rate) > 0
      )
      
      // Prepare job data
      const jobData = {
        lead_id: leadId && !isNaN(Number(leadId)) ? parseInt(leadId, 10) : null, // Link to original lead if creating from lead
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim(),
        location_zip_code: extractZipCode(clientAddress),
        job_description: serviceDescription.trim() || null,
        customer_notes: notes.trim() || null,
        payment_terms: paymentTerms.trim() || null,
        quote_expiration_date: dueDate || null,
        items: validItems.map(item => ({
          custom_description: item.description.trim(),
          quantity: item.quantity,
          cost_per_unit: getRateNumber(item.rate),
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
      
      let response
      if (quoteId) {
        // Update existing quote
        response = await api.updateJob(parseInt(quoteId), jobData)
        toast({
          title: "Quote updated",
          description: "Quote has been successfully updated",
        })
      } else {
        // Create new quote
        response = await api.createJob(jobData)
        toast({
          title: "Quote created",
          description: "Quote has been successfully created",
        })
      }
      
      // Success! Redirect to quote details page
      if (response && (response as any).id) {
        window.location.href = `/quotes/${(response as any).id}`
      } else if (quoteId) {
        // For updates, redirect to the same quote
        window.location.href = `/quotes/${quoteId}`
      } else {
        throw new Error("Invalid response from server")
      }
      
    } catch (error: any) {
      console.error(`Failed to ${quoteId ? 'update' : 'create'} quote:`, error)
      setCreateError(
        error.message || 
        `Failed to ${quoteId ? 'update' : 'create'} quote. Please check your information and try again.`
      )
    } finally {
      setIsCreatingQuote(false)
    }
  }

  // Calculate base subtotal (without markup)
  const baseSubtotal = items.reduce((sum, item) => {
    return sum + ((item.quantity || 0) * getRateNumber(item.rate))
  }, 0)
  
  // Calculate markup amount
  const markupAmount = baseSubtotal * (markupPercentage / 100)
  
  // Calculate subtotal with markup
  const subtotal = baseSubtotal + markupAmount
  
  // Calculate tax using contractor's tax rate
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  return (
    <div className="mx-auto max-w-[1800px] px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-6 pt-6">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Client Information */}
          <Card className="p-6" id="material-search">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Client Information</h2>
              <div className="flex items-center gap-2">
                {selectedClientId && (
                  <button
                    onClick={() => {
                      setSelectedClientId(null)
                      toast({
                        title: "Client selection cleared",
                        description: "You can now enter new client information",
                      })
                    }}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1"
                  >
                    <span>Using Existing Client</span>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {leadId && (
                  <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                    Auto-filled from Lead
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input 
                  id="client-name" 
                  placeholder="John Smith" 
                  value={clientName}
                  onChange={(e) => handleClientFieldChange('name', e.target.value)}
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
                  onChange={(e) => handleClientFieldChange('email', e.target.value)}
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
                  onChange={(e) => handleClientFieldChange('phone', e.target.value)}
                  disabled={loadingLead}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">Address</Label>
                <Input 
                  id="client-address" 
                  placeholder="123 Oak Street, Springfield, IL"
                  value={clientAddress}
                  onChange={(e) => handleClientFieldChange('address', e.target.value)}
                  disabled={loadingLead}
                />
              </div>
            </div>
            
            {/* Client Suggestions */}
            {showClientSuggestions && matchingClients.length > 0 && (
              <div className="mt-4 border rounded-lg bg-background shadow-lg">
                <div className="p-2 border-b bg-muted/50">
                  <p className="text-sm font-medium text-muted-foreground">
                    Matching clients found ({matchingClients.length})
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {matchingClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {client.email && (
                              <span className="truncate">{client.email}</span>
                            )}
                            {client.phone && (
                              <span className="flex-shrink-0">{client.phone}</span>
                            )}
                          </div>
                          {client.address && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{client.address}</p>
                          )}
                        </div>
                        <svg className="h-5 w-5 text-primary flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Measurements Input */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Project Measurements (Optional)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Adding measurements helps generate more accurate estimates. Measurements can come from the lead or be entered manually.
            </p>
            <MeasurementsInput
              value={measurements}
              onChange={setMeasurements}
            />
          </Card>

          {/* Material Search */}
          <div className="space-y-3">
            <MaterialSearchWidget
              zipCode={clientAddress ? extractZipCode(clientAddress) : undefined}
              onAddMaterial={(material) => {
                // Add material as new line item with image data and search results
                const materialRate = parseFloat(material.estimated_cost) || 0
                setItems([...items, {
                  description: material.name,
                  quantity: parseInt(material.estimated_quantity) || 1,
                  rate: Math.round(materialRate * 100) / 100, // Round to 2 decimal places
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
          </div>

          {/* Mobile AI Assistant - Collapsible */}
          <div className="lg:hidden">
            <Collapsible open={isMobileAiOpen} onOpenChange={setIsMobileAiOpen}>
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">AI Line Items Assistant</h3>
                        <p className="text-xs text-muted-foreground">Generate line items with AI</p>
                      </div>
                    </div>
                    <svg 
                      className={`h-5 w-5 transition-transform text-muted-foreground ${isMobileAiOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 border-t bg-background">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="project-type-mobile" className="text-sm font-medium mb-1.5 block">
                          Project Type (Optional)
                        </Label>
                        <Input
                          id="project-type-mobile"
                          placeholder="e.g., Patio Installation, Deck Construction"
                          value={projectType}
                          onChange={(e) => {
                            setProjectType(e.target.value)
                            setProjectTitle(e.target.value)
                          }}
                          className="bg-background"
                        />
                      </div>
                      <Textarea
                        placeholder="Describe the project (e.g., materials, labor, installation, etc.)"
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
                        <Button onClick={fetchAiEstimate} disabled={aiLoading || tooShort || !serviceDescription.trim()} className="w-full">
                          {aiLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 animate-ping rounded-full bg-purple-500" />
                              Generating AI Estimate...
                            </span>
                          ) : (
                            <>
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Generate AI Estimate
                            </>
                          )}
                        </Button>
                        {tooShort && (
                          <p className="text-xs text-muted-foreground w-full">
                            Please add at least 30 characters and 6 words for better results.
                          </p>
                        )}
                      </div>
                        )
                      })()}
                      
                      {/* Display Measurements if available */}
                      {measurements.items && measurements.items.length > 0 && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <h4 className="text-sm font-medium">Measurements</h4>
                          </div>
                          <div className="space-y-2">
                            {measurements.items.map((item, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                {item.type === "dimensions" && item.length && item.width && (
                                  <span>
                                    {item.name ? <strong>{item.name}:</strong> : ""} {item.length} × {item.width} {item.unit || "ft"}
                                  </span>
                                )}
                                {item.type === "square_footage" && item.value && (
                                  <span>
                                    {item.name ? <strong>{item.name}:</strong> : ""} {item.value} sq ft
                                  </span>
                                )}
                                {item.type === "linear_feet" && item.value && (
                                  <span>
                                    {item.name ? <strong>{item.name}:</strong> : ""} {item.value} linear ft
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* Line Items */}
          <Card className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Line Items</h2>
          <Button onClick={addItem} className="h-10 px-4 text-sm font-medium">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        </div>

        {/* Table Header - Desktop */}
        <div className="hidden sm:grid grid-cols-[50px_3fr_140px_90px_110px_120px_50px] gap-3 px-3 py-2 mb-2 border-b border-border">
          <div></div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Qty</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Rate</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Total</div>
          <div></div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="relative pb-3 border-b border-border last:border-b-0">
              {/* Delete Button - Mobile: Top Right */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeItem(index)}
                className="absolute top-0 right-0 sm:hidden h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>

              {/* Mobile Layout */}
              <div className="block sm:hidden space-y-3">
                {/* Description */}
                <div>
                  <Textarea
                    id={`item-desc-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = `${Math.min(target.scrollHeight, 150)}px`
                    }}
                    ref={(textarea) => {
                      if (textarea) {
                        textarea.style.height = 'auto'
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
                      }
                    }}
                    placeholder="Enter item description (e.g., materials, labor, services, etc.)"
                    className="min-h-[60px] max-h-[150px] resize-none text-sm"
                    rows={2}
                  />
                  {item.brand && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {item.brand} {item.model && `- ${item.model}`}
                    </p>
                  )}
                  {item.confidence && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.confidence === "high" ? "bg-green-100 text-green-700" :
                        item.confidence === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {item.confidence} confidence
                      </span>
                      {item.productSource && (
                        <span className="text-[10px] text-muted-foreground">
                          • {item.productSource}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Unit, Qty, Rate Row */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="col-span-2">
                    <Label htmlFor={`item-unit-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Unit
                    </Label>
                    <UnitSelector
                      value={item.unitOfMeasure || ""}
                      onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                      description={item.description}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-qty-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Quantity
                    </Label>
                    <Input
                      id={`item-qty-${index}`}
                      type="number"
                      min="0"
                      value={item.quantity === 0 ? "" : item.quantity.toString()}
                      onChange={(e) => {
                        const val = e.target.value
                        updateItem(index, "quantity", val === "" ? 0 : Number.parseInt(val) || 0)
                      }}
                      placeholder="0"
                      className="h-9 text-center text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`item-rate-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Rate
                    </Label>
                    <Input
                      id={`item-rate-${index}`}
                      type="text"
                      inputMode="decimal"
                      pattern="^[0-9]*[.]?[0-9]*$"
                      value={typeof item.rate === "string" ? item.rate : (item.rate === 0 ? "" : item.rate.toFixed(2))}
                      onChange={(e) => {
                        const val = sanitizeDecimalInput(e.target.value)
                        updateItem(index, "rate", val)
                      }}
                      onBlur={() => {
                        const s = typeof items[index]?.rate === "string" ? items[index].rate.trim() : ""
                        if (!s || s === ".") return
                        const n = Number.parseFloat(s)
                        if (!Number.isFinite(n)) return
                        updateItem(index, "rate", Math.round(n * 100) / 100)
                      }}
                      placeholder="0.00"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-sm font-semibold">
                      ${(((item.quantity || 0) * getRateNumber(item.rate)) * (1 + markupPercentage / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Desktop Layout - Table Style */}
              <div className="hidden sm:grid grid-cols-[50px_3fr_140px_90px_110px_120px_50px] gap-3 items-start">
                {/* Image */}
                <div className="pt-1">
                  <MaterialThumbnail
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.description}
                    className="w-10 h-10 flex-shrink-0 rounded"
                    category={item.category}
                    index={index}
                  />
                </div>
                
                {/* Description */}
                <div className="min-w-0 pr-2">
                  <Textarea
                    id={`item-desc-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                    }}
                    ref={(textarea) => {
                      if (textarea) {
                        textarea.style.height = 'auto'
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
                      }
                    }}
                    placeholder="Enter item description (e.g., materials, labor, services, etc.)"
                    className="min-h-[40px] max-h-[200px] text-sm w-full resize-none overflow-y-auto"
                    rows={1}
                  />
                  {item.brand && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {item.brand} {item.model && `- ${item.model}`}
                    </p>
                  )}
                </div>
                
                {/* Unit */}
                <div className="pt-1">
                  <UnitSelector
                    value={item.unitOfMeasure || ""}
                    onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                    description={item.description}
                  />
                </div>
                
                {/* Qty */}
                <div className="pt-1">
                  <Input
                    id={`item-qty-${index}`}
                    type="number"
                    min="0"
                    value={item.quantity === 0 ? "" : item.quantity.toString()}
                    onChange={(e) => {
                      const val = e.target.value
                      updateItem(index, "quantity", val === "" ? 0 : Number.parseInt(val) || 0)
                    }}
                    placeholder="0"
                    className="h-8 text-center text-sm"
                  />
                </div>
                
                {/* Rate */}
                <div className="pt-1">
                  <Input
                    id={`item-rate-${index}`}
                    type="text"
                    inputMode="decimal"
                    pattern="^[0-9]*[.]?[0-9]*$"
                    value={typeof item.rate === "string" ? item.rate : (item.rate === 0 ? "" : item.rate.toFixed(2))}
                    onChange={(e) => {
                      const val = sanitizeDecimalInput(e.target.value)
                      updateItem(index, "rate", val)
                    }}
                    onBlur={() => {
                      const s = typeof items[index]?.rate === "string" ? items[index].rate.trim() : ""
                      if (!s || s === ".") return
                      const n = Number.parseFloat(s)
                      if (!Number.isFinite(n)) return
                      updateItem(index, "rate", Math.round(n * 100) / 100)
                    }}
                    placeholder="0.00"
                    className="h-8 text-sm text-right"
                  />
                </div>
                
                {/* Total */}
                <div className="text-right pt-1">
                  <span className="text-sm font-semibold">
                    ${(((item.quantity || 0) * getRateNumber(item.rate)) * (1 + markupPercentage / 100)).toFixed(2)}
                  </span>
                </div>
                
                {/* Delete Button */}
                <div className="flex justify-center pt-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
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
          ))}
        </div>

        {/* Markup Settings */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="markup-percentage" className="text-sm font-medium">
                Markup Percentage
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Applied to all line items. Default from your profile settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="markup-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={markupPercentage === 0 ? "" : markupPercentage}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "") {
                    setMarkupPercentage(0)
                  } else {
                    const num = parseFloat(val) || 0
                    setMarkupPercentage(Math.max(0, Math.min(100, num)))
                  }
                }}
                placeholder="0"
                className="w-20"
                disabled={loadingMarkup}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (before markup)</span>
            <span className="font-medium">${baseSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Markup ({markupPercentage}%)</span>
            <span className="font-medium text-primary">+${markupAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="text-muted-foreground font-medium">Subtotal (with markup)</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxRate.toFixed(2)}%)</span>
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
            <Textarea 
              id="notes" 
              placeholder="Add any additional notes or terms..." 
              className="min-h-[100px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due-date">Valid Until</Label>
              <Input 
                id="due-date" 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Input 
                id="payment-terms" 
                placeholder="Net 30"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
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
              {quoteId ? "Updating Quote..." : "Creating Quote..."}
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
              {quoteId ? "Update Quote" : "Create Quote"}
            </>
          )}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href={quoteId ? `/quotes/${quoteId}` : "/quotes"}>
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
          </a>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href={quoteId ? `/quotes/${quoteId}` : "/quotes"}>Cancel          </a>
        </Button>
        </div>
        </div>

        {/* Right Column - AI Assistant */}
        <div className="hidden lg:block lg:w-[500px] xl:w-[500px] 2xl:w-[500px] space-y-6 pt-6 flex-shrink-0">
          {/* AI Line Items Assistant */}
          <Card className="border-primary/20 bg-primary/5 p-6 sticky top-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">AI Estimate Generator</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate detailed line items with AI-powered estimation
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="project-type-desktop" className="text-sm font-medium mb-1.5 block">
                      Project Type (Optional)
                    </Label>
                    <Input
                      id="project-type-desktop"
                      placeholder="e.g., Patio Installation, Deck Construction"
                      value={projectType}
                      onChange={(e) => {
                        setProjectType(e.target.value)
                        setProjectTitle(e.target.value)
                      }}
                      className="bg-background"
                    />
                  </div>
                  <Textarea
                    placeholder="Describe the project (e.g., materials, labor, installation, etc.)"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    className="min-h-[80px] bg-background"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="markup-ai-desktop" className="text-sm font-medium mb-1.5 block">
                        Markup Percentage
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="markup-ai-desktop"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={markupPercentage === 0 ? "" : markupPercentage}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "") {
                              setMarkupPercentage(0)
                            } else {
                              const num = parseFloat(val) || 0
                              setMarkupPercentage(Math.max(0, Math.min(100, num)))
                            }
                          }}
                          placeholder="20"
                          className="bg-background"
                          disabled={loadingMarkup}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="labor-rate-ai-desktop" className="text-sm font-medium mb-1.5 block">
                        Labor Rate (per hour)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          id="labor-rate-ai-desktop"
                          type="number"
                          min="0"
                          step="0.01"
                          value={laborRatePerHour === 0 ? "" : laborRatePerHour}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "") {
                              setLaborRatePerHour(0)
                            } else {
                              const num = parseFloat(val) || 0
                              setLaborRatePerHour(Math.max(0, num))
                            }
                          }}
                          placeholder="75.00"
                          className="bg-background"
                          disabled={loadingMarkup}
                        />
                        <span className="text-sm text-muted-foreground">/hr</span>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const desc = serviceDescription.trim()
                    const wordCount = desc ? desc.split(/\s+/).length : 0
                    const tooShort = desc.length < 30 || wordCount < 6
                    return (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={fetchAiEstimate} disabled={aiLoading || tooShort || !serviceDescription.trim()} className="w-full">
                      {aiLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 animate-ping rounded-full bg-purple-500" />
                          Generating AI Estimate...
                        </span>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate AI Estimate
                        </>
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
                  
                  {/* Display Measurements if available */}
                  {measurements.items && measurements.items.length > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h4 className="text-sm font-medium">Measurements</h4>
                      </div>
                      <div className="space-y-2">
                        {measurements.items.map((item, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            {item.type === "dimensions" && item.length && item.width && (
                              <span>
                                {item.name ? <strong>{item.name}:</strong> : ""} {item.length} × {item.width} {item.unit || "ft"}
                              </span>
                            )}
                            {item.type === "square_footage" && item.value && (
                              <span>
                                {item.name ? <strong>{item.name}:</strong> : ""} {item.value} sq ft
                              </span>
                            )}
                            {item.type === "linear_feet" && item.value && (
                              <span>
                                {item.name ? <strong>{item.name}:</strong> : ""} {item.value} linear ft
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Assumptions and Warnings Display */}
          {(assumptions.length > 0 || warnings.length > 0) && (
            <Card className="p-6 sticky top-6">
              {assumptions.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    Assumptions
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {assumptions.map((assumption, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                    </div>
                  )}
              {warnings.length > 0 && (
                                      <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                    Warnings
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                    </div>
                  )}
            </Card>
          )}
        </div>
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
