"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
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
import { api, contractorAI, ScopeClarifiedScope } from "@/lib/api"
import { Lead, ContractorProfile, Client, Measurements, LaborChargeType, UnitType, getLaborChargeTypeLabel, getRateLabelSuffix } from "@/lib/types"
import type { PaymentScheduleLineInput } from "@/lib/types"
import {
  normalizeTrigger,
  drawsOverContract,
} from "@/components/payment-schedule-builder"
import { BillingSection } from "@/components/billing-section"
import { formatPhoneForDisplay } from "@/lib/utils"
import { MeasurementsInput } from "@/components/measurements-input"
import { LineItemSearchPopover, LineItemTitleAutocomplete, type LineItemSearchResult } from "@/components/quote-item-autocomplete"
import Image from "next/image"
import { Check, ChevronsUpDown, FolderOpen, Image as ImageIcon, Loader2, Plus, X } from "lucide-react"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { consumeQuotePrefill } from "@/lib/quote-prefill"
import { AiCapturedDescription } from "@/components/shared/ai-captured-description"
import { callSummaryToDescription } from "@/lib/call-summary"
import { cn } from "@/lib/utils"
import {
  AI_ESTIMATE_LOADING_HINT,
  AI_ESTIMATE_LOADING_INTERVAL_MS,
  AI_ESTIMATE_LOADING_MESSAGES,
} from "@/lib/ai-estimate-loading"
import { agUiState, applyJsonPatch } from "@/lib/ag-ui-state"


export interface LineItem {
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


export const COMMON_UNITS = [
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
export function getSuggestedUnits(description: string): string[] {
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

export function sanitizeDecimalInput(value: string): string {
  // Allow only digits and a single dot. Keep intermediate states like "" or "." while typing.
  const cleaned = value.replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  if (parts.length <= 1) return cleaned
  const decimal = parts.slice(1).join("").slice(0, 2) // max 2 decimals
  return `${parts[0]}.${decimal}`
}

export function getRateNumber(rate: LineItem["rate"]): number {
  if (typeof rate === "number") return rate
  const n = Number.parseFloat(rate)
  return Number.isFinite(n) ? n : 0
}

export function hasLineItemIdentity(item: LineItem): boolean {
  return Boolean(item.description.trim() || item.title?.trim())
}

export function hasLineItemInput(item: LineItem): boolean {
  const rateHasInput = typeof item.rate === "number" ? item.rate !== 0 : item.rate.trim() !== ""
  return hasLineItemIdentity(item) || item.quantity !== 0 || rateHasInput
}

export function isValidChargeItem(item: LineItem): boolean {
  const quantity = Number(item.quantity)
  const rate = getRateNumber(item.rate)
  return hasLineItemIdentity(item) && Number.isFinite(quantity) && quantity > 0 && rate > 0
}

export const quoteInputSurfaceClass =
  "border-slate-300/80 bg-slate-50/80 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20 disabled:bg-slate-100/70"

export const quoteTextareaSurfaceClass =
  "border-slate-300/80 bg-slate-50/80 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/20"

// Unit Selector Component
export function UnitSelector({ value, onChange, description }: { value: string; onChange: (value: string) => void; description: string }) {
  const tq = useTranslations("quotes")
  const unitLabel = (u: { value: string; label: string }) => {
    const k = `creator.units.${u.value.replace(/ /g, "_")}`
    return tq.has(k) ? tq(k) : u.label
  }
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
            <SelectValue placeholder={tq("creator.selectUnit")} />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {/* Suggested units based on description */}
            {suggestedUnits.length > 0 && (
              <>
                {suggestedUnits.map(unit => {
                  const unitInfo = COMMON_UNITS.find(u => u.value === unit)
                  return (
                    <SelectItem key={unit} value={unit} className="text-xs">
                      {unitInfo ? unitLabel(unitInfo) : unit}
                    </SelectItem>
                  )
                })}
                {remainingUnits.length > 0 && <div className="border-t my-1"></div>}
              </>
            )}

            {/* Remaining common units (excluding suggested ones) */}
            {remainingUnits.map(unit => (
              <SelectItem key={unit.value} value={unit.value} className="text-xs">
                {unitLabel(unit)}
              </SelectItem>
            ))}

            {/* Custom option */}
            <div className="border-t my-1"></div>
            <SelectItem value="custom" className="text-xs">
              {tq("creator.addCustomUnit")}
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-1 w-full">
          <Input
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder={tq("creator.customUnit")}
            className={cn(quoteInputSurfaceClass, "flex-1 min-w-0")}
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
export function getItemIcon(description: string, category?: string, index: number = 0) {
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
export function MaterialThumbnail({ src, alt, className, category, index }: {
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
