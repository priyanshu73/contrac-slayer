
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MaterialSearchWidget } from "@/components/material-search-widget"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { api, contractorAI } from "@/lib/api"
import { Lead, ContractorProfile, Client, Measurements, LaborChargeType, UnitType, getLaborChargeTypeLabel, getRateLabelSuffix } from "@/lib/types"
import { formatPhoneForDisplay } from "@/lib/utils"
import { MeasurementsInput } from "@/components/measurements-input"
import { LineItemSearchPopover, LineItemTitleAutocomplete, type LineItemSearchResult } from "@/components/quote-item-autocomplete"
import Image from "next/image"
import { Check, ChevronsUpDown, Image as ImageIcon, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface LineItem {
  title?: string
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
  applyTax?: boolean // Whether to apply tax to this line item (defaults to true)
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

const deriveLineItemTitle = (title?: string, description?: string): string => {
  const explicitTitle = (title || "").trim()
  if (explicitTitle) return explicitTitle

  const cleanedDescription = (description || "").replace(/\s+/g, " ").trim()
  if (!cleanedDescription) return ""

  let base = cleanedDescription
    .split(/\b(?:for|with|including|includes|installed|installation|install|to|over|using|at|on|in)\b/i)[0]
    ?.trim()
    ?.replace(/[,\-.]+$/g, "") || ""

  base = base.replace(/^(premium|professional|new|basic|standard|automated|custom)\s+/i, "").trim()

  if (!base) return ""

  return base
    .split(/\s+/)
    .slice(0, 5)
    .map((word) => (/^[A-Z0-9]{2,4}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ")
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
          <SelectTrigger className="w-full min-w-0 border-0 shadow-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 px-0 h-9 text-xs leading-tight">
            <SelectValue placeholder="Select unit..." />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {/* Suggested units based on description */}
            {suggestedUnits.length > 0 && (
              <>
                {suggestedUnits.map(unit => {
                  const unitInfo = COMMON_UNITS.find(u => u.value === unit)
                  return (
                    <SelectItem key={unit} value={unit} className="text-xs">
                      {unitInfo?.label || unit}
                    </SelectItem>
                  )
                })}
                {remainingUnits.length > 0 && <div className="border-t my-1"></div>}
              </>
            )}

            {/* Remaining common units (excluding suggested ones) */}
            {remainingUnits.map(unit => (
              <SelectItem key={unit.value} value={unit.value} className="text-xs">
                {unit.label}
              </SelectItem>
            ))}

            {/* Custom option */}
            <div className="border-t my-1"></div>
            <SelectItem value="custom" className="text-xs">
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
  clientId?: string | null
  callLeadId?: string | null
  phone?: string | null
  quoteId?: string | null
  initialData?: any // Job/Quote data for editing
}

export function QuoteCreator({ leadId, clientId, callLeadId, phone, quoteId, initialData }: QuoteCreatorProps) {
  const { getContractorAISpId } = useAuth()
  const { toast } = useToast()
  const [serviceDescription, setServiceDescription] = useState("")
  const [projectType, setProjectType] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoadingStage, setAiLoadingStage] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [descriptionEditorsOpen, setDescriptionEditorsOpen] = useState<number[]>([])
  const [measurements, setMeasurements] = useState<Measurements>({ items: [] })
  const [assumptions, setAssumptions] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false)
  const [useBriefAsContext, setUseBriefAsContext] = useState(false)
  const [projectBrief, setProjectBrief] = useState<any>(null)

  // AI loading stage messages
  const aiLoadingMessages = [
    "Analyzing project description...",
    "Identifying required materials...",
    "Calculating quantities...",
    "Estimating labor costs...",
    "Finalizing line items...",
  ]

  // Progress through loading stages
  useEffect(() => {
    if (aiLoading) {
      setAiLoadingStage(0)
      const interval = setInterval(() => {
        setAiLoadingStage(prev => (prev + 1) % aiLoadingMessages.length)
      }, 5000) // Change every 5 seconds
      return () => clearInterval(interval)
    } else {
      setAiLoadingStage(0)
    }
  }, [aiLoading])

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
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string; size: number; file?: File }[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setUploadedImages(prev => [
        ...prev,
        ...newFiles.map(f => ({
          url: URL.createObjectURL(f),
          name: f.name,
          size: f.size,
          file: f
        }))
      ])
      // Reset input value so same files can be selected again if needed
      e.target.value = ''
    }
  }

  const openCloudinaryWidget = () => {
    document.getElementById('quote-attachment-input')?.click()
  }

  // Markup and labor rate control - fetch from contractor profile
  const [markupPercentage, setMarkupPercentage] = useState<number>(20) // Default 20%, will be updated from profile
  const [taxRate, setTaxRate] = useState<number>(8.25) // Default 8.25%, will be updated from profile
  const [laborChargeType, setLaborChargeType] = useState<LaborChargeType>(LaborChargeType.HOURLY) // Default to hourly
  const [laborRateValue, setLaborRateValue] = useState<number>(75) // Default $75, will be updated from profile
  const [laborUnitType, setLaborUnitType] = useState<UnitType | undefined>(undefined)
  const [loadingMarkup, setLoadingMarkup] = useState(!quoteId) // Only loading if not editing (no quoteId)
  const [showSubstitute, setShowSubstitute] = useState(false)
  const [substituteItemIndex, setSubstituteItemIndex] = useState<number | null>(null)

  // Track initial tax rate from profile to detect changes
  const [initialTaxRate, setInitialTaxRate] = useState<number | null>(null)

  // Inline search states for line items
  const [searchingItemIndex, setSearchingItemIndex] = useState<number | null>(null)
  const [itemSearchQueries, setItemSearchQueries] = useState<Record<number, string>>({})
  const [itemSearchResults, setItemSearchResults] = useState<Record<number, MaterialResult[]>>({})
  const [itemSearchLoading, setItemSearchLoading] = useState<Record<number, boolean>>({})

  // Template system states
  type TemplateListItem = { id: number; trade: string; project_type: string }
  type TemplateVariable = {
    id: number
    variable_name: string
    display_label: string
    input_type: string
    options?: string[]
    unit?: string
    is_required: boolean
    display_order: number
    placeholder?: string
    help_text?: string
  }
  type TemplateDetail = {
    id: number
    trade: string
    project_type: string
    prompt_template: string
    variables: TemplateVariable[]
  }
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null)
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false)
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [isCustomProject, setIsCustomProject] = useState(false)
  const [contractorType, setContractorType] = useState<string | null>(null)
  const [templateComboOpen, setTemplateComboOpen] = useState(false)

  // Hide project template selector in AI estimator until ready (still in development)
  const HIDE_AI_TEMPLATES = true

  // AI accuracy feedback (after generation)
  const [showAccuracyQuestion, setShowAccuracyQuestion] = useState(false)
  const [aiAccuracySubmitted, setAiAccuracySubmitted] = useState(false)

  // Sort and group templates - contractor type matches first, then rest
  const sortedTemplates = [...templates].sort((a, b) => {
    if (!contractorType) return 0

    const contractorTypeLower = contractorType.toLowerCase().trim()
    const aMatchesType = a.trade.toLowerCase() === contractorTypeLower
    const bMatchesType = b.trade.toLowerCase() === contractorTypeLower

    if (aMatchesType && !bMatchesType) return -1
    if (!aMatchesType && bMatchesType) return 1

    // If both match or both don't match, sort by trade then project_type
    if (a.trade !== b.trade) return a.trade.localeCompare(b.trade)
    return a.project_type.localeCompare(b.project_type)
  })

  // Fetch contractor profile to get default markup and tax rate
  useEffect(() => {
    // Always fetch profile to get current default tax rate (needed for tracking changes)
    // Markup will be loaded from initialData if editing, otherwise from profile
    fetchContractorMarkup()
  }, [quoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load clients on mount
  useEffect(() => {
    fetchClients()
  }, [])

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true)
      try {
        const data = await api.getTemplates()
        setTemplates(data)
      } catch (error) {
        console.error('Failed to fetch templates:', error)
        // Silently fail - templates are optional
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  // Fetch template details when a template is selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null)
      setTemplateVariables({})
      setGeneratedPrompt('')
      return
    }
    const fetchTemplateDetail = async () => {
      setLoadingTemplateDetail(true)
      try {
        const data = await api.getTemplate(selectedTemplateId)
        setSelectedTemplate(data)
        // Initialize variables with empty values
        const initialVars: Record<string, string> = {}
        data.variables.forEach((v) => {
          initialVars[v.variable_name] = ''
        })
        setTemplateVariables(initialVars)
        // Set project type from template
        setProjectType(data.project_type)
        setProjectTitle(data.project_type)
      } catch (error) {
        console.error('Failed to fetch template detail:', error)
        toast({
          title: 'Failed to load template',
          description: 'Please try again or use custom project type',
          variant: 'destructive',
        })
      } finally {
        setLoadingTemplateDetail(false)
      }
    }
    fetchTemplateDetail()
  }, [selectedTemplateId])

  // Generate prompt when template variables change
  useEffect(() => {
    if (!selectedTemplate) {
      setGeneratedPrompt('')
      return
    }
    let prompt = selectedTemplate.prompt_template
    Object.entries(templateVariables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `[${key}]`)
    })
    setGeneratedPrompt(prompt)
    // Also update service description with the generated prompt
    setServiceDescription(prompt)
  }, [templateVariables, selectedTemplate])

  // Handle template selection change
  const handleTemplateChange = (value: string) => {
    if (value === 'custom') {
      setSelectedTemplateId(null)
      setIsCustomProject(true)
      setProjectType('')
      setServiceDescription('')
    } else {
      setIsCustomProject(false)
      setSelectedTemplateId(parseInt(value, 10))
    }
  }

  // Handle template variable change
  const handleVariableChange = (variableName: string, value: string) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [variableName]: value,
    }))
  }

  // Fetch lead data if leadId is provided
  useEffect(() => {
    if (leadId) {
      fetchLeadData()
    }
  }, [leadId])

  // Fetch client data if clientId is provided (e.g. /quotes/new?clientId=50)
  useEffect(() => {
    if (clientId) {
      fetchClientData()
    }
  }, [clientId])

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
    const nameClean = clientName.trim().toLowerCase()
    const emailClean = clientEmail.trim().toLowerCase()

    // Match on phone number (require at least 7 digits)
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

    // Match on name (require at least 3 characters)
    if (nameClean.length >= 3) {
      allClients.forEach(client => {
        const clientNameClean = (client.name || '').toLowerCase()

        // Name match: check if names are similar (contains or starts with)
        const nameMatch = clientNameClean.includes(nameClean) || nameClean.includes(clientNameClean)

        if (nameMatch) {
          // Avoid duplicates
          if (!matches.find(m => m.id === client.id)) {
            matches.push(client)
          }
        }
      })
    }

    // Match on email (require at least 5 characters and contains @)
    if (emailClean.length >= 5 && emailClean.includes('@')) {
      allClients.forEach(client => {
        const clientEmailClean = (client.email || '').toLowerCase()

        // Email match: exact match, or entered email contains client email or vice versa
        // This handles cases like "john" matching "john@example.com"
        const emailMatch = clientEmailClean === emailClean ||
          clientEmailClean.includes(emailClean) ||
          emailClean.includes(clientEmailClean)

        if (emailMatch) {
          // Avoid duplicates
          if (!matches.find(m => m.id === client.id)) {
            matches.push(client)
          }
        }
      })
    }

    setMatchingClients(matches)
    // Show suggestions if we have matches and at least one field has enough input
    const hasEnoughInput = phoneClean.length >= 7 || nameClean.length >= 3 || (emailClean.length >= 5 && emailClean.includes('@'))
    setShowClientSuggestions(matches.length > 0 && hasEnoughInput)
  }, [clientPhone, clientName, clientEmail, allClients, selectedClientId])

  // Track if we've loaded initial data to prevent re-running
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)

  // Load initial quote data if editing or copying
  useEffect(() => {
    if (initialData && !hasLoadedInitialData) {
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
          title: item.title || "",
          description: item.custom_description || item.description || "",
          quantity: item.quantity || 1,
          rate: item.cost_per_unit || item.rate || 0,
          imageUrl: item.image_url || item.imageUrl,
          thumbnailUrl: item.thumbnail_url || item.thumbnailUrl,
          brand: item.brand,
          model: item.model,
          externalUrl: item.external_url || item.externalUrl,
          unitOfMeasure: item.unit_of_measure || item.unitOfMeasure || "each",
          applyTax: item.is_taxable !== false,
        }))
        setItems(lineItems)

        // If editing and items have markup, use the first item's markup
        const firstItem = initialData.items[0]
        if (firstItem?.markup_percentage !== undefined && firstItem.markup_percentage !== null) {
          const parsed = parseFloat(firstItem.markup_percentage.toString())
          setMarkupPercentage(isNaN(parsed) ? 20 : parsed)
        }
      }

      // Load attached project media
      if (initialData.project_media && initialData.project_media.length > 0) {
        setUploadedImages(initialData.project_media.map((media: any) => ({
          url: media.file_url,
          name: media.file_name || "attachment",
          size: media.file_size || 0,
        })))
      } else {
        // Clear if no media
        setUploadedImages([])
      }

      // Mark as loaded and ensure loadingMarkup is false for editing
      setHasLoadedInitialData(true)
      setLoadingMarkup(false)

      // Fetch project brief if quote is linked to a project
      if (initialData.project_id) {
        api.getProject(initialData.project_id)
          .then((p: any) => { if (p?.brief) setProjectBrief(p.brief) })
          .catch(() => {})
      }
    }
  }, [initialData, quoteId, hasLoadedInitialData])

  const fetchContractorMarkup = async () => {
    try {
      setLoadingMarkup(true)
      const profile = await api.getMyProfile() as any
      // Store contractor type for template sorting
      if (profile?.contractor_type) {
        setContractorType(profile.contractor_type)
      }
      // Only set markup if we don't have initialData (not editing) or if initialData doesn't have markup
      // When editing, markup comes from initialData items, but we still need to load tax rate from profile
      if (!initialData && profile?.default_markup_percentage !== undefined && profile.default_markup_percentage !== null) {
        const parsed = parseFloat(profile.default_markup_percentage)
        setMarkupPercentage(isNaN(parsed) ? 20 : parsed)
      }
      // Always load tax rate from profile (needed for tracking changes and updating profile)
      if (profile?.default_sales_tax_rate !== undefined && profile.default_sales_tax_rate !== null) {
        const parsed = parseFloat(profile.default_sales_tax_rate)
        const taxValue = isNaN(parsed) ? 8.25 : parsed
        // Only set tax rate if we haven't loaded initial data yet (to avoid overwriting during edit)
        if (!hasLoadedInitialData) {
          setTaxRate(taxValue)
        }
        setInitialTaxRate(taxValue) // Always track initial value from profile
      } else {
        if (!hasLoadedInitialData) {
          setTaxRate(8.25)
        }
        setInitialTaxRate(8.25) // Default if not in profile
      }
      // Store labor rate for calculations
      if (profile?.default_labor_rate_value !== undefined && profile.default_labor_rate_value !== null) {
        const parsed = parseFloat(String(profile.default_labor_rate_value))
        setLaborRateValue(isNaN(parsed) ? 75 : parsed)
      }
      // Store labor charge type
      if (profile?.default_labor_charge_type) {
        setLaborChargeType(profile.default_labor_charge_type)
      }
      // Store labor unit type
      if (profile?.default_labor_unit_type) {
        setLaborUnitType(profile.default_labor_unit_type)
      }
    } catch (error) {
      console.error("Failed to fetch contractor markup:", error)
      // Keep defaults: 20% markup, 8.25% tax, $75/hr labor
      if (!hasLoadedInitialData) {
        setTaxRate(8.25)
      }
      setInitialTaxRate(8.25) // Set default initial tax rate
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

      // Extract measurements from lead (if available)
      if (lead.measurements) {
        setMeasurements(lead.measurements)
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

  const fetchClientData = async () => {
    if (!clientId || isNaN(Number(clientId))) return
    try {
      setLoadingLead(true)
      const data = await api.getClientDetails(parseInt(clientId, 10)) as {
        id: number
        name: string
        email: string
        phone?: string
        address?: string
        billing_address?: string
      }
      setSelectedClientId(data.id)
      setClientName(data.name || "")
      setClientEmail(data.email || "")
      setClientPhone(data.phone || "")
      setClientAddress(data.address || data.billing_address || "")
    } catch (error) {
      console.error("Failed to fetch client data:", error)
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
        labor_charge_type: laborChargeType,
        labor_rate_value: laborRateValue,
        labor_unit_type: laborUnitType,
        project_brief: useBriefAsContext && projectBrief ? projectBrief : undefined,
      }) as any

      // Validate response structure to prevent crashes
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server. Please try again.')
      }

      // Log for debugging
      console.log("📐 Estimate generation request:", {
        description: serviceDescription.substring(0, 50) + "...",
        project_type: projectType,
        has_measurements: measurements.items.length > 0,
        measurements_count: measurements.items.length,
        lead_id: leadId,
      })

      // Safely convert response line items to LineItem format
      const lineItems = Array.isArray(response.line_items) ? response.line_items : []
      const newItems: LineItem[] = lineItems.map((item: any, idx: number) => ({
        title: deriveLineItemTitle(item.title, item.description),
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
        applyTax: true, // Default to applying tax on all AI-generated items
      }))

      // Auto-fill line items directly
      setItems(newItems)

      // Safely store assumptions and warnings
      setAssumptions(Array.isArray(response.assumptions) ? response.assumptions : [])
      setWarnings(Array.isArray(response.warnings) ? response.warnings : [])

      setShowAccuracyQuestion(true)
      setAiAccuracySubmitted(false)

      toast({
        title: "Estimate generated",
        description: `Generated ${newItems.length} line items with AI`,
      })

      // Auto-save when editing an existing quote so line items are not lost (pass newItems so we save the just-generated items)
      if (quoteId) {
        autoSaveDraft(undefined, newItems).catch(() => { })
      }
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

  const buildJobUpdatePayload = (notesOverride?: string, itemsOverride?: LineItem[]) => {
    const sourceItems = itemsOverride ?? items
    const validItems = sourceItems.filter(item =>
      (item.description.trim() || (item.title && item.title.trim())) &&
      (item.quantity || 0) > 0 &&
      getRateNumber(item.rate) > 0
    )
    return {
      job_description: serviceDescription.trim() || null,
      customer_notes: (notesOverride !== undefined ? notesOverride : notes.trim()) || null,
      payment_terms: paymentTerms.trim() || null,
      quote_expiration_date: dueDate || null,
      location_zip_code: clientAddress.trim() ? extractZipCode(clientAddress) : null,
      items: validItems.map(item => ({
        title: item.title?.trim() || null,
        custom_description: item.description.trim(),
        quantity: item.quantity,
        cost_per_unit: getRateNumber(item.rate),
        image_url: item.imageUrl || null,
        thumbnail_url: item.thumbnailUrl || null,
        brand: item.brand || null,
        model: item.model || null,
        external_url: item.externalUrl || null,
        unit_of_measure: item.unitOfMeasure || "each",
        is_taxable: item.applyTax !== false,
        markup_percentage: markupPercentage,
      }))
    }
  }

  const autoSaveDraft = async (notesOverride?: string, itemsOverride?: LineItem[]) => {
    if (!quoteId) return
    try {
      const payload = buildJobUpdatePayload(notesOverride, itemsOverride)
      await api.updateJob(parseInt(quoteId), payload)
      toast({ title: "Draft saved", description: "Your changes have been saved." })
    } catch {
      toast({ title: "Draft could not be saved", description: "Use Save to retry.", variant: "destructive" })
    }
  }

  const handleAccuracyRating = (rating: number) => {
    const line = `[AI accuracy: ${rating}/5]`
    const newNotes = notes.trim() ? `${notes.trim()}\n${line}` : line
    setNotes(newNotes)
    setShowAccuracyQuestion(false)
    setAiAccuracySubmitted(true)
    if (quoteId) {
      autoSaveDraft(newNotes).catch(() => { })
    }
  }

  const addItem = () => {
    setItems([...items, { title: "", description: "", quantity: 0, rate: "", applyTax: true }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
    setDescriptionEditorsOpen((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    )
  }

  const showDescriptionEditor = (index: number) => {
    setDescriptionEditorsOpen((prev) => (prev.includes(index) ? prev : [...prev, index]))
  }

  const isDescriptionEditorVisible = (index: number, item: LineItem) =>
    descriptionEditorsOpen.includes(index) || item.description.trim().length > 0

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
    // Address is now optional - removed validation

    // Check if at least one line item has description or title and rate
    const validItems = items.filter(item =>
      (item.description.trim() || (item.title && item.title.trim())) &&
      (item.quantity || 0) > 0 &&
      getRateNumber(item.rate) > 0
    )

    if (validItems.length === 0) {
      return "At least one line item with a title or description, quantity, and rate is required"
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
        (item.description.trim() || (item.title && item.title.trim())) &&
        (item.quantity || 0) > 0 &&
        getRateNumber(item.rate) > 0
      )

      // Prepare job data
      const jobData = {
        lead_id: leadId && !isNaN(Number(leadId)) ? parseInt(leadId, 10) : null, // Link to original lead if creating from lead
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null, // Address is optional
        location_zip_code: clientAddress.trim() ? extractZipCode(clientAddress) : null,
        job_description: serviceDescription.trim() || null,
        customer_notes: notes.trim() || null,
        payment_terms: paymentTerms.trim() || null,
        quote_expiration_date: dueDate || null,
        items: validItems.map(item => ({
          title: item.title?.trim() || null,
          custom_description: item.description.trim(),
          quantity: item.quantity,
          cost_per_unit: getRateNumber(item.rate),
          image_url: item.imageUrl || null,
          thumbnail_url: item.thumbnailUrl || null,
          brand: item.brand || null,
          model: item.model || null,
          external_url: item.externalUrl || null,
          unit_of_measure: item.unitOfMeasure || "each",
          is_taxable: item.applyTax !== false,
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

      // Schedule automatic quote follow-up via contractor-ai (if enabled in Scheduling settings)
      const spId = getContractorAISpId?.()
      if (spId != null && clientPhone?.trim()) {
        try {
          const jobId = (response as { id?: number })?.id ?? (quoteId ? parseInt(quoteId, 10) : undefined)
          await contractorAI.scheduleQuoteFollowup({
            sp_id: spId,
            customer_number: clientPhone.trim(),
            reference_type: "quote",
            reference_id: jobId,
            customer_name: clientName?.trim() || undefined,
          })
        } catch (followupErr) {
          console.error("Quote follow-up scheduling failed (quote was still saved):", followupErr)
        }
      }

      // Update profile's default tax rate if it has changed
      if (initialTaxRate !== null && Math.abs(taxRate - initialTaxRate) > 0.01) {
        try {
          await api.updateProfile({
            default_sales_tax_rate: taxRate
          })
          // Update initial tax rate to the new value so we don't update again unnecessarily
          setInitialTaxRate(taxRate)
          toast({
            title: "Profile updated",
            description: `Default tax rate updated to ${taxRate.toFixed(2)}%`,
          })
        } catch (profileError) {
          // Log error but don't block quote creation
          console.error("Failed to update profile tax rate:", profileError)
        }
      }

      const finalJobId = (response as any)?.id || (quoteId ? parseInt(quoteId, 10) : null)

      // Attach any uploaded images
      if (finalJobId) {
        const filesToUpload = uploadedImages
          .filter(img => img.file)
          .map(img => img.file as File)

        if (filesToUpload.length > 0) {
          try {
            await api.uploadJobMedia(finalJobId, filesToUpload)
          } catch (imgError) {
            console.error("Failed to upload new job media:", imgError)
          }
        }
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

  // Calculate taxable subtotal (only items where applyTax is true or undefined)
  const taxableSubtotal = items.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * getRateNumber(item.rate)
    const itemTotalWithMarkup = itemTotal * (1 + markupPercentage / 100)
    // Apply tax if applyTax is true or undefined (default behavior)
    if (item.applyTax !== false) {
      return sum + itemTotalWithMarkup
    }
    return sum
  }, 0)

  // Calculate tax using contractor's tax rate on taxable items only
  const tax = taxableSubtotal * (taxRate / 100)
  const total = subtotal + tax

  return (
    <div className="mx-auto max-w-[1800px] px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 pt-6">
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0 space-y-6 lg:basis-0">
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
                              <span className="flex-shrink-0">{formatPhoneForDisplay(client.phone)}</span>
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
                  searchResults: material.searchResults, // Store all search results for substitutes
                  applyTax: true, // Default to applying tax on materials
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
                  <button className="w-full flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">AI Estimate Generator</h3>
                        <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/30">
                          Beta
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <span className="mt-0.5 shrink-0" aria-hidden>ℹ️</span>
                        <span>Still in development — feel free to try it out.</span>
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
                  <div className="p-3 border-t bg-background">
                    <div className="space-y-2">
                      {/* Template Selector (Mobile) - hidden while in development */}
                      {!HIDE_AI_TEMPLATES && templates.length > 0 && (
                        <div>
                          <Label htmlFor="template-select-mobile" className="text-sm font-medium mb-1 block">
                            Project Template
                          </Label>
                          <Popover open={templateComboOpen} onOpenChange={setTemplateComboOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={templateComboOpen}
                                className="w-full justify-between bg-background"
                                disabled={loadingTemplates}
                              >
                                {loadingTemplates ? (
                                  "Loading..."
                                ) : isCustomProject ? (
                                  "✏️ Custom Project"
                                ) : selectedTemplateId ? (
                                  (() => {
                                    const template = templates.find((t) => t.id === selectedTemplateId)
                                    return template ? `${template.project_type} (${template.trade})` : "Select project..."
                                  })()
                                ) : (
                                  "Select project..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search templates..." />
                                <CommandList>
                                  <CommandEmpty>No template found.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value="custom"
                                      onSelect={() => {
                                        handleTemplateChange('custom')
                                        setTemplateComboOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          isCustomProject ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      ✏️ Custom Project
                                    </CommandItem>
                                    {sortedTemplates.map((t) => (
                                      <CommandItem
                                        key={t.id}
                                        value={`${t.project_type} ${t.trade}`}
                                        onSelect={() => {
                                          handleTemplateChange(String(t.id))
                                          setTemplateComboOpen(false)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedTemplateId === t.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {t.project_type} <span className="text-muted-foreground ml-1">({t.trade})</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {/* Dynamic Variable Form (Mobile) */}
                      {!HIDE_AI_TEMPLATES && selectedTemplate && !isCustomProject && (
                        <div className="space-y-1.5 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Details</h4>
                          {loadingTemplateDetail ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Loading...
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {selectedTemplate.variables.map((v) => (
                                <div key={v.id}>
                                  <Label htmlFor={`var-mobile-${v.variable_name}`} className="text-xs font-medium">
                                    {v.display_label}{v.is_required && <span className="text-destructive ml-0.5">*</span>}
                                    {v.unit && <span className="text-muted-foreground font-normal ml-1">({v.unit})</span>}
                                  </Label>
                                  {v.input_type === 'select' && v.options ? (
                                    <Select
                                      value={templateVariables[v.variable_name] || ''}
                                      onValueChange={(val) => handleVariableChange(v.variable_name, val)}
                                    >
                                      <SelectTrigger id={`var-mobile-${v.variable_name}`} className="bg-background h-8 text-sm">
                                        <SelectValue placeholder={`Select...`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {v.options.map((opt) => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      id={`var-mobile-${v.variable_name}`}
                                      type={v.input_type === 'number' ? 'number' : 'text'}
                                      placeholder={v.placeholder || ''}
                                      value={templateVariables[v.variable_name] || ''}
                                      onChange={(e) => handleVariableChange(v.variable_name, e.target.value)}
                                      className="bg-background h-8 text-sm"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Project (Mobile) */}
                      {(HIDE_AI_TEMPLATES || isCustomProject || !selectedTemplate) && (
                        <>
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
                        </>
                      )}

                      {(() => {
                        const desc = serviceDescription.trim()
                        const wordCount = desc ? desc.split(/\s+/).length : 0
                        const tooShort = desc.length < 30 || wordCount < 6
                        return (
                          <div className="flex flex-col gap-2 w-full">
                            {projectBrief && (
                              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <input
                                  type="checkbox"
                                  checked={useBriefAsContext}
                                  onChange={(e) => setUseBriefAsContext(e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 accent-primary"
                                />
                                Use project brief as context
                              </label>
                            )}
                            <Button onClick={fetchAiEstimate} disabled={aiLoading || tooShort || !serviceDescription.trim()} className="w-full">
                              {aiLoading ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  {aiLoadingMessages[aiLoadingStage]}
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
                            {aiLoading && (
                              <div className="w-full space-y-2">
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(95, (aiLoadingStage + 1) * 20)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                  This usually takes 15-30 seconds
                                </p>
                              </div>
                            )}
                            {!aiLoading && tooShort && (
                              <p className="text-xs text-muted-foreground w-full">
                                Please add at least 30 characters and 6 words for better results.
                              </p>
                            )}
                          </div>
                        )
                      })()}

                      {/* AI accuracy feedback - mobile */}
                      {showAccuracyQuestion && (
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 space-y-2">
                          <p className="text-xs font-medium text-center">How accurate was this?</p>
                          <div className="flex items-center justify-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleAccuracyRating(n)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base transition-colors hover:bg-primary/10 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                aria-label={`Rate ${n} out of 5`}
                              >
                                {n === 1 ? "😞" : n === 2 ? "😐" : n === 3 ? "🙂" : n === 4 ? "😊" : "😄"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {aiAccuracySubmitted && (
                        <p className="text-sm text-muted-foreground text-center">Thanks for your feedback!</p>
                      )}

                      {assumptions.length > 0 && (
                        <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
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
          <Card className="p-3 sm:p-4 rounded-lg border border-border">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">Line Items</h2>
              <Button onClick={addItem} className="h-10 px-4 text-sm font-medium">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </Button>
            </div>

            {/* Table Header - Desktop */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_110px_72px_88px_88px_64px] gap-2 px-2 py-1.5 mb-2 border-b border-border text-left items-center">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title & Description</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Qty</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Rate</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Total</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Tax</div>
            </div>

            <div className="space-y-1.5">
              {/* Skeleton Loading when AI is generating */}
              {aiLoading && items.length === 0 && (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse flex gap-2 p-2 rounded-md border border-border bg-muted/30">
                      <div className="h-8 w-8 bg-muted rounded shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="h-8 w-16 bg-muted rounded" />
                        <div className="h-8 w-20 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                  <p className="text-sm text-center text-muted-foreground py-2">
                    AI is generating line items...
                  </p>
                </div>
              )}

              {items.map((item, index) => (
                <div key={index} className="relative rounded-md border border-border bg-card p-2 shadow-sm">
                  {/* Delete Button - Mobile: Top Right */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="absolute right-0 top-0 z-10 h-7 w-7 -translate-y-1/4 translate-x-1/4 rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:border-red-200 hover:bg-red-500 hover:text-white"
                    aria-label="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Mobile Layout */}
                  <div className="block sm:hidden space-y-3">
                    {/* Search button row */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Line Item</span>
                      <LineItemSearchPopover
                        onSelect={(result: LineItemSearchResult) => {
                          const updated = [...items]
                          updated[index] = {
                            ...updated[index],
                            description: result.description,
                            rate: result.price,
                            unitOfMeasure: result.unit,
                          }
                          if (result.title) updated[index].title = result.title
                          setItems(updated)
                        }}
                      />
                    </div>
                    {/* Title */}
                    <div>
                      <Label htmlFor={`item-title-mobile-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Title
                      </Label>
                      <Input
                        id={`item-title-mobile-${index}`}
                        value={item.title || ""}
                        onChange={(e) => updateItem(index, "title", e.target.value)}
                        placeholder="Item title (optional)"
                        className="h-10 text-sm"
                      />
                    </div>
                    {/* Description */}
                    <div>
                      <Label htmlFor={`item-desc-mobile-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Description
                      </Label>
                      <Textarea
                        id={`item-desc-mobile-${index}`}
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Enter item description (e.g., materials, labor, services, etc.)"
                        className="min-h-[44px] py-2 px-3 text-sm resize-none"
                        rows={2}
                      />
                      {item.brand && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.brand} {item.model && `- ${item.model}`}
                        </p>
                      )}
                      {item.confidence && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.confidence === "high" ? "bg-green-100 text-green-700" :
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
                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">Apply Tax</span>
                        <Checkbox
                          checked={item.applyTax !== false}
                          onCheckedChange={(checked) => {
                            const updatedItems = [...items]
                            updatedItems[index] = {
                              ...updatedItems[index],
                              applyTax: checked === true
                            }
                            setItems(updatedItems)
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout - Table Style */}
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_110px_72px_88px_88px_64px] gap-2 items-start">
                    {/* Title + Description stacked in one column */}
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <LineItemTitleAutocomplete
                            value={item.title || ""}
                            onChange={(val) => updateItem(index, "title", val)}
                            onSelect={(result) => {
                              const updated = [...items]
                              updated[index] = {
                                ...updated[index],
                                description: result.description,
                                rate: result.price,
                                unitOfMeasure: result.unit,
                              }
                              if (result.title) updated[index].title = result.title
                              setItems(updated)
                              if (result.description?.trim()) {
                                showDescriptionEditor(index)
                              }
                            }}
                            placeholder="Item name"
                          />
                        </div>
                        {!isDescriptionEditorVisible(index, item) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => showDescriptionEditor(index)}
                                  className="h-9 w-9 shrink-0 border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-700"
                                  aria-label="Add description"
                                >
                                  <span className="text-lg leading-none">+</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add description</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      {isDescriptionEditorVisible(index, item) && (
                        <div className="flex items-start gap-1.5">
                          {(item.thumbnailUrl || item.imageUrl) && (
                            <MaterialThumbnail
                              src={item.thumbnailUrl || item.imageUrl}
                              alt={item.description}
                              className="w-7 h-7 flex-shrink-0 rounded mt-1.5"
                              category={item.category}
                              index={index}
                            />
                          )}
                          <Textarea
                            value={item.description}
                            onChange={(e) => {
                              updateItem(index, "description", e.target.value)
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            onFocus={(e) => {
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            placeholder="Enter item description"
                            className="min-h-[36px] py-2 px-3 text-sm border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors flex-1 min-w-0 resize-none overflow-hidden"
                            rows={1}
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto'
                                el.style.height = el.scrollHeight + 'px'
                              }
                            }}
                          />
                        </div>
                      )}

                      {item.brand && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.brand} {item.model && `- ${item.model}`}
                        </p>
                      )}
                    </div>

                    {/* Unit */}
                    <div>
                      <UnitSelector
                        value={item.unitOfMeasure || ""}
                        onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                        description={item.description}
                      />
                    </div>

                    {/* Qty */}
                    <div>
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

                    {/* Rate */}
                    <div className="min-w-0">
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
                        className="h-9 w-full min-w-0 text-sm text-right tabular-nums"
                      />
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        ${(((item.quantity || 0) * getRateNumber(item.rate)) * (1 + markupPercentage / 100)).toFixed(2)}
                      </span>
                    </div>

                    {/* Apply Tax Checkbox */}
                    <div className="flex justify-center">
                      <Checkbox
                        checked={item.applyTax !== false}
                        onCheckedChange={(checked) => {
                          const updatedItems = [...items]
                          updatedItems[index] = {
                            ...updatedItems[index],
                            applyTax: checked === true
                          }
                          setItems(updatedItems)
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Markup Settings */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
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
                    value={markupPercentage === 0 ? "0" : markupPercentage.toString()}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "" || val === "-") {
                        setMarkupPercentage(0)
                      } else {
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          setMarkupPercentage(Math.max(0, Math.min(100, num)))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value
                      if (val === "" || val === "-") {
                        setMarkupPercentage(0)
                      } else {
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          setMarkupPercentage(Math.max(0, Math.min(100, num)))
                        } else {
                          setMarkupPercentage(0)
                        }
                      }
                    }}
                    placeholder="0"
                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={loadingMarkup}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Tax Rate Settings */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="tax-rate" className="text-sm font-medium">
                    Tax Rate
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sales tax rate applied to subtotal. Default from your profile settings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate === 0 ? "0" : taxRate.toString()}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "" || val === "-") {
                        setTaxRate(0)
                      } else {
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          setTaxRate(Math.max(0, Math.min(100, num)))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value
                      if (val === "" || val === "-") {
                        setTaxRate(0)
                      } else {
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          setTaxRate(Math.max(0, Math.min(100, num)))
                        } else {
                          setTaxRate(0)
                        }
                      }
                    }}
                    placeholder="0.00"
                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Additional Details</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex gap-2 items-center text-muted-foreground hover:text-foreground"
                onClick={openCloudinaryWidget}
                disabled={uploadingImage}
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                <span className="text-xs font-medium">Add Attachment</span>
              </Button>
              <input
                type="file"
                id="quote-attachment-input"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
              />
            </div>

            {uploadedImages.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-4 p-4 border border-dashed rounded-lg bg-slate-50/50">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 border rounded-md overflow-hidden bg-white shadow-sm group">
                    <img src={img.url} alt="Attachment" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => setUploadedImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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

          <div className="border-t border-border/70 pt-4">
            <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Measurements</h2>
                <p className="text-sm text-muted-foreground">
                  Optional. Add dimensions only if they help the estimate.
                </p>
              </div>
              <MeasurementsInput
                value={measurements}
                onChange={setMeasurements}
                minimal
              />
            </div>
          </div>

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
                  {quoteId ? "Update Quote" : "Save Quote"}
                </>
              )}
            </Button>
            {quoteId && (
              <Button size="lg" variant="outline" asChild>
                <a href={`/quotes/${quoteId}`}>
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview Quote
                </a>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <a href={quoteId ? `/quotes/${quoteId}` : "/quotes"}>Cancel          </a>
            </Button>
          </div>
        </div>

        {/* Right Column - AI Assistant */}
        <div className="hidden lg:block lg:w-[360px] xl:w-[380px] 2xl:w-[400px] space-y-6 pt-6 flex-shrink-0">
          <div className="sticky top-6 space-y-6">
            {/* AI Line Items Assistant */}
            <Card className="border-primary/20 bg-primary/5 p-5 sm:p-6 rounded-xl">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold">AI Estimate Generator</h2>
                    <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary border border-primary/30">
                      Beta
                    </span>
                  </div>
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <span className="mt-0.5 shrink-0" aria-hidden>ℹ️</span>
                    <span>Still in development — feel free to try it out.</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Template Selector - hidden while in development */}
                  {!HIDE_AI_TEMPLATES && templates.length > 0 && (
                    <div>
                      <Label htmlFor="template-select-desktop" className="text-sm font-medium mb-1 block">
                        Project Template
                      </Label>
                      <Popover open={templateComboOpen} onOpenChange={setTemplateComboOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={templateComboOpen}
                            className="w-full justify-between bg-background"
                            disabled={loadingTemplates}
                          >
                            {loadingTemplates ? (
                              "Loading templates..."
                            ) : isCustomProject ? (
                              "✏️ Custom Project"
                            ) : selectedTemplateId ? (
                              (() => {
                                const template = templates.find((t) => t.id === selectedTemplateId)
                                return template ? `${template.project_type} (${template.trade})` : "Select a project type..."
                              })()
                            ) : (
                              "Select a project type..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search templates..." />
                            <CommandList>
                              <CommandEmpty>No template found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="custom"
                                  onSelect={() => {
                                    handleTemplateChange('custom')
                                    setTemplateComboOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isCustomProject ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  ✏️ Custom Project
                                </CommandItem>
                                {sortedTemplates.map((t) => (
                                  <CommandItem
                                    key={t.id}
                                    value={`${t.project_type} ${t.trade}`}
                                    onSelect={() => {
                                      handleTemplateChange(String(t.id))
                                      setTemplateComboOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedTemplateId === t.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {t.project_type} <span className="text-muted-foreground ml-1">({t.trade})</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Dynamic Variable Form (when template selected) */}
                  {!HIDE_AI_TEMPLATES && selectedTemplate && !isCustomProject && (
                  <div className="space-y-1.5 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Details</h4>
                    {loadingTemplateDetail ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading variables...
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedTemplate.variables.map((v) => (
                          <div key={v.id}>
                            <Label htmlFor={`var-${v.variable_name}`} className="text-xs font-medium">
                              {v.display_label}{v.is_required && <span className="text-destructive ml-0.5">*</span>}
                              {v.unit && <span className="text-muted-foreground font-normal ml-1">({v.unit})</span>}
                            </Label>
                            {v.input_type === 'select' && v.options ? (
                              <Select
                                value={templateVariables[v.variable_name] || ''}
                                onValueChange={(val) => handleVariableChange(v.variable_name, val)}
                              >
                                <SelectTrigger id={`var-${v.variable_name}`} className="bg-background h-8 text-sm">
                                  <SelectValue placeholder={`Select ${v.display_label.toLowerCase()}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {v.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id={`var-${v.variable_name}`}
                                type={v.input_type === 'number' ? 'number' : 'text'}
                                placeholder={v.placeholder || ''}
                                value={templateVariables[v.variable_name] || ''}
                                onChange={(e) => handleVariableChange(v.variable_name, e.target.value)}
                                className="bg-background h-8 text-sm"
                              />
                            )}
                            {v.help_text && <p className="text-xs text-muted-foreground mt-0.5">{v.help_text}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prompt Preview Toggle */}
                    <div className="pt-1.5 border-t border-border/50 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPromptPreview(!showPromptPreview)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {showPromptPreview ? '▼ Hide' : '▶ Show'} AI Prompt (review & edit)
                      </button>
                      {showPromptPreview && (
                        <div className="mt-1.5">
                          <Textarea
                            value={serviceDescription}
                            onChange={(e) => setServiceDescription(e.target.value)}
                            className="min-h-[64px] max-h-[140px] overflow-y-auto resize-y bg-background text-xs font-mono py-2 px-3"
                            placeholder="AI prompt will appear here..."
                            aria-label="AI prompt sent to estimate generator — edit as needed before generating"
                          />
                          <p className="text-[11px] text-muted-foreground mt-0.5">This prompt is sent to the AI. Review and edit above, then generate.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                  {/* Custom Project Description (when custom or no templates) */}
                  {(HIDE_AI_TEMPLATES || isCustomProject || !selectedTemplate) && (
                  <>
                    <div>
                      <Label htmlFor="project-type-desktop" className="text-sm font-medium mb-1 block">
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
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="labor-rate-ai-desktop" className="text-sm font-medium mb-1 block">
                      Labor Rate {getRateLabelSuffix(laborChargeType, laborUnitType) && <span className="text-muted-foreground font-normal">({getRateLabelSuffix(laborChargeType, laborUnitType)})</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        id="labor-rate-ai-desktop"
                        type="number"
                        min="0"
                        step="0.01"
                        value={laborRateValue === 0 ? "" : laborRateValue}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === "") {
                            setLaborRateValue(0)
                          } else {
                            const num = parseFloat(val) || 0
                            setLaborRateValue(Math.max(0, num))
                          }
                        }}
                        placeholder="75"
                        className="bg-background pl-7"
                        disabled={loadingMarkup}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="labor-charge-type-desktop" className="text-sm font-medium mb-1 block">
                      Labor Rate Type
                    </Label>
                    <Select
                      value={
                        // Map DB values to UI: PER_UNIT + SQ_FT = "PER_SF"
                        laborChargeType === LaborChargeType.PER_UNIT && laborUnitType === UnitType.SQ_FT
                          ? "PER_SF"
                          : laborChargeType
                      }
                      onValueChange={(value) => {
                        if (value === "PER_SF") {
                          setLaborChargeType(LaborChargeType.PER_UNIT)
                          setLaborUnitType(UnitType.SQ_FT)
                        } else {
                          setLaborChargeType(value as LaborChargeType)
                          setLaborUnitType(undefined)
                        }
                      }}
                      disabled={loadingMarkup}
                    >
                      <SelectTrigger id="labor-charge-type-desktop" className="bg-background">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LaborChargeType.HOURLY}>Per Hour</SelectItem>
                        <SelectItem value={LaborChargeType.PER_DAY}>Per Day</SelectItem>
                        <SelectItem value="PER_SF">Per sf</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  {(() => {
                    const desc = serviceDescription.trim()
                    const wordCount = desc ? desc.split(/\s+/).length : 0
                    const tooShort = desc.length < 30 || wordCount < 6
                    return (
                      <div className="flex flex-col gap-2 w-full">
                        <Button onClick={fetchAiEstimate} disabled={aiLoading || tooShort || !serviceDescription.trim()} className="w-full">
                          {aiLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              {aiLoadingMessages[aiLoadingStage]}
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
                        {aiLoading && (
                          <div className="w-full space-y-2">
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(95, (aiLoadingStage + 1) * 20)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              This usually takes 15-30 seconds
                            </p>
                          </div>
                        )}
                        {!aiLoading && tooShort && (
                          <p className="text-xs text-muted-foreground w-full">
                            Please add at least 30 characters and 6 words (material, size, brand/use) for better results.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* AI accuracy feedback - desktop */}
                  {showAccuracyQuestion && (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 space-y-2">
                    <p className="text-xs font-medium text-center">How accurate was this?</p>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleAccuracyRating(n)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base transition-colors hover:bg-primary/10 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          aria-label={`Rate ${n} out of 5`}
                        >
                          {n === 1 ? "😞" : n === 2 ? "😐" : n === 3 ? "🙂" : n === 4 ? "😊" : "😄"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                  {aiAccuracySubmitted && (
                    <p className="text-sm text-muted-foreground text-center">Thanks for your feedback!</p>
                  )}

                  {assumptions.length > 0 && (
                  <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
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

                  {/* Display Measurements if available */}
                  {measurements.items && measurements.items.length > 0 && (
                  <div className="mt-2 p-2.5 bg-muted/50 rounded-lg border border-border/50">
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
            </Card>
          </div>

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
