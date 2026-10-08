
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
import { sanitizeDecimalInput, getRateNumber, hasLineItemIdentity, hasLineItemInput, isValidChargeItem, quoteInputSurfaceClass, quoteTextareaSurfaceClass, UnitSelector, MaterialThumbnail, type LineItem } from "@/components/quote-creator-helpers"

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
interface QuoteCreatorProps {
  leadId?: string | null
  clientId?: string | null
  projectId?: string | null
  callLeadId?: string | null
  phone?: string | null
  quoteId?: string | null
  initialData?: any // Job/Quote data for editing
  onProjectContextChange?: (context: { projectId: number | null; clientId: number | null }) => void
}

export function QuoteCreator({ leadId, clientId, projectId, callLeadId, phone, quoteId, initialData, onProjectContextChange }: QuoteCreatorProps) {
  const { toast } = useToast()
  const tq = useTranslations("quotes")
  const locale = useLocale()
  const [serviceDescription, setServiceDescription] = useState("")
  // Keep call summaries separate from the quote description until the user has
  // reviewed the AI-refined scope in the captured-description panel.
  const [callSummarySource, setCallSummarySource] = useState("")
  const [refinedCallDescription, setRefinedCallDescription] = useState("")
  const [projectType, setProjectType] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoadingStage, setAiLoadingStage] = useState(0)
  const [aiLoadingProgress, setAiLoadingProgress] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({})
  const [descriptionEditorsOpen, setDescriptionEditorsOpen] = useState<number[]>([])
  const [measurements, setMeasurements] = useState<Measurements>({ items: [] })
  const [assumptions, setAssumptions] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false)
  const [useBriefAsContext, setUseBriefAsContext] = useState(true)
  const [projectBrief, setProjectBrief] = useState<any>(null)

  const aiLoadingMessages = AI_ESTIMATE_LOADING_MESSAGES

  // Rotate fun loading copy + slow progress bar while estimate runs (up to ~3 min)
  useEffect(() => {
    if (!aiLoading) {
      setAiLoadingStage(0)
      setAiLoadingProgress(0)
      return
    }
    setAiLoadingStage(0)
    setAiLoadingProgress(6)
    const started = Date.now()
    const rotate = setInterval(() => {
      setAiLoadingStage((prev) => (prev + 1) % aiLoadingMessages.length)
    }, AI_ESTIMATE_LOADING_INTERVAL_MS)
    const progress = setInterval(() => {
      const elapsed = Date.now() - started
      setAiLoadingProgress(Math.min(94, 6 + (elapsed / 240_000) * 88))
    }, 400)
    return () => {
      clearInterval(rotate)
      clearInterval(progress)
    }
  }, [aiLoading, aiLoadingMessages.length])

  // Client information states
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [loadingLead, setLoadingLead] = useState(false)

  // Project linking states
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)

  // When the builder opens with a pre-determined client context (from a lead,
  // client, project, or an existing quote), the client may already be decided.
  // Captured once on mount because onProjectContextChange rewrites the
  // clientId/projectId params.
  const [hadInitialClientContext] = useState<boolean>(
    () => Boolean(leadId || clientId || projectId || initialData?.client_id)
  )

  // Client matching states
  const [allClients, setAllClients] = useState<Client[]>([])
  const [matchingClients, setMatchingClients] = useState<Client[]>([])
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  // Lock the project/client controls only once an actual client is resolved, so
  // changing the project can't silently swap the client out and break the
  // lead/client -> quote linkage. A quote opened from a clientless project (or a
  // lead with no client record yet) stays editable so the user can still pick or
  // enter a client instead of being stuck.
  const clientContextLocked = hadInitialClientContext && selectedClientId != null

  // Additional details states
  const [notes, setNotes] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [scheduleLines, setScheduleLines] = useState<PaymentScheduleLineInput[]>([])
  // Whether the user has explicitly picked a billing type. Until they do, the
  // Billing select shows a "Select billing" placeholder instead of defaulting
  // to "Single payment" (which is what an empty schedule would otherwise match).
  const [billingChosen, setBillingChosen] = useState(false)

  // Quote creation states
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string; size: number; file?: File; mediaId?: number }[]>([])
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
  const [markupPercentage, setMarkupPercentage] = useState<number>(0) // Always start new quotes at 0%; user can change it later
  const [taxRate, setTaxRate] = useState<number>(8.25) // Default 8.25%, will be updated from profile
  const [laborChargeType, setLaborChargeType] = useState<LaborChargeType>(LaborChargeType.HOURLY) // Default to hourly
  const [percentageDrafts, setPercentageDrafts] = useState<{ markup?: string; tax?: string; labor?: string }>({})
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

  // ── AG-UI Real-Time Shared State Sync ──
  const quoteStateRef = useRef({
    items,
    markupPercentage,
    serviceDescription,
    notes,
    projectTitle,
    taxRate,
  })

  useEffect(() => {
    quoteStateRef.current = {
      items,
      markupPercentage,
      serviceDescription,
      notes,
      projectTitle,
      taxRate,
    }
    agUiState.setEntityState("quote", quoteStateRef.current)
  }, [items, markupPercentage, serviceDescription, notes, projectTitle, taxRate])

  useEffect(() => {
    const unsubscribe = agUiState.subscribe((event) => {
      if (event.entityType && event.entityType !== "quote") return

      try {
        const currentDoc = quoteStateRef.current
        const nextDoc = applyJsonPatch(currentDoc, event.delta) as typeof currentDoc

        if (nextDoc.items !== undefined && Array.isArray(nextDoc.items)) {
          setItems(nextDoc.items)
        }
        if (typeof nextDoc.markupPercentage === "number") {
          setMarkupPercentage(nextDoc.markupPercentage)
        }
        if (typeof nextDoc.serviceDescription === "string") {
          setServiceDescription(nextDoc.serviceDescription)
        }
        if (typeof nextDoc.notes === "string") {
          setNotes(nextDoc.notes)
        }
        if (typeof nextDoc.projectTitle === "string") {
          setProjectTitle(nextDoc.projectTitle)
        }
        if (typeof nextDoc.taxRate === "number") {
          setTaxRate(nextDoc.taxRate)
        }

        toast({
          title: tq("creator.formUpdatedAi"),
          description: event.reason || tq("creator.formUpdatedAiDesc"),
        })
      } catch (err) {
        console.error("Failed to apply state patch in QuoteCreator:", err)
      }
    })

    return () => unsubscribe()
  }, [toast])

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

  // Load projects on mount
  useEffect(() => {
    let cancelled = false
    const loadProjects = async () => {
      try {
        const data = await api.getProjects({ limit: 500 })
        if (!cancelled) {
          setAllProjects(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error("Failed to load projects:", err)
        if (!cancelled) setAllProjects([])
      }
    }
    loadProjects()
    return () => { cancelled = true }
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
          title: tq("creator.templateLoadFailed"),
          description: tq("creator.templateLoadFailedDesc"),
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

  // Apply reviewed context handed off from the "Create Quote from lead" modal.
  // We route here with clientId only (no leadId), so this is the source of the
  // title/scope the user reviewed/AI-enhanced — fetchClientData only touches client
  // fields, so there's no clobber. Runs once on mount; skipped when editing/copying.
  useEffect(() => {
    if (initialData) return
    const prefill = consumeQuotePrefill()
    if (!prefill) return
    if (prefill.title) setProjectTitle(prefill.title)
    if (prefill.description) setServiceDescription(prefill.description)
    if (prefill.projectType) setProjectType(prefill.projectType)
    if (prefill.measurements) setMeasurements(prefill.measurements)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (projectId && !initialData) {
      fetchProjectData()
    }
  }, [projectId, initialData])

  // Load any existing payment schedule when editing a quote.
  useEffect(() => {
    if (!quoteId) return
    const jobId = parseInt(quoteId, 10)
    if (isNaN(jobId)) return
    let cancelled = false
    api.getPaymentSchedule(jobId)
      .then((sched) => {
        if (cancelled) return
        setScheduleLines(
          sched.lines.map((l) => {
            // Any active invoice, including a draft, reserves and locks the draw.
            const locked = l.state === "DRAFT" || l.state === "PAID" || l.state === "INVOICED"
            return {
              id: l.id,
              label: l.label,
              // Coerce legacy triggers (ON_ACCEPTANCE / ON_PHASE) to the two we author.
              trigger_type: normalizeTrigger(l.trigger_type),
              trigger_phase: null,
              trigger_date: l.trigger_date ?? null,
              amount_type: l.amount_type,
              amount_value: l.amount_value,
              order_index: l.order_index,
              locked,
              lockedStatus: locked ? l.state : undefined,
              // The schedule GET reports the invoice amount for billed draws;
              // the preview must freeze it, never re-scale it.
              lockedAmount: locked ? l.computed_amount : undefined,
            }
          }),
        )
        // Existing quote already has a defined billing setup, so show it as chosen.
        setBillingChosen(true)
      })
      .catch((err) => console.error("Failed to load payment schedule:", err))
    return () => {
      cancelled = true
    }
  }, [quoteId])

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
      setSelectedClientId(initialData.client_id || initialData.client?.id || null)

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
        setUploadedImages(
          initialData.project_media.map((media: any) => ({
            url: media.file_url,
            name: media.file_name || "attachment",
            size: media.file_size || 0,
            mediaId: media.id,
          }))
        )
      } else {
        // Clear if no media
        setUploadedImages([])
      }

      // Mark as loaded and ensure loadingMarkup is false for editing
      setHasLoadedInitialData(true)
      setLoadingMarkup(false)

      // Restore project link when editing
      if (initialData.project_id) {
        setSelectedProjectId(initialData.project_id)
        api.getProject(initialData.project_id)
          .then((p: any) => {
            if (p?.brief) setProjectBrief(p.brief)
            if (p?.title) setProjectTitle(p.title)
          })
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
      // New quotes always start at 0% markup (user can change it later), so we don't pull
      // the contractor's default markup here. When editing, markup comes from initialData items.
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
      title: tq("creator.clientSelected"),
      description: tq("creator.usingClient", { name: client.name }),
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

      // Keep an incoming lead description separate until the user has reviewed
      // the AI-refined scope. This also prevents call-summary labels/narration
      // from being persisted when a quote is created directly from a lead.
      if (lead.description) {
        setCallSummarySource(callSummaryToDescription(lead.description))
        setRefinedCallDescription("")
        setServiceDescription("")
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
      setClientName(lead.name || tq("creator.customerFallback", { last4: lead.phone_number?.slice(-4) || "" }))
      setClientEmail(lead.email || "")
      setClientPhone(lead.phone_number || phone || "")
      setClientAddress(lead.location || "")

      // Keep the raw call summary out of the customer-facing quote description.
      // The captured-description panel refines it and lets the user review/use it.
      if (lead.summary_text) {
        setCallSummarySource(callSummaryToDescription(lead.summary_text))
        setRefinedCallDescription("")
        setServiceDescription("")
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

  const fetchProjectData = async () => {
    if (!projectId || isNaN(Number(projectId))) return
    try {
      const data = await api.getProject(parseInt(projectId, 10)) as any
      setSelectedProjectId(data.id)
      setProjectBrief(data?.brief || null)
      setProjectTitle(data?.title || "")

      if (data?.client_id) {
        const client = await api.getClientDetails(data.client_id) as {
          id: number
          name: string
          email: string
          phone?: string
          address?: string
          billing_address?: string
        }
        setSelectedClientId(client.id)
        setClientName(client.name || "")
        setClientEmail(client.email || "")
        setClientPhone(client.phone || "")
        setClientAddress(client.address || client.billing_address || "")
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error)
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
      title: tq("creator.itemAdded"),
      description: tq("creator.itemAddedDesc", { name: material.name || tq("creator.itemFallback") }),
    })
  }

  // Keep project brief in sync with selected project for AI context
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectBrief(null)
      return
    }
    let cancelled = false
    api.getProject(selectedProjectId)
      .then((p: any) => {
        if (cancelled) return
        setProjectBrief(p?.brief || null)
        if (p?.title) setProjectTitle(p.title)
        if (p?.title) setProjectType((prev) => prev || p.title)
        if (p?.objective) setServiceDescription((prev) => prev || p.objective)
        if (p?.client_id && p.client_id !== selectedClientId) {
          setSelectedClientId(p.client_id)
          api.getClientDetails(p.client_id)
            .then((client: any) => {
              if (cancelled) return
              setClientName(client?.name || "")
              setClientEmail(client?.email || "")
              setClientPhone(client?.phone || "")
              setClientAddress(client?.address || client?.billing_address || "")
            })
            .catch(() => {
              if (cancelled) return
            })
        }
      })
      .catch(() => {
        if (cancelled) return
        setProjectBrief(null)
      })
    return () => { cancelled = true }
  }, [selectedProjectId, selectedClientId])

  // Ref to hold clarified scope passed from AgentChatPanel via trigger event
  const clarifiedScopeRef = useRef<ScopeClarifiedScope | null>(null)

  // Sync quote context to window so AgentChatPanel can read it
  useEffect(() => {
    const ctx = {
      clientName: clientName || null,
      projectTitle: projectTitle || null,
      projectType,
      serviceDescription,
      laborRate: laborRateValue,
      laborChargeType,
      projectBrief,
      includeProjectBriefInContext: useBriefAsContext,
      projectId: selectedProjectId ? Number(selectedProjectId) : null,
      clientId: selectedClientId ?? null,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
    }
    ;(window as any).quoteEstimateContext = ctx
    window.dispatchEvent(new CustomEvent("quote-context-updated", { detail: ctx }))
  }, [
    projectType,
    serviceDescription,
    laborRateValue,
    laborChargeType,
    projectBrief,
    useBriefAsContext,
    selectedProjectId,
    selectedClientId,
    clientName,
    clientEmail,
    clientPhone,
    projectTitle,
  ])

  useEffect(() => {
    onProjectContextChange?.({
      projectId: selectedProjectId ?? null,
      clientId: selectedClientId ?? null,
    })
  }, [onProjectContextChange, selectedClientId, selectedProjectId])

  // Listen for trigger from AI panel to run the estimate
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        projectType?: string
        serviceDescription?: string
        laborRate?: number
        laborChargeType?: string
        includeProjectBriefInContext?: boolean
        projectBrief?: any
        clarifiedScope?: ScopeClarifiedScope | null
      }
      if (detail.projectType !== undefined) setProjectType(detail.projectType)
      if (detail.serviceDescription !== undefined) setServiceDescription(detail.serviceDescription)
      if (detail.laborRate !== undefined) setLaborRateValue(detail.laborRate)
      if (detail.includeProjectBriefInContext !== undefined) setUseBriefAsContext(detail.includeProjectBriefInContext)
      if (detail.projectBrief !== undefined) setProjectBrief(detail.projectBrief)
      clarifiedScopeRef.current = detail.clarifiedScope ?? null
      setTimeout(() => {
        const ctx = (window as any).quoteEstimateContext || {}
        const desc = detail.serviceDescription ?? ctx.serviceDescription ?? ""
        if (!desc.trim()) return
        window.dispatchEvent(new CustomEvent("_run-ai-estimate-internal"))
      }, 50)
    }
    window.addEventListener("trigger-ai-estimate", handler)
    return () => window.removeEventListener("trigger-ai-estimate", handler)
  }, [])

  // Internal listener that fires fetchAiEstimate after state has settled
  useEffect(() => {
    const handler = () => { fetchAiEstimate() }
    window.addEventListener("_run-ai-estimate-internal", handler)
    return () => window.removeEventListener("_run-ai-estimate-internal", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDescription, projectType, laborRateValue, laborChargeType, measurements, leadId, clientAddress, useBriefAsContext, projectBrief])

  const fetchAiEstimate = async () => {
    if (!serviceDescription.trim()) {
      toast({
        title: tq("creator.descRequired"),
        description: tq("creator.descRequiredDesc"),
        variant: "destructive",
      })
      return
    }

    setAiLoading(true)
    window.dispatchEvent(new CustomEvent("ai-generation-status", {
      detail: {
        kind: "estimate",
        phase: "running",
        title: tq("creator.genAi"),
        detail: tq("creator.genAiDetail"),
      },
    }))
    try {
      const zipCode = clientAddress ? extractZipCode(clientAddress) : undefined
      // Send measurements if available (either from lead or manually entered)
      // Backend will use lead measurements if lead_id provided and no manual measurements
      const response = await api.generateEstimate({
        description: serviceDescription,
        project_type: projectType || undefined,
        measurements: measurements.items.length > 0 ? measurements : undefined,
        lead_id: leadId ? parseInt(leadId, 10) : undefined,
        project_id: selectedProjectId ?? undefined,
        location_zip_code: zipCode,
        labor_charge_type: laborChargeType,
        labor_rate_value: laborRateValue,
        labor_unit_type: laborUnitType,
        project_brief: useBriefAsContext && projectBrief ? projectBrief : undefined,
        clarified_scope: clarifiedScopeRef.current,
      }) as any

      // Validate response structure to prevent crashes
      if (!response || typeof response !== 'object') {
        throw new Error(tq("creator.invalidResponseRetry"))
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
        title: tq("creator.estGenerated"),
        description: tq("creator.estGeneratedDesc", { count: newItems.length }),
      })
      window.dispatchEvent(new CustomEvent("ai-generation-status", {
        detail: {
          kind: "estimate",
          phase: "succeeded",
          title: tq("creator.estReady"),
          detail: tq("creator.estReadyDetail", { count: newItems.length }),
        },
      }))

      // Auto-save when editing an existing quote so line items are not lost (pass newItems so we save the just-generated items)
      if (quoteId) {
        autoSaveDraft(undefined, newItems).catch(() => { })
      }
    } catch (error: any) {
      console.error("Failed to generate estimate:", error)
      window.dispatchEvent(new CustomEvent("ai-generation-status", {
        detail: {
          kind: "estimate",
          phase: "failed",
          title: tq("creator.estFailed"),
          detail: error?.message || tq("creator.estFailedDesc"),
        },
      }))
      toast({
        title: tq("creator.estFailed"),
        description: error.message || tq("creator.estFailedDesc"),
        variant: "destructive",
      })
    } finally {
      setAiLoading(false)
    }
  }

  const buildJobUpdatePayload = (notesOverride?: string, itemsOverride?: LineItem[]) => {
    const sourceItems = itemsOverride ?? items
    // Ignore only untouched blank rows. Populated invalid rows are sent to the
    // shared API validator instead of disappearing silently during autosave.
    const validItems = sourceItems.filter(hasLineItemIdentity)
    return {
      job_description: serviceDescription.trim() || refinedCallDescription.trim() || null,
      customer_notes: (notesOverride !== undefined ? notesOverride : notes.trim()) || null,
      payment_terms: null,
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
      toast({ title: tq("creator.draftSaved"), description: tq("creator.draftSavedDesc") })
    } catch {
      toast({ title: tq("creator.draftFailed"), description: tq("creator.draftFailedDesc"), variant: "destructive" })
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
    setQuantityDrafts(prev => Object.fromEntries(
      Object.entries(prev).flatMap(([key, value]) => {
        const draftIndex = Number(key)
        return draftIndex === index ? [] : [[draftIndex > index ? draftIndex - 1 : draftIndex, value]]
      })
    ))
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

  const updateQuantityDraft = (index: number, raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setQuantityDrafts(prev => ({ ...prev, [index]: value }))
    const parsed = Number(value)
    if (value !== "." && Number.isFinite(parsed)) updateItem(index, "quantity", parsed)
  }

  const commitQuantity = (index: number) => {
    const value = quantityDrafts[index]
    if (value === undefined) return
    const parsed = Number(value)
    updateItem(index, "quantity", value !== "." && Number.isFinite(parsed) ? parsed : 0)
    setQuantityDrafts(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const updatePercentageDraft = (field: "markup" | "tax" | "labor", raw: string) => {
    const value = sanitizeDecimalInput(raw)
    setPercentageDrafts(prev => ({ ...prev, [field]: value }))
    if (!value || value === ".") return
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    if (field === "markup") setMarkupPercentage(Math.min(100, parsed))
    else if (field === "tax") setTaxRate(Math.min(100, parsed))
    else setLaborRateValue(parsed)
  }

  const commitPercentageDraft = (field: "markup" | "tax" | "labor", raw: string) => {
    const parsed = Number(raw)
    const value = raw && raw !== "." && Number.isFinite(parsed) ? parsed : 0
    if (field === "markup") setMarkupPercentage(Math.min(100, value))
    else if (field === "tax") setTaxRate(Math.min(100, value))
    else setLaborRateValue(value)
    setPercentageDrafts(prev => ({ ...prev, [field]: undefined }))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const validateForm = (): string | null => {
    if (!clientName.trim()) return tq("creator.errClientName")
    if (!clientEmail.trim()) return tq("creator.errClientEmail")
    // Address is now optional - removed validation

    const startedItems = items.filter(hasLineItemInput)
    if (startedItems.length === 0) {
      return tq("creator.errNoItems")
    }
    if (startedItems.some((item) => !isValidChargeItem(item))) {
      return tq("creator.errItemInvalid")
    }
    if (!Number.isFinite(markupPercentage) || markupPercentage < 0 || markupPercentage > 100) {
      return tq("creator.errMarkup")
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

    // Validate payment schedule (draws). An empty schedule = single payment, which is fine.
    if (scheduleLines.length > 0) {
      const editable = scheduleLines.filter((l) => !l.locked)
      if (editable.some((l) => !l.label.trim())) {
        setCreateError(tq("creator.errDrawLabel"))
        return
      }
      if (editable.some((l) => l.trigger_type === "ON_DATE" && !l.trigger_date)) {
        setCreateError(tq("creator.errDrawDate"))
        return
      }
      if (drawsOverContract(scheduleLines, total)) {
        setCreateError(tq("creator.errDrawTotal"))
        return
      }
    }

    setIsCreatingQuote(true)

    try {
      // Filter out empty items
      const validItems = items.filter(hasLineItemIdentity)

      // Prepare job data
      const jobData = {
        lead_id: leadId && !isNaN(Number(leadId)) ? parseInt(leadId, 10) : null,
        project_id: selectedProjectId ?? null,
        client_id: selectedClientId ?? null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null, // Address is optional
        location_zip_code: clientAddress.trim() ? extractZipCode(clientAddress) : null,
        job_description: serviceDescription.trim() || refinedCallDescription.trim() || null,
        customer_notes: notes.trim() || null,
        payment_terms: null,
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
          title: tq("creator.estUpdated"),
          description: tq("creator.estUpdatedDesc"),
        })
      } else {
        // Create new quote
        response = await api.createJob(jobData)
        toast({
          title: tq("creator.estCreated"),
          description: tq("creator.estCreatedDesc"),
        })
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
            title: tq("creator.profileUpdated"),
            description: tq("creator.taxRateUpdated", { rate: taxRate.toFixed(2) }),
          })
        } catch (profileError) {
          // Log error but don't block quote creation
          console.error("Failed to update profile tax rate:", profileError)
        }
      }

      const finalJobId = (response as any)?.id || (quoteId ? parseInt(quoteId, 10) : null)

      // Persist the payment schedule (draws). An empty list clears any prior
      // schedule so the job bills as a single invoice.
      if (finalJobId) {
        try {
          // Only send unbilled draws. The backend preserves already-billed
          // lines; resending them would duplicate them.
          const editableLines = scheduleLines.filter((l) => !l.locked)
          await api.savePaymentSchedule(finalJobId, editableLines)
        } catch (schedErr) {
          console.error("Failed to save payment schedule (quote was still saved):", schedErr)
        }
      }

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
        throw new Error(tq("creator.invalidResponse"))
      }

    } catch (error: any) {
      console.error(`Failed to ${quoteId ? 'update' : 'create'} quote:`, error)
      setCreateError(
        error.message ||
        (quoteId ? tq("creator.saveFailedUpdate") : tq("creator.saveFailedCreate"))
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
          {/* Quote Details */}
          <Card className="p-4 sm:p-5" id="material-search">
            <div className="mb-4 space-y-1">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{tq("creator.detailsTitle")}</h2>
                  {leadId && (
                    <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                      {tq("creator.autoFilled")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tq("creator.detailsHint")}
                </p>
              </div>
            </div>

            <div className="grid items-start gap-5">
              <div className="p-1">
                <div className="mb-4 space-y-1.5">
                  <Label htmlFor="quote-project">{tq("creator.projectLabel")}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={selectedProjectId ? String(selectedProjectId) : "__none__"}
                      onValueChange={(val) => setSelectedProjectId(val === "__none__" ? null : Number(val))}
                      disabled={clientContextLocked}
                    >
                      <SelectTrigger id="quote-project" className={cn(quoteInputSurfaceClass, "min-h-10 flex-1 bg-slate-50/80")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{tq("creator.noProject")}</SelectItem>
                        {allProjects.length > 0 && <div className="my-1 border-t" />}
                        {allProjects.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.title || tq("creator.projectNum", { id: p.id })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 items-center gap-1.5 whitespace-nowrap"
                      onClick={() => setShowNewProjectDialog(true)}
                      disabled={clientContextLocked}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {tq("creator.newProject")}
                    </Button>
                  </div>
                  {clientContextLocked && (
                    <p className="text-xs text-muted-foreground">
                      {tq("creator.projectLocked")}
                    </p>
                  )}
                </div>

                {!selectedClientId && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z" />
                    </svg>
                    <span>
                      {tq("creator.noClient")}
                    </span>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="client-name">{tq("creator.clientNameReq")}</Label>
                      {selectedClientId && (
                        <button
                          onClick={() => {
                            setSelectedClientId(null)
                            toast({
                              title: tq("creator.clientCleared"),
                              description: tq("creator.clientClearedDesc"),
                            })
                          }}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1 shrink-0"
                          title={tq("creator.changeClient")}
                        >
                          <span>{tq("creator.usingExisting")}</span>
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <Input
                      id="client-name"
                      placeholder={tq("creator.phName")}
                      value={clientName}
                      onChange={(e) => handleClientFieldChange('name', e.target.value)}
                      className={quoteInputSurfaceClass}
                      disabled={loadingLead || clientContextLocked}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-email">{tq("creator.emailReq")}</Label>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder={tq("creator.phEmail")}
                      value={clientEmail}
                      onChange={(e) => handleClientFieldChange('email', e.target.value)}
                      className={quoteInputSurfaceClass}
                      disabled={loadingLead || clientContextLocked}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-phone">{tq("creator.phone")}</Label>
                    <Input
                      id="client-phone"
                      type="tel"
                      placeholder={tq("creator.phPhone")}
                      value={clientPhone}
                      onChange={(e) => handleClientFieldChange('phone', e.target.value)}
                      className={quoteInputSurfaceClass}
                      disabled={loadingLead || clientContextLocked}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-address">{tq("creator.address")}</Label>
                    <Input
                      id="client-address"
                      placeholder={tq("creator.phAddress")}
                      value={clientAddress}
                      onChange={(e) => handleClientFieldChange('address', e.target.value)}
                      className={quoteInputSurfaceClass}
                      disabled={loadingLead || clientContextLocked}
                    />
                  </div>
                </div>
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

            {callSummarySource && (
              <div className="mt-5 space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  {tq("creator.incomingScope")}
                </Label>
                <AiCapturedDescription
                  source={callSummarySource}
                  target="quote_description"
                  projectType={projectType || undefined}
                  autoGenerate
                  onUse={setServiceDescription}
                  onCapture={setRefinedCallDescription}
                />
                <p className="text-xs text-muted-foreground">
                  Review the refined scope, then choose “Use as description” before
                  generating the estimate.
                </p>
              </div>
            )}
          </Card>

          <NewProjectDialog
            open={showNewProjectDialog}
            onOpenChange={setShowNewProjectDialog}
            onProjectCreated={async (projectId) => {
              setSelectedProjectId(projectId)
              try {
                const data = await api.getProjects({ limit: 500 })
                setAllProjects(Array.isArray(data) ? data : [])
              } catch {
                // project was created — list refresh is best-effort
              }
            }}
          />

          {/* Material Search */}
          <div className="space-y-3">
            <MaterialSearchWidget
              zipCode={clientAddress ? extractZipCode(clientAddress) : undefined}
              onAddMaterial={(material) => {
                // Reject malformed quantities instead of silently turning 0.5 into 1.
                const quantityText = material.estimated_quantity.trim()
                const quantity = Number(quantityText)
                if (!/^\d+(?:\.\d{1,2})?$/.test(quantityText) || !Number.isFinite(quantity) || quantity <= 0) {
                  toast({ title: tq("creator.invalidQty"), description: tq("creator.invalidQtyDesc", { name: material.name || tq("creator.materialFallback") }), variant: "destructive" })
                  return
                }
                // Add material as new line item with image data and search results
                const materialRate = parseFloat(material.estimated_cost) || 0
                setItems([...items, {
                  description: material.name,
                  quantity,
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
                  title: tq("creator.itemAdded"),
                  description: tq("creator.itemAddedDesc", { name: material.name || tq("creator.itemFallback") }),
                })
              }}
            />
          </div>


          {/* Line Items */}
          <Card className="p-3 sm:p-4 rounded-lg border border-border">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">{tq("creator.lineItems")}</h2>
              <Button onClick={addItem} className="h-10 px-4 text-sm font-medium">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tq("creator.addItem")}
              </Button>
            </div>

            {aiLoading && (
              <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50/80 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                      {tq("creator.genYour")}
                    </div>
                    <p className="mt-1 text-sm text-sky-800/80">
                      {aiLoadingMessages[aiLoadingStage]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
                    {tq("creator.pricingProgress")}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#2563eb)] transition-all duration-500 ease-out"
                    style={{ width: `${aiLoadingProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-sky-800/70">
                  {AI_ESTIMATE_LOADING_HINT}
                </p>
              </div>
            )}

            {/* Table Header - Desktop */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_110px_72px_88px_88px_64px] gap-2 px-2 py-1.5 mb-2 border-b border-border text-left items-center">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tq("creator.colTitleDesc")}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tq("creator.colUnit")}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">{tq("creator.colQty")}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">{tq("creator.colRate")}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">{tq("creator.colTotal")}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">{tq("creator.colTax")}</div>
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
                    {aiLoadingMessages[aiLoadingStage]}
                  </p>
                </div>
              )}

              {!aiLoading && items.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-4 py-7 text-center shadow-inner shadow-slate-200/50">
                  <p className="text-sm font-semibold text-slate-700">{tq("creator.noItems")}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    {tq("creator.noItemsHint")}
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
                    aria-label={tq("creator.removeItem")}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Mobile Layout */}
                  <div className="block sm:hidden space-y-3">
                    {/* Search button row */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{tq("creator.lineItem")}</span>
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
                        {tq("creator.title")}
                      </Label>
                      <Input
                        id={`item-title-mobile-${index}`}
                        value={item.title || ""}
                        onChange={(e) => updateItem(index, "title", e.target.value)}
                        placeholder={tq("creator.itemTitlePh")}
                        className={cn(quoteInputSurfaceClass, "h-10 text-sm")}
                      />
                    </div>
                    {/* Description */}
                    <div>
                      <Label htmlFor={`item-desc-mobile-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        {tq("creator.description")}
                      </Label>
                      <Textarea
                        id={`item-desc-mobile-${index}`}
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder={tq("creator.itemDescPh")}
                        className={cn(quoteTextareaSurfaceClass, "min-h-[44px] resize-none px-3 py-2 text-sm")}
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
                          {tq("creator.colUnit")}
                        </Label>
                        <UnitSelector
                          value={item.unitOfMeasure || ""}
                          onChange={(value) => updateItem(index, "unitOfMeasure", value)}
                          description={item.description}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`item-qty-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          {tq("creator.quantity")}
                        </Label>
                        <Input
                          id={`item-qty-${index}`}
                          type="text"
                          inputMode="decimal"
                          value={quantityDrafts[index] ?? (item.quantity === 0 ? "" : item.quantity.toString())}
                          onChange={(e) => updateQuantityDraft(index, e.target.value)}
                          onBlur={() => commitQuantity(index)}
                          placeholder="0"
                          className={cn(quoteInputSurfaceClass, "h-9 text-center text-sm")}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`item-rate-${index}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          {tq("creator.colRate")}
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
                          className={cn(quoteInputSurfaceClass, "h-9 text-sm")}
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">{tq("creator.colTotal")}</span>
                        <span className="text-sm font-semibold">
                          ${(((item.quantity || 0) * getRateNumber(item.rate)) * (1 + markupPercentage / 100)).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">{tq("creator.applyTax")}</span>
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
                            placeholder={tq("creator.itemNamePh")}
                            className={quoteTextareaSurfaceClass}
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
                                  aria-label={tq("creator.addDescAria")}
                                >
                                  <span className="text-lg leading-none">+</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tq("creator.addDesc")}</p>
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
                            placeholder={tq("creator.itemDescPh2")}
                            className={cn(
                              quoteTextareaSurfaceClass,
                              "min-h-[36px] flex-1 min-w-0 resize-none overflow-hidden px-3 py-2 text-sm hover:border-slate-300"
                            )}
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
                        type="text"
                        inputMode="decimal"
                        value={quantityDrafts[index] ?? (item.quantity === 0 ? "" : item.quantity.toString())}
                        onChange={(e) => updateQuantityDraft(index, e.target.value)}
                        onBlur={() => commitQuantity(index)}
                        placeholder="0"
                        className={cn(quoteInputSurfaceClass, "h-9 text-center text-sm")}
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
                        className={cn(quoteInputSurfaceClass, "h-9 w-full min-w-0 text-right text-sm tabular-nums")}
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
                    {tq("creator.markupPct")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tq("creator.markupHint")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="markup-percentage"
                    type="text"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percentageDrafts.markup ?? markupPercentage.toString()}
                    onChange={(e) => updatePercentageDraft("markup", e.target.value)}
                    onBlur={(e) => commitPercentageDraft("markup", e.target.value)}
                    placeholder="0"
                    className={cn(quoteInputSurfaceClass, "w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
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
                    {tq("creator.taxRate")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tq("creator.taxHint")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="tax-rate"
                    type="text"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    value={percentageDrafts.tax ?? taxRate.toString()}
                    onChange={(e) => updatePercentageDraft("tax", e.target.value)}
                    onBlur={(e) => commitPercentageDraft("tax", e.target.value)}
                    placeholder="0.00"
                    className={cn(quoteInputSurfaceClass, "w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
                    disabled={loadingMarkup}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="mt-5 rounded-xl border border-slate-200/90 bg-slate-50/90 p-4 shadow-inner shadow-slate-200/60">
              <div className="space-y-2 sm:ml-auto sm:max-w-md">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tq("creator.subBefore")}</span>
                  <span className="font-medium">${baseSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup ({markupPercentage}%)</span>
                  <span className="font-medium text-primary">+${markupAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-medium text-muted-foreground">{tq("creator.subAfter")}</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate.toFixed(2)}%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                  <span>{tq("creator.colTotal")}</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Billing & Payment Schedule */}
          <Card className="border-primary/30 bg-primary/[0.03] p-4 shadow-sm">
            <BillingSection
              total={total}
              lines={scheduleLines}
              onLinesChange={setScheduleLines}
              billingChosen={billingChosen}
              onBillingChosenChange={setBillingChosen}
            />
          </Card>

          {/* Additional Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{tq("creator.additional")}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex gap-2 items-center text-muted-foreground hover:text-foreground"
                onClick={openCloudinaryWidget}
                disabled={uploadingImage}
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                <span className="text-xs font-medium">{tq("creator.addAttachment")}</span>
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
                {uploadedImages.map((img, i) => {
                  const isBefore = Boolean(img.name && (/^before-photo/i.test(img.name) || /^before-\d+/i.test(img.name)))
                  const isAfter = Boolean(img.name && /^ai-after-render/i.test(img.name))
                  return (
                    <div key={i} className="relative w-24 h-24 border rounded-md overflow-hidden bg-white shadow-sm group">
                      <img src={img.url} alt={tq("creator.attachment")} className="object-cover w-full h-full" />
                      {isBefore && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white pointer-events-none">
                          {tq("creator.before")}
                        </span>
                      )}
                      {isAfter && (
                        <span className="absolute bottom-1 left-1 rounded bg-emerald-700/85 px-1.5 py-0.5 text-[9px] font-semibold text-white pointer-events-none">
                          {tq("creator.after")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const item = uploadedImages[i]
                          if (item.mediaId && quoteId) {
                            try {
                              await api.deleteJobMedia(parseInt(quoteId), item.mediaId)
                            } catch (err) {
                              console.error("Failed to delete attachment:", err)
                            }
                          }
                          setUploadedImages((prev) => prev.filter((_, idx) => idx !== i))
                        }}
                        className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title={tq("creator.deleteImage")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">{tq("creator.notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={tq("creator.notesPh")}
                  className={cn(quoteTextareaSurfaceClass, "min-h-[100px]")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="due-date">{tq("creator.validUntil")}</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={quoteInputSurfaceClass}
                />
              </div>
            </div>
          </Card>

          <div className="border-t border-border/70 pt-4">
            <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{tq("creator.measurements")}</h2>
                <p className="text-sm text-muted-foreground">
                  {tq("creator.measHint")}
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
                <span className="font-medium">{tq("creator.errorLabel")}</span>
                <span>{createError}</span>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 z-30 -mx-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-14px_40px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:gap-3 sm:px-6 sm:py-3 sm:pb-3">
            <Button
              size="lg"
              onClick={handleCreateQuote}
              disabled={isCreatingQuote}
              className="flex-1 text-sm shadow-sm max-sm:min-w-0 sm:flex-none sm:text-base"
            >
              {isCreatingQuote ? (
                <>
                  <svg className="mr-2 h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {quoteId ? tq("creator.updating") : tq("creator.creating")}
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
                  {quoteId ? tq("creator.updateBtn") : tq("creator.saveBtn")}
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
                  {tq("creator.previewBtn")}
                </a>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild className="text-sm sm:text-base">
              <a href={quoteId ? `/quotes/${quoteId}` : "/quotes"}>{tq("creator.cancel")}</a>
            </Button>
          </div>
        </div>

      </div>

      {/* Substitute Modal */}
      {showSubstitute && substituteItemIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{tq("creator.chooseSub")}</h3>
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
                      {tq("creator.selectBtn")}
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
