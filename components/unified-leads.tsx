"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api, contractorAI } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"
import type { Measurements } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import { useTranslations, useLocale } from "next-intl"
import { Search, Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Send, AlertCircle, Languages, Loader2, RotateCcw, Menu, Bot, Inbox, Filter, ArrowUpDown, Link2, Sparkles, Plus, Eye, FolderOpen, FileText, User as UserIcon } from "lucide-react"
import { PropertyInsightsCard } from "@/components/property-insights-card"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { SaveClientFromLeadDialog, type SaveClientAction } from "@/components/clients/save-client-from-lead-dialog"

// ============================================
// Translation Cache Utilities (localStorage)
// ============================================
const TRANSLATION_CACHE_KEY = 'contractor_translations_cache'
const CACHE_EXPIRY_DAYS = 7

interface TranslationCacheEntry {
  translation: string
  timestamp: number
}

interface TranslationCache {
  [key: string]: TranslationCacheEntry
}

// Generate a cache key from the original text
const generateCacheKey = (text: string, targetLang: string): string => {
  // Use a hash of the text + target language
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0
  }, 0)
  return `${targetLang}_${hash}_${text.length}`
}

// Get translation from cache
const getCachedTranslation = (text: string, targetLang: string): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
    if (!cacheStr) return null

    const cache: TranslationCache = JSON.parse(cacheStr)
    const key = generateCacheKey(text, targetLang)
    const entry = cache[key]

    if (!entry) return null

    // Check if cache entry is expired
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (Date.now() - entry.timestamp > expiryTime) {
      // Remove expired entry
      delete cache[key]
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
      return null
    }

    return entry.translation
  } catch (error) {
    console.error('Error reading translation cache:', error)
    return null
  }
}

// Save translation to cache
const setCachedTranslation = (text: string, targetLang: string, translation: string): void => {
  if (typeof window === 'undefined') return

  try {
    const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
    const cache: TranslationCache = cacheStr ? JSON.parse(cacheStr) : {}

    const key = generateCacheKey(text, targetLang)
    cache[key] = {
      translation,
      timestamp: Date.now()
    }

    // Limit cache size (keep last 500 entries)
    const keys = Object.keys(cache)
    if (keys.length > 500) {
      // Sort by timestamp and remove oldest
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      sorted.slice(0, keys.length - 500).forEach(k => delete cache[k])
    }

    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving to translation cache:', error)
  }
}

// Translate text with caching
const translateWithCache = async (
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> => {
  // Check cache first
  const cached = getCachedTranslation(text, targetLang)
  if (cached) {
    console.log('🔄 Using cached translation')
    return cached
  }

  // Call API
  const response = await api.translateText(text, targetLang, sourceLang)

  // Cache the result
  setCachedTranslation(text, targetLang, response.translated_text)

  return response.translated_text
}

// Format transcript translation - replace speaker names
const formatTranscriptTranslation = (translatedText: string): string => {
  return translatedText
    .replace(/\bContractor\b/gi, 'Contratista')
    .replace(/\bCustomer\b/gi, 'Cliente')
    .replace(/\bClient\b/gi, 'Cliente')
}

// Utility function to normalize phone numbers to E.164 format (+1XXXXXXXXXX)
const normalizePhoneToE164 = (phone: string | undefined | null): string => {
  if (!phone) return ''

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Handle US numbers - convert to +1XXXXXXXXXX format
  if (digits.length === 10) {
    // 10 digits: assume US number, add +1
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: US number with country code
    return `+${digits}`
  } else if (phone.startsWith('+')) {
    // Already in E.164 format
    return phone
  }

  // Return original if can't normalize (shouldn't happen for US numbers)
  return phone
}

// Unified lead interface that combines both systems
interface UnifiedLead {
  id: string
  name: string
  type: 'request' | 'call'  // Source type
  status: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'

  // Contact info
  email?: string
  phone?: string
  address?: string
  address_data?: { id: number } | null

  // Project details
  project_type?: string
  service_type?: string
  description?: string
  estimated_value?: number

  // Conversion tracking
  converted_to_job_id?: number
  converted_to_client_id?: number
  converted_to_project_id?: number
  quote_public_link?: string | null
  quote_public_url?: string | null

  // Timestamps
  created_at: string
  last_contact_date?: string
  last_message_at?: string // Most recent message timestamp from conversation

  // Call-specific data
  conversation_count?: number
  last_message_preview?: string
  transcript_text?: string
  formatted_transcript_text?: string
  summary_text?: string
  summary_confirmed?: boolean
  appointment_link_sent?: boolean
  media_uploaded?: boolean
  _needsFullLoad?: boolean // Internal flag for lazy loading

  // Request-specific data
  attachments?: Array<{ id: number }>
  measurements?: Measurements

  // Consolidation tracking
  contractor_ai_call_lead_id?: number // Reference to consolidated call lead in contractor-ai
  interaction_id?: string
  interaction_type?: 'phone_call' | 'frontline_voice' | string
  is_frontline_ai?: boolean
  _needsCallDataLoad?: boolean // Internal flag to load call data for consolidated leads

  source?: string
}

interface SummaryFact {
  label: string
  value: string
}

const SUMMARY_FACT_LABELS = ['Service', 'Scope', 'Location', 'Next step'] as const

const sentenceCase = (value: string): string => {
  const clean = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return clean
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

const inferServiceLabel = (lead: UnifiedLead, text: string): string => {
  const explicit = lead.service_type || lead.project_type
  if (explicit) return sentenceCase(explicit)

  const lower = text.toLowerCase()
  const matches: Array<[string, string]> = [
    ['garden bed', 'Landscaping - Garden bed'],
    ['landscap', 'Landscaping'],
    ['hardscape', 'Hardscaping'],
    ['patio', 'Patio work'],
    ['retaining wall', 'Retaining wall'],
    ['irrigation', 'Irrigation'],
    ['lawn', 'Lawn care'],
    ['kitchen', 'Kitchen renovation'],
    ['bathroom', 'Bathroom renovation'],
    ['floor', 'Flooring'],
    ['paint', 'Painting'],
  ]

  return matches.find(([needle]) => lower.includes(needle))?.[1] || 'General inquiry'
}

const inferScopeLabel = (lead: UnifiedLead, text: string): string => {
  const measurement = lead.measurements?.items?.[0]
  if (measurement) {
    if (measurement.type === 'dimensions' && measurement.length && measurement.width) {
      return `${measurement.length} x ${measurement.width} ${measurement.unit || 'ft'}`
    }
    if (measurement.value) {
      return `${measurement.value} ${measurement.unit || (measurement.type === 'square_footage' ? 'sq ft' : 'ft')}`
    }
    if (measurement.name || measurement.label) {
      return measurement.name || measurement.label || 'Measurement provided'
    }
  }

  const normalized = text.replace(/\s+/g, ' ')
  const quantityMatch = normalized.match(/\b(?:around|about|approximately|roughly|~)?\s*(\d[\d,]*(?:\.\d+)?(?:\s*-\s*\d[\d,]*(?:\.\d+)?)?\s*(?:sq\.?\s*ft|square\s*(?:feet|foot)|linear\s*ft|feet|ft|beds?|rooms?))\b/i)
  if (quantityMatch?.[1]) return quantityMatch[1].replace(/\s+/g, ' ')

  const scopeMatch = normalized.match(/\b(?:for|regarding|about|requesting|needs?)\s+([^.!?]{8,80})/i)
  if (scopeMatch?.[1]) return sentenceCase(scopeMatch[1].replace(/\b(work|project|done)\b\.?$/i, '').trim())

  return 'Needs clarification'
}

const inferLocationLabel = (lead: UnifiedLead, text: string): string => {
  if (lead.address) return lead.address

  const normalized = text.replace(/\s+/g, ' ')
  const streetMatch = normalized.match(/\b\d{2,6}\s+[A-Za-z0-9 .'-]+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|way|boulevard|blvd\.?)\b(?:,\s*[A-Za-z .'-]+)?/i)
  if (streetMatch?.[0]) return sentenceCase(streetMatch[0])

  const placeMatch = normalized.match(/\b(?:from|in|near|around|at)\s+([^.!?]{4,70}?)(?:\s+(?:regarding|requesting|for|about)|[.!?]|$)/i)
  if (placeMatch?.[1]) return sentenceCase(placeMatch[1].replace(/\b(the|a)\s+caller\b/i, '').trim())

  return 'No address on file'
}

const inferNextStepLabel = (text: string): string => {
  const lower = text.toLowerCase()
  if ((lower.includes('quote link') || lower.includes('quote request')) && (lower.includes('photo') || lower.includes('upload'))) {
    return 'Awaiting photos via quote link'
  }
  if (lower.includes('quote link') || lower.includes('quote request') || lower.includes('estimate')) {
    return 'Prepare quote follow-up'
  }
  if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment')) {
    return 'Schedule consultation'
  }
  if (lower.includes('owner') || lower.includes('escalat') || lower.includes('call back')) {
    return 'Owner follow-up'
  }
  return 'Review and follow up'
}

const buildSummaryFacts = (lead: UnifiedLead, summaryText: string): SummaryFact[] => {
  const contextText = [
    summaryText,
    lead.description,
    lead.project_type,
    lead.service_type,
    lead.address,
  ].filter(Boolean).join(' ')

  return [
    { label: SUMMARY_FACT_LABELS[0], value: inferServiceLabel(lead, contextText) },
    { label: SUMMARY_FACT_LABELS[1], value: inferScopeLabel(lead, contextText) },
    { label: SUMMARY_FACT_LABELS[2], value: inferLocationLabel(lead, contextText) },
    { label: SUMMARY_FACT_LABELS[3], value: inferNextStepLabel(contextText) },
  ]
}

const formatBrowserPhoneTime = (): string => {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export function UnifiedLeads() {
  const { user, getContractorAISpId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const t = useTranslations('search')
  const tFilters = useTranslations('filters')
  const tLeads = useTranslations('leads')
  const tCommon = useTranslations('common')

  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<UnifiedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCallLeads, setLoadingCallLeads] = useState(false)
  const [error, setError] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [hasUserClearedSelection, setHasUserClearedSelection] = useState(false)
  const [leadDetailsCache, setLeadDetailsCache] = useState<Map<string, UnifiedLead>>(new Map())

  // Filters - Initialize from URL params
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'calls'>('all')
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<'date-new' | 'date-old' | 'name-az' | 'name-za'>('date-new')

  // Initialize from URL parameters
  useEffect(() => {
    const tab = searchParams.get('tab')
    const leadId = searchParams.get('leadId')

    if (tab && ['all', 'requests', 'calls'].includes(tab)) {
      setActiveTab(tab as 'all' | 'requests' | 'calls')
    }

    if (leadId) {
      setSelectedLeadId(`call-${leadId}`) // Assume call lead from old dashboard
    }
  }, [searchParams])

  // Auto-select first lead if none selected and we have leads (only on desktop, not mobile)
  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0 && !loading && !isMobile && !hasUserClearedSelection) {
      setSelectedLeadId(filteredLeads[0].id)
    }
  }, [selectedLeadId, filteredLeads, loading, isMobile, hasUserClearedSelection])

  useEffect(() => {
    // Only fetch leads if user has a contractor profile
    // This prevents errors when user hasn't created profile yet
    if (user?.contractor_profile) {
      fetchAllLeads()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    filterLeads()
  }, [leads, activeTab, statusFilter, searchTerm, sortBy])

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') {
      params.set('tab', activeTab)
    }
    const newUrl = params.toString() ? `?${params}` : '/leads'
    router.replace(newUrl, { scroll: false })
  }, [activeTab, router])

  const fetchAllLeads = async () => {
    try {
      setLoading(true)
      setError("")

      // Load all leads from the new unified endpoint
      const response = await api.getUnifiedLeads('all')

      // Map backend response to the frontend UnifiedLead interface
      const mappedLeads: UnifiedLead[] = (response.leads || []).map((lead: any) => {
        const isCallOnly = lead.consolidation_status === 'call_only'
        const isBoth = lead.consolidation_status === 'both'
        const isFrontlineVoice = lead.is_frontline_ai || lead.source === 'FRONTLINE_VOICE' || lead.interaction_type === 'frontline_voice'
        const callInteractionId = lead.interaction_id || lead.contractor_ai_customer_id

        return {
          id: isCallOnly ? `call-${callInteractionId}` : `request-${lead.id}`,
          name: lead.name || (isCallOnly ? `Customer ${lead.phone?.slice(-4)}` : "Unknown"),
          type: isCallOnly ? 'call' : 'request',
          status: lead.status,
          priority: lead.priority,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          project_type: lead.project_type,
          service_type: lead.call_data?.service_type || lead.project_type,
          description: lead.description,
          transcript_text: lead.call_data?.transcript_text,
          formatted_transcript_text: lead.call_data?.formatted_transcript_text,
          summary_text: lead.call_data?.summary_text || lead.description,
          last_message_preview: lead.call_data?.last_message_preview,
          created_at: lead.created_at,
          last_contact_date: lead.last_contact_date || lead.created_at,
          contractor_ai_call_lead_id: lead.contractor_ai_customer_id,
          converted_to_job_id: lead.converted_to_job_id,
          converted_to_client_id: lead.converted_to_client_id,
          converted_to_project_id: lead.converted_to_project_id,
          quote_public_link: lead.quote_public_link,
          quote_public_url: lead.quote_public_url,
          interaction_id: callInteractionId,
          interaction_type: lead.interaction_type,
          is_frontline_ai: isFrontlineVoice,
          source: lead.source,
          // Enrichment flags
          _needsCallDataLoad: isBoth || isCallOnly,
          _needsFullLoad: isCallOnly && !isFrontlineVoice // Frontline calls arrive with transcript/summary data already
        }
      })

      setLeads(mappedLeads)
      setLoading(false)
      setLoadingCallLeads(false)
    } catch (err: any) {
      console.error('Failed to fetch leads:', err)
      setError(err.message || "Failed to load leads")
      setLoading(false)
      setLoadingCallLeads(false)
    }
  }



  // Load full lead details (with transcripts) when needed
  const loadFullLeadDetails = useCallback(async (leadId: string): Promise<UnifiedLead | null> => {
    // Check cache first
    if (leadDetailsCache.has(leadId)) {
      return leadDetailsCache.get(leadId)!
    }

    // Check if this is a consolidated lead (request lead with call data)
    const currentLead = leads.find(l => l.id === leadId)

    // If it's a request lead
    if (currentLead?.type === 'request') {
      // Check if it's a consolidated lead (has contractor_ai_call_lead_id)
      if ((currentLead as any).contractor_ai_call_lead_id) {
        // This is a consolidated lead - fetch call data from contractor-ai
        const callLeadId = (currentLead as any).contractor_ai_call_lead_id
        // Ensure we have a valid numeric ID
        if (!callLeadId || isNaN(Number(callLeadId))) {
          console.error('Invalid contractor_ai_call_lead_id:', callLeadId)
          return currentLead
        }
        try {
          const response = await contractorAI.getLead(String(callLeadId))
          const callLead = response as any

          // Merge request lead data with call lead data
          // Keep BOTH: description from quote request AND summary_text from call lead
          // IMPORTANT: description = quote request form data, summary_text = call lead AI summary
          const fullLead: UnifiedLead = {
            ...currentLead,
            // Add call interaction data from contractor-ai
            transcript_text: callLead.transcript_text,
            formatted_transcript_text: callLead.formatted_transcript_text,
            summary_text: callLead.summary_text, // AI summary from call - DO NOT mix with description
            // Keep description ONLY from quote request (project description from form)
            // Do NOT use call lead summary_text as fallback - they are separate pieces of information
            description: currentLead.description, // Quote request description stays separate
            conversation_count: callLead.conversation_count || 0,
            last_message_preview: callLead.last_message_preview,
            summary_confirmed: callLead.summary_confirmed,
            appointment_link_sent: callLead.appointment_link_sent,
            media_uploaded: callLead.media_uploaded,
            // Use call lead's service_type if available, otherwise keep request lead's project_type
            service_type: callLead.service_type || currentLead.project_type,
            // Preserve email and address from quote request (more complete than call lead)
            // But also merge in any missing data from call lead
            email: currentLead.email || callLead.email,
            address: currentLead.address || callLead.location || callLead.address,
            // Preserve name from quote request (more accurate) but fallback to call lead
            name: currentLead.name || callLead.name || currentLead.name
          }

          // Cache the full lead details
          setLeadDetailsCache(prev => new Map(prev).set(leadId, fullLead))

          // Update the lead in the leads array
          setLeads(prev => prev.map(l => l.id === leadId ? fullLead : l))

          return fullLead
        } catch (error: any) {
          console.error('Failed to fetch call data for consolidated lead:', error)
          // If it's a network error, log it but don't break the UI
          if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
            console.warn('Contractor-ai API is not available. Showing lead without call data.')
          }
          // Return the current lead without call data - it will still work, just without transcript/summary
          return currentLead
        }
      } else {
        // Regular request lead (not consolidated) - no need to fetch from contractor-ai
        return currentLead
      }
    }

    // Only fetch from contractor-ai if it's a call lead
    if (currentLead?.type !== 'call') {
      // Unknown lead type or not found - return as is
      return currentLead || null
    }

    if (currentLead.is_frontline_ai) {
      setLeadDetailsCache(prev => new Map(prev).set(leadId, currentLead))
      return currentLead
    }

    // Extract the numeric ID from the lead ID (e.g., "call-123" -> "123")
    const numericId = leadId.replace('call-', '')

    // Validate that we have a numeric ID
    if (!numericId || isNaN(Number(numericId))) {
      console.error('Invalid call lead ID:', leadId)
      return currentLead || null
    }

    try {
      const response = await contractorAI.getLead(numericId)
      const lead = response as any

      // Spread currentLead first so backend-enriched fields (converted_to_client_id,
      // converted_to_job_id, converted_to_project_id, email, and any saved-client
      // name/address overrides) are preserved across the contractor-ai merge.
      const fullLead: UnifiedLead = {
        ...(currentLead as UnifiedLead),
        id: `call-${lead.id}`,
        name: currentLead?.name || lead.name || `Customer ${lead.phone_number?.slice(-4)}`,
        type: 'call' as const,
        status: normalizeCallStatus(lead.status),
        priority: lead.priority,
        phone: lead.phone_number,
        service_type: lead.service_type,
        description: lead.summary_text,
        created_at: lead.last_contact_date,
        last_contact_date: lead.last_contact_date,
        conversation_count: lead.conversation_count || 0,
        last_message_preview: lead.last_message_preview,
        transcript_text: lead.transcript_text,
        formatted_transcript_text: lead.formatted_transcript_text,
        summary_text: lead.summary_text,
        summary_confirmed: lead.summary_confirmed,
        appointment_link_sent: lead.appointment_link_sent,
        media_uploaded: lead.media_uploaded,
        address: currentLead?.address || lead.location,
      }

      // Cache the full lead details
      setLeadDetailsCache(prev => new Map(prev).set(leadId, fullLead))

      // Update the lead in the leads array
      setLeads(prev => prev.map(l => l.id === leadId ? fullLead : l))

      return fullLead
    } catch (error) {
      console.error('Failed to load full lead details:', error)
      return null
    }
  }, [leads, leadDetailsCache, contractorAI])

  // Normalize call statuses to match request statuses
  const normalizeCallStatus = (callStatus: string): string => {
    const statusMap: Record<string, string> = {
      'new': 'NEW',
      'active': 'CONTACTED',
      'completed': 'CONVERTED',
      'closed': 'CONVERTED',
      'lost': 'LOST'
    }
    return statusMap[callStatus] || callStatus.toUpperCase()
  }

  // Get the most recent activity timestamp for a lead
  const getMostRecentActivity = (lead: UnifiedLead): Date => {
    // Priority: last_message_at > last_contact_date > created_at
    const timestamps = [
      lead.last_message_at,
      lead.last_contact_date,
      lead.created_at
    ].filter(Boolean) as string[]

    if (timestamps.length === 0) {
      return new Date(0) // Fallback to epoch if no timestamps
    }

    // Return the most recent timestamp
    return new Date(Math.max(...timestamps.map(ts => new Date(ts).getTime())))
  }

  const filterLeads = () => {
    let filtered = leads

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(lead => lead.type === activeTab.slice(0, -1) as 'request' | 'call')
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.project_type?.toLowerCase().includes(searchLower) ||
        lead.service_type?.toLowerCase().includes(searchLower) ||
        lead.address?.toLowerCase().includes(searchLower)
      )
    }

    // Sort leads
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-new':
          // Sort by most recent activity (last message, last contact, or created date)
          const aActivity = getMostRecentActivity(a)
          const bActivity = getMostRecentActivity(b)
          return bActivity.getTime() - aActivity.getTime()
        case 'date-old':
          const aActivityOld = getMostRecentActivity(a)
          const bActivityOld = getMostRecentActivity(b)
          return aActivityOld.getTime() - bActivityOld.getTime()
        case 'name-az':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        case 'name-za':
          return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' })
        default:
          return 0
      }
    })

    setFilteredLeads(filtered)
  }

  const getCounts = () => {
    return {
      all: leads.length,
      requests: leads.filter(l => l.type === 'request').length,
      calls: leads.filter(l => l.type === 'call').length,
      new: leads.filter(l => l.status === 'NEW').length,
      contacted: leads.filter(l => l.status === 'CONTACTED').length,
      quoted: leads.filter(l => l.status === 'QUOTED').length,
      converted: leads.filter(l => l.status === 'CONVERTED').length,
      lost: leads.filter(l => l.status === 'LOST').length,
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/15 text-blue-600"
      case "CONTACTED":
        return "bg-amber-500/15 text-amber-600"
      case "QUOTED":
        return "bg-purple-500/15 text-purple-600"
      case "CONVERTED":
        return "bg-emerald-500/15 text-emerald-600"
      case "LOST":
        return "bg-red-500/15 text-red-600"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return "1 day ago"
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const getQuoteRequestWarning = (lead: UnifiedLead) => {
    // Show warning if quote request hasn't been sent
    // A quote has been sent if status is QUOTED or if there's a converted_to_job_id
    const hasQuoteBeenSent = lead.status === 'QUOTED' || lead.converted_to_job_id

    if (!hasQuoteBeenSent) {
      return (
        <div title="Quote request hasn't been sent">
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-500 shrink-0" />
        </div>
      )
    }

    return null
  }


  const [selectedLead, setSelectedLead] = useState<UnifiedLead | undefined>(undefined)
  const [loadingFullLeadDetails, setLoadingFullLeadDetails] = useState(false)

  // Load full lead details when a lead is selected
  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find(l => l.id === selectedLeadId)
      if (lead) {
        // If it's a call lead and needs full details, load them
        if (lead.type === 'call' && (lead as any)._needsFullLoad) {
          setLoadingFullLeadDetails(true)
          loadFullLeadDetails(selectedLeadId).then(fullLead => {
            if (fullLead) {
              setSelectedLead(fullLead)
            } else {
              setSelectedLead(lead)
            }
            setLoadingFullLeadDetails(false)
          })
        }
        // If it's a consolidated lead (request lead with call data), always load call data
        // This ensures we show both quote request info AND call lead info (transcripts, summary, etc.)
        else if (lead.type === 'request' && (lead as any).contractor_ai_call_lead_id) {
          setLoadingFullLeadDetails(true)
          loadFullLeadDetails(selectedLeadId).then(fullLead => {
            if (fullLead) {
              setSelectedLead(fullLead)
            } else {
              // If loading failed, still show the lead (it will have quote request data)
              setSelectedLead(lead)
            }
            setLoadingFullLeadDetails(false)
          })
        }
        else {
          setSelectedLead(lead)
        }
      } else {
        setSelectedLead(undefined)
      }
    } else {
      setSelectedLead(undefined)
    }
  }, [selectedLeadId, leads, loadFullLeadDetails])

  // Debug selected lead transcript
  useEffect(() => {
    if (selectedLead?.type === 'call') {
      console.log('🎯 Selected call lead transcript info:', {
        leadId: selectedLead.id,
        name: selectedLead.name,
        hasTranscript: !!(selectedLead.formatted_transcript_text || selectedLead.transcript_text),
        transcriptLength: (selectedLead.formatted_transcript_text || selectedLead.transcript_text)?.length || 0,
        hasFormattedTranscript: !!selectedLead.formatted_transcript_text,
        hasSummary: !!selectedLead.summary_text,
        summaryLength: selectedLead.summary_text?.length || 0
      })
    }
  }, [selectedLead])

  const counts = getCounts()

  const getLeadSourceLabel = (lead: UnifiedLead) => {
    if (lead.is_frontline_ai) return 'Frontline'
    return lead.type === 'call' ? 'Call' : 'Request'
  }

  const renderLeadRow = (lead: UnifiedLead) => {
    const active = selectedLeadId === lead.id
    const sourceLabel = getLeadSourceLabel(lead)
    const initial = (lead.name || 'C').charAt(0).toUpperCase()

    return (
      <button
        key={lead.id}
        type="button"
        onClick={() => {
          setSelectedLeadId(lead.id)
          setHasUserClearedSelection(false)
        }}
        className={`group relative w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
          active
            ? 'border-primary/30 bg-background shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)]'
            : 'border-transparent hover:border-border hover:bg-background/75'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <div className="flex items-start gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-semibold transition-colors ${
              active
                ? 'border-primary/40 bg-primary text-primary-foreground'
                : lead.is_frontline_ai
                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'
                  : 'border-border bg-secondary text-secondary-foreground'
            }`}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {lead.name}
                {getQuoteRequestWarning(lead) && (
                  <span className="ml-1.5 inline-block align-text-bottom">{getQuoteRequestWarning(lead)}</span>
                )}
              </h3>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatTime(lead.created_at)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {lead.project_type || lead.service_type || "General inquiry"}
              {lead.phone ? ` · ${formatPhoneForDisplay(lead.phone)}` : ''}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(lead.status)} border-current/20`}>
                <span className="h-1 w-1 rounded-full bg-current" />
                {lead.status}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                lead.is_frontline_ai
                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'
                  : 'border-border bg-background text-muted-foreground'
              }`}>
                {lead.is_frontline_ai ? <Bot className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  // Show full-screen loading only on initial load (when we have no leads yet)
  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="relative">
          {/* Abstract spinning circles */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-blue-50"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-blue-600 text-center animate-pulse">Loading request leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-muted/20 flex flex-col overflow-hidden pb-16 md:pb-0">
      <main className="flex-1 h-full overflow-hidden min-h-0 p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-0 h-full">
          {/* Left Panel - Leads List */}
          <div className={`${selectedLead ? 'hidden lg:block' : 'block'} h-full min-h-0`}>
            <Card className="h-full flex flex-col overflow-hidden rounded-none border-x-0 border-t-0 md:border-y-0 md:border-r md:border-l-0 shadow-none bg-muted/35">
              {/* Search and Sort */}
              <div className="px-3 py-3 md:p-4 border-b flex-shrink-0 space-y-3 bg-background/80 backdrop-blur shadow-sm md:shadow-none z-10 sticky top-0">
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Inbox className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Inbox</p>
                      <p className="text-[11px] text-muted-foreground">{counts.all} active leads</p>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-[10px] h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('searchLeads')}
                      className="pl-10 h-10 text-[15px] md:text-sm bg-muted/60 md:bg-background border-transparent md:border-border rounded-[14px] md:rounded-xl focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:ring-offset-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {/* Mobile Sort Icon */}
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="md:hidden flex-shrink-0 w-10 h-10 rounded-[14px] bg-muted/60 border-transparent justify-center items-center p-0 [&>svg]:hidden shadow-none focus-visible:ring-1">
                      <span className="text-lg">↕️</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-new">📅 {tFilters('newestFirst')}</SelectItem>
                      <SelectItem value="date-old">📅 {tFilters('oldestFirst')}</SelectItem>
                      <SelectItem value="name-az">🔤 {tFilters('nameAZ')}</SelectItem>
                      <SelectItem value="name-za">🔤 {tFilters('nameZA')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile Segmented Control styles */}
                <div className="md:hidden flex bg-muted/40 p-1.5 rounded-xl w-full">
                  <button
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    {tFilters('all')}
                    <span className={`text-[10px] px-1.5 font-bold rounded-full ${activeTab === 'all' ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'}`}>{counts.all}</span>
                  </button>
                  <button
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'requests' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('requests')}
                  >
                    {tFilters('requests')}
                    <span className={`text-[10px] px-1.5 font-bold rounded-full ${activeTab === 'requests' ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'}`}>{counts.requests}</span>
                  </button>
                  <button
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'calls' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('calls')}
                  >
                    {tFilters('calls')}
                    <span className={`text-[10px] px-1.5 font-bold rounded-full ${activeTab === 'calls' ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'}`}>{counts.calls}</span>
                  </button>
                </div>

                {/* Desktop Selects */}
                <div className="hidden md:flex gap-1.5">
                  <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'requests' | 'calls')}>
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-0 bg-background rounded-lg">
                      <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue className="truncate">
                        {activeTab === 'all' ? `${tFilters('all')} ${counts.all}` :
                          activeTab === 'requests' ? `${tFilters('requests')} ${counts.requests}` :
                            `${tFilters('calls')} ${counts.calls}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tFilters('all')} {counts.all}</SelectItem>
                      <SelectItem value="requests">{tFilters('requests')} {counts.requests}</SelectItem>
                      <SelectItem value="calls">{tFilters('calls')} {counts.calls}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-0 bg-background rounded-lg">
                      <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue className="truncate">
                        {sortBy === 'date-new' ? tFilters('newest') :
                          sortBy === 'date-old' ? tFilters('oldest') :
                            sortBy === 'name-az' ? 'A-Z' :
                              'Z-A'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-new">{tFilters('newestFirst')}</SelectItem>
                      <SelectItem value="date-old">{tFilters('oldestFirst')}</SelectItem>
                      <SelectItem value="name-az">{tFilters('nameAZ')}</SelectItem>
                      <SelectItem value="name-za">{tFilters('nameZA')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 text-center text-destructive flex-shrink-0">
                  <p className="text-sm">{error}</p>
                  <Button onClick={fetchAllLeads} className="mt-2" variant="outline" size="sm">
                    {tCommon('retry')}
                  </Button>
                </div>
              )}

              {/* Leads List */}
              <div className="flex-1 space-y-1 overflow-y-auto min-h-0 overscroll-contain p-2" style={{ maxHeight: '100%' }}>
                {loadingCallLeads && leads.length > 0 ? (
                  // Show existing leads with skeleton for loading call leads
                  <>
                    {filteredLeads.map((lead) => renderLeadRow(lead))}
                    {/* Skeleton for loading call leads */}
                    <div className="space-y-1">
                      <div className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <p className="text-xs text-muted-foreground">Loading call leads...</p>
                        </div>
                      </div>
                      {[...Array(3)].map((_, i) => (
                        <div key={`skeleton-${i}`} className="rounded-2xl border border-border bg-background p-3 animate-pulse">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                              <div className="h-3 bg-muted rounded w-2/3"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : filteredLeads.length === 0 && !error ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      {searchTerm ? 'No matching leads' : 'No leads yet'}
                    </h3>
                    <p className="text-sm mb-4">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Share your quote request page to start receiving leads!'}
                    </p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => renderLeadRow(lead))
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel - Lead Details */}
          <div className={`${selectedLead || loadingFullLeadDetails ? 'block' : 'hidden lg:block'} h-full min-h-0`}>
            {loadingFullLeadDetails ? (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading full details...</p>
                </div>
              </Card>
            ) : selectedLead ? (
              <LeadDetailsPanel
                lead={selectedLead}
                onClose={() => {
                  setSelectedLeadId(null)
                  setHasUserClearedSelection(true)
                }}
                onRefresh={() => {
                  if (selectedLead?.id) {
                    setLeadDetailsCache((prev) => {
                      if (!prev.has(selectedLead.id)) return prev
                      const next = new Map(prev)
                      next.delete(selectedLead.id)
                      return next
                    })
                  }
                  void fetchAllLeads()
                }}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Select a Lead</h3>
                  <p className="text-sm">Choose a lead from the list to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Lead Details Panel Component
interface LeadDetailsPanelProps {
  lead: UnifiedLead
  onClose: () => void
  onRefresh: () => void
}

function LeadDetailsPanel({ lead, onClose, onRefresh }: LeadDetailsPanelProps) {
  const router = useRouter()
  const tLeads = useTranslations('leads')
  const tCommon = useTranslations('common')
  const tTranslation = useTranslations('translation')
  const locale = useLocale()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // Translation states for different sections
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null)
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false)
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false)
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)
  const [summaryCardExpanded, setSummaryCardExpanded] = useState(false)
  const [phoneClock, setPhoneClock] = useState("")
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [resolvedClientId, setResolvedClientId] = useState<number | null>(lead.converted_to_client_id ?? null)
  const [saveAction, setSaveAction] = useState<"client" | "quote" | "project" | null>(null)
  const [saveClientOpen, setSaveClientOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<SaveClientAction>("project")
  const [openPortalAfterSave, setOpenPortalAfterSave] = useState(false)
  const [clientPortalToken, setClientPortalToken] = useState<string | null>(null)
  const [openingClientPortal, setOpeningClientPortal] = useState(false)

  // Reset translations and expand state when lead changes
  useEffect(() => {
    setTranslatedSummary(null)
    setTranslatedDescription(null)
    setSummaryCardExpanded(false)
    setResolvedClientId(lead.converted_to_client_id ?? null)
    setProjectDialogOpen(false)
    setSaveAction(null)
    setSaveClientOpen(false)
    setOpenPortalAfterSave(false)
    setClientPortalToken(null)
    setOpeningClientPortal(false)
  }, [lead.converted_to_client_id, lead.id])

  useEffect(() => {
    const updatePhoneClock = () => setPhoneClock(formatBrowserPhoneTime())
    updatePhoneClock()

    const interval = window.setInterval(updatePhoneClock, 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const handleTranslate = async (
    text: string,
    setTranslated: (text: string | null) => void,
    setLoading: (loading: boolean) => void,
    isTranslated: boolean
  ) => {
    if (isTranslated) {
      // Reset to original
      setTranslated(null)
      return
    }

    setLoading(true)
    try {
      // Use cached translation
      const translated = await translateWithCache(text, 'es', 'en')
      setTranslated(translated)
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return "1 day ago"
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "CONTACTED":
        return "bg-amber-500/10 text-amber-600 border-amber-200"
      case "QUOTED":
        return "bg-purple-500/10 text-purple-600 border-purple-200"
      case "CONVERTED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      case "LOST":
        return "bg-red-500/10 text-red-600 border-red-200"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const isCallOrMessagesLead = lead.type === 'call' || !!(lead as any).contractor_ai_call_lead_id
  const sourceLabel = lead.is_frontline_ai ? 'Frontline' : lead.type === 'call' ? 'Call' : 'Request'
  const quoteHref = lead.converted_to_job_id ? `/quotes/${lead.converted_to_job_id}` : null
  const requestLeadId = lead.id.startsWith('request-') ? Number(lead.id.replace('request-', '')) : null

  const tryRecoverExistingClient = useCallback(async (): Promise<number | null> => {
    if (resolvedClientId) return resolvedClientId

    if (lead.converted_to_job_id) {
      const job = await api.getJob(lead.converted_to_job_id) as { client_id?: number | null; client_portal_token?: string | null }
      if (job?.client_id) {
        setResolvedClientId(job.client_id)
        if (job.client_portal_token) {
          setClientPortalToken(job.client_portal_token)
        }
        if (requestLeadId) {
          try {
            await api.updateLead(requestLeadId, { converted_to_client_id: job.client_id })
          } catch {
            // Keep the recovered client link even if lead sync fails.
          }
        }
        onRefresh()
        return job.client_id
      }
    }

    return null
  }, [lead.converted_to_job_id, onRefresh, requestLeadId, resolvedClientId])

  const routeAfterClient = useCallback((clientId: number, action: SaveClientAction) => {
    if (action === "client") {
      toast({ title: "Client saved" })
      router.push(`/${locale}/clients/${clientId}`)
      return
    }
    if (action === "quote") {
      router.push(`/${locale}/quotes/new?clientId=${clientId}`)
      return
    }
    setProjectDialogOpen(true)
  }, [locale, router, toast])

  const handleSaveClientAction = useCallback(async (action: "client" | "quote" | "project") => {
    try {
      setSaveAction(action)
      const existingClientId = await tryRecoverExistingClient()

      if (existingClientId) {
        routeAfterClient(existingClientId, action)
        return
      }

      setPendingAction(action)
      setOpenPortalAfterSave(false)
      setSaveClientOpen(true)
    } catch (error: any) {
      toast({
        title: "Unable to save client",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaveAction(null)
    }
  }, [routeAfterClient, toast, tryRecoverExistingClient])

  const launchClientPortal = useCallback(async (clientId: number) => {
    let token = clientPortalToken
    if (!token) {
      const result = await api.generateClientPortal(clientId)
      token = result.token
      setClientPortalToken(result.token)
    }

    const href = typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/client/${token}`
      : `/${locale}/client/${token}`

    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer")
    } else {
      router.push(href)
    }
  }, [clientPortalToken, locale, router])

  const handleOpenClientPortal = useCallback(async () => {
    try {
      setOpeningClientPortal(true)
      const existingClientId = await tryRecoverExistingClient()

      if (existingClientId) {
        await launchClientPortal(existingClientId)
        return
      }

      setPendingAction("client")
      setOpenPortalAfterSave(true)
      setSaveClientOpen(true)
    } catch (error: any) {
      toast({
        title: "Unable to open client portal",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setOpeningClientPortal(false)
    }
  }, [launchClientPortal, toast, tryRecoverExistingClient])

  const saveClientMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default" className="h-9 w-full rounded-lg px-3 text-sm justify-between" disabled={saveAction !== null}>
          <span className="inline-flex items-center">
            {saveAction ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Save Client
          </span>
          <ChevronDown className="h-3.5 w-3.5 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuItem className="items-start py-3 px-3 rounded-md" onSelect={() => void handleSaveClientAction("project")}>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Save and Create Project</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Recommended
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-3 px-3 rounded-md text-sm font-medium" onSelect={() => void handleSaveClientAction("quote")}>
          Save and Create Quote
        </DropdownMenuItem>
        <DropdownMenuItem className="py-3 px-3 rounded-md text-sm font-medium" onSelect={() => void handleSaveClientAction("client")}>
          Save Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const convertedClientId = resolvedClientId ?? lead.converted_to_client_id ?? null
  const convertedProjectId = lead.converted_to_project_id ?? null
  const convertedJobId = lead.converted_to_job_id ?? null
  const hasSavedClient = convertedClientId != null

  const handleConvertedAction = (action: "view-project" | "view-quote" | "view-client" | "create-project" | "create-quote") => {
    if (!convertedClientId) return
    switch (action) {
      case "view-project":
        if (convertedProjectId) router.push(`/${locale}/projects/${convertedProjectId}`)
        break
      case "view-quote":
        if (convertedJobId) router.push(`/${locale}/quotes/${convertedJobId}`)
        break
      case "view-client":
        router.push(`/${locale}/clients/${convertedClientId}`)
        break
      case "create-project":
        setProjectDialogOpen(true)
        break
      case "create-quote":
        router.push(`/${locale}/quotes/new?clientId=${convertedClientId}`)
        break
    }
  }

  const convertedMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default" className="h-9 w-full rounded-lg px-3 text-sm justify-between">
          <span className="inline-flex items-center">
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </span>
          <ChevronDown className="h-3.5 w-3.5 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuItem
          className="py-3 px-3 rounded-md text-sm font-medium"
          onSelect={() => handleConvertedAction("view-client")}
        >
          <UserIcon className="h-3.5 w-3.5 mr-1.5" />
          View Client
        </DropdownMenuItem>
        {convertedProjectId ? (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium"
            onSelect={() => handleConvertedAction("view-project")}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            View Project
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium text-muted-foreground"
            onSelect={() => handleConvertedAction("create-project")}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            Create Project
          </DropdownMenuItem>
        )}
        {convertedJobId ? (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium"
            onSelect={() => handleConvertedAction("view-quote")}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            View Quote
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium text-muted-foreground"
            onSelect={() => handleConvertedAction("create-quote")}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Create Quote
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const primaryClientMenu = hasSavedClient ? convertedMenu : saveClientMenu

  return (
    <Card className="h-full flex flex-col overflow-hidden border-0 rounded-none shadow-none bg-background">
      {/* Header — polished top section from the reference, but intentionally sans-serif */}
      <div className="flex items-start justify-between gap-3 border-b border-border bg-background/95 px-3 py-3 md:px-8 md:py-5 flex-shrink-0 backdrop-blur z-20 sticky top-0">
        {/* Back arrow (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden shrink-0 h-9 w-9 -ml-1 mt-0.5 text-blue-600 dark:text-blue-400"
          aria-label={tCommon('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h2 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
              {lead.name}
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${getStatusColor(lead.status)} border-current/20`}>
              <span className="h-1 w-1 rounded-full bg-current" />
              {lead.status}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${
              lead.is_frontline_ai
                ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'
                : 'border-border bg-background text-muted-foreground'
            }`}>
              {lead.is_frontline_ai ? <Bot className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
              {sourceLabel}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors tabular-nums">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {formatPhoneForDisplay(lead.phone)}
              </a>
            )}
            {lead.address ? (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" className="inline-flex max-w-[20rem] items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lead.address}</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 italic">
                <MapPin className="h-3.5 w-3.5 shrink-0" />No address on file
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatTime(lead.created_at)}
            </span>
          </div>
        </div>

        {/* Action buttons — desktop inline, mobile hamburger */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {/* Desktop: Call + Quote buttons */}
          {lead.phone && (
            <Button size="sm" variant="outline" asChild className="hidden lg:flex h-9 rounded-lg px-3 text-sm gap-1.5 bg-background">
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-3.5 w-3.5" />{tLeads('callCustomer')}
              </a>
            </Button>
          )}
          <div className="hidden lg:block">
            {primaryClientMenu}
          </div>
          {quoteHref && (
            <Button
              size="sm"
              variant="outline"
              className="hidden lg:flex h-9 rounded-lg px-3 text-sm bg-background"
              onClick={() => void handleOpenClientPortal()}
              disabled={openingClientPortal}
            >
              {openingClientPortal ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
              Client portal
            </Button>
          )}
          {/* Mobile: hamburger for sheet */}
          {isCallOrMessagesLead && isMobile && (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground lg:hidden" aria-label={tLeads('moreLeadInfo')} onClick={() => setDetailsSheetOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area - conversation extends to action bar; minimal bottom gap on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden overflow-x-hidden min-h-0 pb-1 lg:pb-0 bg-muted/20">
        {/* Show call lead layout for both call leads AND consolidated leads (request leads with call data) */}
        {(lead.type === 'call' || (lead.type === 'request' && (lead as any).contractor_ai_call_lead_id)) ? (
          <>
            {/* Conversation History - On mobile: only content, full height; minimal gap below header */}
            <div className={`order-1 lg:order-1 flex flex-col min-h-0 overflow-hidden ${isMobile ? 'flex-1 bg-background' : 'flex-shrink-0 lg:w-[350px] xl:w-[370px] bg-muted/20'}`}>
              {/* Phone mockup — SMS thread only */}
              <div className={`flex flex-col items-center justify-center ${isMobile ? 'flex-1 min-h-0 px-0 pt-1 pb-0 overflow-hidden' : 'px-5 py-5 lg:px-6 lg:py-7'}`}>
                <div className="hidden w-full max-w-[300px] pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">
                  Live conversation
                </div>
                <div className={`relative flex flex-col ${isMobile ? 'w-full max-w-[18.75rem] h-full' : 'w-full max-w-[300px] aspect-[9/20] max-h-[620px]'}`}>
                  <div className="relative flex flex-col h-full rounded-[2.75rem] border border-slate-300/80 bg-slate-950/95 p-3 shadow-[0_30px_60px_-25px_rgba(15,23,42,0.35)] dark:border-slate-700 overflow-hidden">
                    {/* Notch */}
                    <div className="absolute left-1/2 top-4 z-10 h-1.5 w-24 -translate-x-1/2 rounded-full bg-white/20" />
                    <div className="overflow-hidden rounded-[2.25rem] bg-white dark:bg-zinc-950 flex flex-col h-full">
                      <div className="flex items-center justify-between border-b border-border/60 px-5 pb-2 pt-6 text-[11px] font-semibold text-foreground">
                        <span>{phoneClock || '--:--'}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          SMS
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                        <ConversationMessages phoneNumber={normalizePhoneToE164(lead.phone)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 hidden w-full max-w-[320px] rounded-xl border border-dashed border-border bg-background/70 p-3 text-center text-[11px] text-muted-foreground lg:block">
                  Mirrors the SMS thread sent to this customer.
                </div>
              </div>
            </div>

            {/* Lead Details - Desktop only */}
            <div className="order-2 lg:order-2 hidden lg:flex lg:flex-col lg:flex-1 min-w-0 lg:overflow-y-auto overflow-x-hidden p-5 lg:p-7 xl:p-8 min-h-0 overscroll-contain lg:max-h-full bg-background">
              <div className="space-y-5">
              {/* Property insights (when normalized address is available) */}
              {(lead as any).address_data?.id && (
                <PropertyInsightsCard
                  addressId={(lead as any).address_data.id}
                  title={tLeads('propertyInsights') || 'Property insights'}
                />
              )}

              {/* AI Summary from contractor-ai (for call leads and consolidated leads) */}
              {lead.summary_text && (() => {
                const SUMMARY_CAP = 360
                const rawSummary = stripMarkdownBold(translatedSummary || lead.summary_text)
                const isLong = rawSummary.length > SUMMARY_CAP
                const displaySummary = isLong && !summaryCardExpanded
                  ? rawSummary.slice(0, SUMMARY_CAP).trimEnd() + '…'
                  : rawSummary
                const summaryFacts = buildSummaryFacts(lead, lead.summary_text)
                const summaryTitle = summaryFacts[0]?.value && summaryFacts[0].value !== 'General inquiry'
                  ? `${summaryFacts[0].value} request`
                  : 'Call summary'
                return (
                  <div id="lead-detail-ai-summary" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {tLeads('aiSummary')}
                          </h3>
                          <p className="text-sm font-semibold text-foreground">{summaryTitle}</p>
                        </div>
                      </div>
                      <span className="hidden text-[11px] text-muted-foreground md:inline">
                        Generated from call
                      </span>
                      {locale === 'es' && (
                        <button
                          onClick={() => handleTranslate(
                            lead.summary_text!,
                            setTranslatedSummary,
                            setIsTranslatingSummary,
                            !!translatedSummary
                          )}
                          disabled={isTranslatingSummary}
                          className="p-1.5 rounded-lg transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                          title={translatedSummary ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                        >
                          {isTranslatingSummary ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : translatedSummary ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Languages className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                      {displaySummary}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {summaryFacts.map((fact) => (
                        <div key={fact.label} className="rounded-xl border border-border bg-background px-3 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">{fact.label}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{fact.value}</p>
                        </div>
                      ))}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setSummaryCardExpanded(v => !v)}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                      >
                        {summaryCardExpanded ? 'Show less ↑' : 'Show more ↓'}
                      </button>
                    )}
                    {translatedSummary && (
                      <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                    )}
                  </div>
                )
              })()}

              {/* Project Description from quote request (for consolidated leads) */}
              {lead.description && lead.type === 'request' && (lead as any).contractor_ai_call_lead_id && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {tLeads('projectDescription')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-1.5">{tLeads('fromQuoteRequest')}</p>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-[#333] dark:text-neutral-200 whitespace-pre-wrap break-words flex-1 min-w-0">
                      {translatedDescription || lead.description}
                    </p>
                    {locale === 'es' && (
                      <button
                        onClick={() => handleTranslate(
                          lead.description!,
                          setTranslatedDescription,
                          setIsTranslatingDescription,
                          !!translatedDescription
                        )}
                        disabled={isTranslatingDescription}
                        className="p-1.5 rounded-lg transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                        title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                      >
                        {isTranslatingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : translatedDescription ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {translatedDescription && (
                    <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                  )}
                </div>
              )}

              {/* Project Description for call-only leads (fallback) */}
              {lead.description && lead.type === 'call' && !lead.summary_text && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {tLeads('projectDescription')}
                  </h3>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-[#333] dark:text-neutral-200 whitespace-pre-wrap break-words flex-1 min-w-0">
                      {translatedDescription || lead.description}
                    </p>
                    {locale === 'es' && (
                      <button
                        onClick={() => handleTranslate(
                          lead.description!,
                          setTranslatedDescription,
                          setIsTranslatingDescription,
                          !!translatedDescription
                        )}
                        disabled={isTranslatingDescription}
                        className="p-1.5 rounded-lg transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                        title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                      >
                        {isTranslatingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : translatedDescription ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {translatedDescription && (
                    <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                  )}
                </div>
              )}

              {/* Measurements from quote request */}
              {lead.measurements && lead.measurements.items && lead.measurements.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <span>{tLeads('measurements')}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {lead.measurements.items.length} {lead.measurements.items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {lead.measurements.items.map((item, index) => (
                      <div key={index} className="relative p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 border">
                        {/* Type Badge */}
                        <span className={`absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${item.type === 'dimensions'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          : item.type === 'square_footage'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}>
                          {item.type === 'dimensions' ? 'L×W' : item.type === 'square_footage' ? 'Area' : 'Linear'}
                        </span>

                        <p className="text-xs md:text-sm font-medium mb-1 pr-12">{item.name || 'Measurement'}</p>

                        <div className="flex items-baseline gap-1">
                          {item.type === 'dimensions' ? (
                            <>
                              <span className="text-lg md:text-xl font-bold">
                                {item.length} <span className="text-muted-foreground font-normal text-sm">×</span> {item.width}
                              </span>
                              <span className="text-xs text-muted-foreground">{item.unit || 'ft'}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg md:text-xl font-bold">{item.value}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.unit || (item.type === 'square_footage' ? 'sq ft' : 'ft')}
                              </span>
                            </>
                          )}
                        </div>

                        {item.type === 'dimensions' && item.length && item.width && (
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            = <span className="font-medium text-primary">{item.length * item.width} sq {item.unit || 'ft'}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request-specific content (for consolidated leads) */}
              {lead.type === 'request' && (lead as any).contractor_ai_call_lead_id && lead.estimated_value && (
                <div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                    {tLeads('estimatedValue')}
                  </h3>
                  <p className="text-lg font-bold text-primary">
                    ${lead.estimated_value.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Call History Section */}
              <div id="lead-detail-call-history">
                <CallHistorySection phoneNumber={normalizePhoneToE164(lead.phone)} currentLeadId={String(lead.id)} />
              </div>

              </div>{/* end unified panel */}
            </div>

            {/* Mobile: side Sheet with Contact, AI Summary, Call History (only way to access on mobile) */}
            {isCallOrMessagesLead && (
              <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
                <SheetContent side="left" className="w-[86%] max-w-[22rem] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>{tLeads('moreLeadInfo')}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <Card className="border border-border/80 bg-card rounded-lg">
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">{tLeads('contactInformation')}</h3>
                        <dl className="space-y-2.5 text-sm">
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              <dt className="sr-only">Phone</dt>
                              <dd className="flex-1 min-w-0 truncate tabular-nums text-foreground">{formatPhoneForDisplay(lead.phone)}</dd>
                              <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs shrink-0">
                                <a href={`tel:${lead.phone}`} aria-label={tCommon('call')}>{tCommon('call')}</a>
                              </Button>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              <dt className="sr-only">Email</dt>
                              <dd className="min-w-0 truncate">
                                <a href={`mailto:${lead.email}`} className="text-foreground hover:underline">{lead.email}</a>
                              </dd>
                            </div>
                          )}
                          {lead.address ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                              <dt className="sr-only">Address</dt>
                              <dd className="min-w-0 break-words text-foreground">
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" className="hover:underline">{lead.address}</a>
                              </dd>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              <dd className="text-muted-foreground italic">No address provided</dd>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                            <dt className="sr-only">Submitted</dt>
                            <dd className="text-muted-foreground text-xs">{formatTime(lead.created_at)}</dd>
                          </div>
                        </dl>
                      </div>
                    </Card>
                    {lead.summary_text && (() => {
                      const SUMMARY_CAP = 320
                      const rawSummary = stripMarkdownBold(translatedSummary || lead.summary_text)
                      const isLong = rawSummary.length > SUMMARY_CAP
                      const displaySummary = isLong && !summaryCardExpanded
                        ? rawSummary.slice(0, SUMMARY_CAP).trimEnd() + '…'
                        : rawSummary
                      const summaryFacts = buildSummaryFacts(lead, lead.summary_text)
                      const summaryTitle = summaryFacts[0]?.value && summaryFacts[0].value !== 'General inquiry'
                        ? `${summaryFacts[0].value} request`
                        : 'Call summary'
                      return (
                      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                                {tLeads('aiSummary')}
                              </h3>
                              <p className="text-sm font-semibold text-foreground">{summaryTitle}</p>
                            </div>
                          </div>
                          {locale === 'es' && (
                            <button
                              onClick={() => handleTranslate(lead.summary_text!, setTranslatedSummary, setIsTranslatingSummary, !!translatedSummary)}
                              disabled={isTranslatingSummary}
                              className="p-1.5 rounded-lg transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                              title={translatedSummary ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                            >
                              {isTranslatingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : translatedSummary ? <RotateCcw className="h-4 w-4" /> : <Languages className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
                          {displaySummary}
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          {summaryFacts.map((fact) => (
                            <div key={fact.label} className="rounded-xl border border-border bg-background px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{fact.label}</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{fact.value}</p>
                            </div>
                          ))}
                        </div>
                        {isLong && (
                          <button
                            onClick={() => setSummaryCardExpanded(v => !v)}
                            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                          >
                            {summaryCardExpanded ? 'Show less ↑' : 'Show more ↓'}
                          </button>
                        )}
                        {translatedSummary && <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>}
                      </div>
                      )
                    })()}
                    <div>
                      <CallHistorySection phoneNumber={normalizePhoneToE164(lead.phone)} currentLeadId={String(lead.id)} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </>
        ) : (
          /* Left Side - Lead Details (for request leads) */
          <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 p-3 md:p-6 min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
            {/* Contact Information - minimal clean */}
            <Card className="border border-border/80 bg-card rounded-lg">
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{tLeads('contactInformation')}</h3>
                <dl className="space-y-2.5 text-sm">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <dt className="sr-only">Phone</dt>
                      <dd className="flex-1 min-w-0 truncate tabular-nums text-foreground">{formatPhoneForDisplay(lead.phone)}</dd>
                      <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs shrink-0">
                        <a href={`tel:${lead.phone}`} aria-label={tCommon('call')}>{tCommon('call')}</a>
                      </Button>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <dt className="sr-only">Email</dt>
                      <dd className="min-w-0 truncate">
                        <a href={`mailto:${lead.email}`} className="text-foreground hover:underline">{lead.email}</a>
                      </dd>
                    </div>
                  )}
                  {lead.address ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                      <dt className="sr-only">Address</dt>
                      <dd className="min-w-0 break-words text-foreground">
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" className="hover:underline">{lead.address}</a>
                      </dd>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <dd className="text-muted-foreground italic">No address provided</dd>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    <dt className="sr-only">Submitted</dt>
                    <dd className="text-muted-foreground text-xs">{formatTime(lead.created_at)}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Property insights (when normalized address is available) - request-only layout */}
            {(lead as any).address_data?.id && (
              <PropertyInsightsCard
                addressId={(lead as any).address_data.id}
                title={tLeads('propertyInsights') || 'Property insights'}
              />
            )}

            {/* AI Summary from contractor-ai (for consolidated leads) */}
            {lead.summary_text && (
              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="shrink-0">{tLeads('aiSummary')}</span>
                  {(lead as any).contractor_ai_call_lead_id && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                      {tLeads('fromCall')}
                    </Badge>
                  )}
                  {locale === 'es' && (
                    <button
                      onClick={() => handleTranslate(
                        lead.summary_text!,
                        setTranslatedSummary,
                        setIsTranslatingSummary,
                        !!translatedSummary
                      )}
                      disabled={isTranslatingSummary}
                      className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${translatedSummary
                        ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/30'
                        }`}
                      title={translatedSummary ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                    >
                      {isTranslatingSummary ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : translatedSummary ? (
                        <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Languages className="h-4 w-4 text-white" />
                      )}
                    </button>
                  )}
                </h3>
                <div className="p-2.5 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500">
                  <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                    {translatedSummary || lead.summary_text}
                  </p>
                  {translatedSummary && (
                    <p className="text-[10px] mt-2 text-blue-600 dark:text-blue-400 italic">
                      {tTranslation('translated')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Project Description from quote request - card with subtitle */}
            {lead.description && (
              <div className="rounded-lg border border-border shadow-sm bg-[#F5F5F5]/50 dark:bg-neutral-800/50 p-4 animate-in fade-in duration-200">
                <h3 className="text-base font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200 mb-1">
                  {tLeads('projectDescription')}
                </h3>
                {lead.type === 'request' && (
                  <p className="text-[11px] text-muted-foreground mb-2">{tLeads('fromQuoteRequest')}</p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-[#333] dark:text-neutral-200 whitespace-pre-wrap break-words flex-1 min-w-0">
                    {translatedDescription || lead.description}
                  </p>
                  {locale === 'es' && (
                    <button
                      onClick={() => handleTranslate(
                        lead.description!,
                        setTranslatedDescription,
                        setIsTranslatingDescription,
                        !!translatedDescription
                      )}
                      disabled={isTranslatingDescription}
                      className="p-1.5 rounded-lg transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                      title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                    >
                      {isTranslatingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : translatedDescription ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Languages className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {translatedDescription && (
                  <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                )}
              </div>
            )}

            {/* Request-specific content */}
            {lead.estimated_value && (
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Estimated Value
                </h3>
                <div className="text-2xl font-bold text-primary">
                  ${lead.estimated_value.toLocaleString()}
                </div>
              </div>
            )}

            {/* Attachments */}
            {lead.attachments && lead.attachments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Attachments
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  📎 {lead.attachments.length} file{lead.attachments.length > 1 ? 's' : ''} attached
                </div>
              </div>
            )}

            {/* Call History with Transcripts (for consolidated leads - request-only layout; call/consolidated use main layout above) */}
            {(lead as any).contractor_ai_call_lead_id && lead.phone && (
              <CallHistorySection
                key={`call-history-consolidated-${lead.phone}-${lead.id}`}
                phoneNumber={normalizePhoneToE164(lead.phone)}
                currentLeadId={lead.id}
              />
            )}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        defaultClientId={resolvedClientId ?? undefined}
        fromLead={requestLeadId ? {
          leadId: Number(requestLeadId),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          projectType: lead.project_type || lead.service_type,
          description: lead.description,
          estimatedValue: lead.estimated_value,
        } : undefined}
        onProjectCreated={(projectId) => {
          router.push(`/${locale}/projects/${projectId}`)
        }}
      />

      <SaveClientFromLeadDialog
        open={saveClientOpen}
        onOpenChange={setSaveClientOpen}
        lead={{
          leadId: requestLeadId ?? undefined,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
        }}
        defaultAction={pendingAction}
        onClientSaved={(clientId, action) => {
          setResolvedClientId(clientId)
          onRefresh()
          if (openPortalAfterSave) {
            setOpenPortalAfterSave(false)
            void launchClientPortal(clientId)
            return
          }
          routeAfterClient(clientId, action)
        }}
      />

      {/* Action Buttons - mobile only; desktop uses header inline buttons */}
      <div className={`lg:hidden px-3 pt-2 pb-3 flex-shrink-0 border-t bg-background`}>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {lead.phone && (
            <Button variant="default" asChild className="min-w-[8.5rem] flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={`tel:${lead.phone}`}>
                <Phone className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                {tLeads('callCustomer')}
              </a>
            </Button>
          )}
          <div className="min-w-[8.5rem] flex-1">
            {primaryClientMenu}
          </div>
          {quoteHref && (
            <Button
              variant="outline"
              className="min-w-[8.5rem] flex-1 h-9 md:h-10 text-xs md:text-sm"
              onClick={() => void handleOpenClientPortal()}
              disabled={openingClientPortal}
            >
              {openingClientPortal ? (
                <Loader2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Link2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              )}
              Client portal
            </Button>
          )}
        </div>

        {lead.type === 'request' && (
          <div className="mt-2 md:mt-3">
            <Button variant="ghost" asChild className="w-full h-8 md:h-10 text-xs md:text-sm">
              <a href={`/leads/${lead.id.replace('request-', '')}`}>
                {tLeads('viewFullDetails')} →
              </a>
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

// Conversation Messages Component for Call Leads
interface ConversationMessagesProps {
  phoneNumber: string
}

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*\*/g, '')
}

function extractUrls(text: string): { cleanText: string; urls: Array<{ href: string; label: string }> } {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const urls: Array<{ href: string; label: string }> = []
  const cleanText = text.replace(urlRegex, (url) => {
    let label = 'Link'
    if (/\/quote-request\//i.test(url) || /\/request\//i.test(url)) label = 'Quote Request'
    else if (/\/book\//i.test(url) || /\/booking\//i.test(url)) label = 'Book Appointment'
    urls.push({ href: url, label })
    return ''
  }).replace(/\s{2,}/g, ' ').trim()
  return { cleanText, urls }
}

function ConversationMessages({ phoneNumber }: ConversationMessagesProps) {
  const { getContractorAISpId } = useAuth()
  const locale = useLocale()
  const tTranslation = useTranslations('translation')
  const tLeads = useTranslations('leads')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Translation state - translate all at once
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [isTranslatingAll, setIsTranslatingAll] = useState(false)
  const [allTranslated, setAllTranslated] = useState(false)

  // Generate a cache key for the conversation
  const getConversationCacheKey = useCallback(() => {
    return `conv_translations_${phoneNumber}`
  }, [phoneNumber])

  // Load cached translations on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && phoneNumber) {
      try {
        const cached = localStorage.getItem(getConversationCacheKey())
        if (cached) {
          const parsed = JSON.parse(cached)
          setTranslatedMessages(parsed.translations || {})
          setAllTranslated(Object.keys(parsed.translations || {}).length > 0)
        }
      } catch (e) {
        console.error('Error loading cached conversation translations:', e)
      }
    }
  }, [phoneNumber, getConversationCacheKey])

  // Translate all messages at once
  const handleTranslateAll = async () => {
    if (allTranslated) {
      // Reset to original
      setTranslatedMessages({})
      setAllTranslated(false)
      // Clear cache
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getConversationCacheKey())
      }
      return
    }

    setIsTranslatingAll(true)
    try {
      // Get all message texts that need translation
      const textsToTranslate = messages
        .filter(msg => msg.message_text && msg.message_text.trim())
        .map(msg => msg.message_text)

      if (textsToTranslate.length === 0) return

      // Translate all at once using batch API
      const response = await api.translateBatch(textsToTranslate, 'es', 'en')

      // Map translations back to message IDs
      const newTranslations: Record<string, string> = {}
      let translationIndex = 0
      messages.forEach(msg => {
        if (msg.message_text && msg.message_text.trim()) {
          newTranslations[msg.id] = response.translated_texts[translationIndex]
          translationIndex++
        }
      })

      setTranslatedMessages(newTranslations)
      setAllTranslated(true)

      // Save to localStorage cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(getConversationCacheKey(), JSON.stringify({
          translations: newTranslations,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslatingAll(false)
    }
  }

  useEffect(() => {
    if (phoneNumber) {
      console.log('💬 ConversationMessages: Phone number received:', phoneNumber)
      loadMessages()
    } else {
      console.log('💬 ConversationMessages: No phone number provided')
      setLoading(false)
      setMessages([])
    }
  }, [phoneNumber])

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError("")

      if (!phoneNumber) {
        setMessages([])
        setLoading(false)
        return
      }

      const spId = getContractorAISpId()
      if (!spId) {
        setError('Service provider ID not found')
        return
      }

      console.log('🔍 Loading conversations for phone:', phoneNumber, 'SP:', spId)

      // Get all conversations for this service provider
      const conversationsResponse = await contractorAI.getConversations({
        sp_id: spId.toString(),
        status: 'all' // Get all conversations, not just active
      })

      console.log('📞 Conversations response:', conversationsResponse)

      // Normalize phone numbers to E.164 format for comparison
      const normalizedTargetPhone = normalizePhoneToE164(phoneNumber)

      // Find conversation by matching customer phone number
      const conversation = (conversationsResponse as any).conversations?.find((conv: any) => {
        const customerPhone = conv.customer?.phone_number || ''
        const normalizedCustomerPhone = normalizePhoneToE164(customerPhone)
        const matches = normalizedCustomerPhone === normalizedTargetPhone

        console.log('🔍 Comparing:', {
          target: phoneNumber,
          normalizedTarget: normalizedTargetPhone,
          customer: customerPhone,
          normalizedCustomer: normalizedCustomerPhone,
          matches
        })

        return matches
      })

      console.log('✅ Found conversation:', conversation)

      if (conversation) {
        // Load messages for this conversation
        console.log('📨 Loading messages for conversation:', conversation.id)
        const messagesResponse = await contractorAI.getConversationMessages(conversation.id.toString(), {
          per_page: 50 // Get more messages
        })

        console.log('📨 Messages response:', messagesResponse)

        const apiMessages = (messagesResponse as any).messages?.map((msg: any) => ({
          id: msg.id.toString(),
          sender_type: msg.sender_type,
          message_text: msg.message_text,
          translated_text: msg.translated_text,
          timestamp: msg.timestamp,
          status: msg.status
        })) || []

        // Sort chronologically (oldest first)
        apiMessages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        console.log('✅ Loaded', apiMessages.length, 'messages')
        setMessages(apiMessages)
      } else {
        console.log('⚠️ No conversation found for phone:', phoneNumber)
        setMessages([])
      }
    } catch (err: any) {
      console.error('❌ Failed to load messages:', err)
      setError(err.message || 'Failed to load messages')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="px-2 py-3 md:p-4 space-y-3">
        {/* Loading indicator with description */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading conversation messages...</p>
        </div>
        {/* Skeleton messages */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-xs rounded-lg px-3 py-2 bg-muted animate-pulse">
              <div className="h-4 bg-muted-foreground/20 rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-2 py-3 md:p-4 text-center text-destructive text-sm">
        {error}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="px-2 py-3 md:p-4 text-center text-muted-foreground">
        <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No conversation history</p>
      </div>
    )
  }

  // Get sender label based on locale and translation state
  const getSenderLabel = (senderType: string): string => {
    if (senderType === 'service_provider') {
      return locale === 'es' ? 'Contratista' : 'Contractor'
    }
    return locale === 'es' ? 'Cliente' : 'Customer'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Translate All Header - only show when locale is 'es' */}
      {locale === 'es' && messages.length > 0 && (
        <div className="px-2 md:px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {allTranslated ? `✓ ${tTranslation('translated')}` : `${messages.length} mensajes`}
          </span>
          <button
            onClick={handleTranslateAll}
            disabled={isTranslatingAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${allTranslated
              ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/30'
              }`}
          >
            {isTranslatingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{tTranslation('translating')}</span>
              </>
            ) : allTranslated ? (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>{tTranslation('showOriginal')}</span>
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                <span>{tTranslation('translateToSpanish')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Messages List - minimal horizontal padding on mobile so bubbles extend to edges */}
      <div className="flex-1 space-y-3 px-4 py-4 overflow-y-auto min-h-0">
        {messages.map((msg) => {
          const isTranslated = !!translatedMessages[msg.id]
          const displayText = translatedMessages[msg.id] || msg.message_text
          const isServiceProvider = msg.sender_type === 'service_provider'

          return (
            <div
              key={msg.id}
              className={`flex ${isServiceProvider ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${isServiceProvider
                  ? 'rounded-br-md bg-[#0879c9] text-white'
                  : 'rounded-bl-md bg-muted text-foreground'
                  }`}
              >
                {/* Sender Label */}
                <div className={`text-[10px] mb-1 font-medium ${isServiceProvider
                  ? 'text-white/70'
                  : 'text-muted-foreground'
                  }`}>
                  {getSenderLabel(msg.sender_type)}
                </div>

                {/* Message Text with URL chip extraction */}
                {(() => {
                  const { cleanText, urls } = extractUrls(displayText)
                  return (
                    <>
                      {cleanText && <p className="text-[14px] leading-[1.4] whitespace-pre-wrap">{cleanText}</p>}
                      {urls.map((u, i) => (
                        <a
                          key={i}
                          href={u.href}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-1.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium no-underline ${
                            isServiceProvider
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          <Link2 className="h-3 w-3 shrink-0" />
                          {u.label} →
                        </a>
                      ))}
                    </>
                  )
                })()}

                {/* Timestamp and Status */}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <p className={`text-[10px] ${isServiceProvider
                    ? 'text-white/60'
                    : 'text-muted-foreground'
                    }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                  <div className="flex items-center gap-1">
                    {isTranslated && (
                      <span className={`text-[10px] italic ${isServiceProvider
                        ? 'text-white/50'
                        : 'text-green-600 dark:text-green-400'
                        }`}>
                        ✓ {locale === 'es' ? 'traducido' : 'translated'}
                      </span>
                    )}
                    {msg.status && isServiceProvider && (
                      <span className={`text-[10px] ${msg.status === 'delivered' ? 'text-white/70' :
                        msg.status === 'failed' ? 'text-red-300' :
                          'text-white/50'
                        }`}>
                        {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Call History Section Component
interface CallHistorySectionProps {
  phoneNumber: string
  currentLeadId: string
}

interface CallHistoryItem {
  id: string
  created_at: string
  transcript_text?: string
  formatted_transcript_text?: string
  summary_text?: string
  phone_number?: string // Added for verification that transcript belongs to correct phone
  is_frontline_ai?: boolean
  source?: string
}

function CallHistorySection({ phoneNumber, currentLeadId }: CallHistorySectionProps) {
  const { getContractorAISpId } = useAuth()
  const locale = useLocale()
  const tTranslation = useTranslations('translation')
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const [lastPhoneNumber, setLastPhoneNumber] = useState<string>('')
  const [translatedTranscript, setTranslatedTranscript] = useState<string | null>(null)
  const [isTranslatingTranscript, setIsTranslatingTranscript] = useState(false)

  // Generate cache key for transcript
  const getTranscriptCacheKey = useCallback((callId: string) => {
    return `transcript_translation_${phoneNumber}_${callId}`
  }, [phoneNumber])

  // Load cached translation when call selection changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedCallId) {
      try {
        const cached = localStorage.getItem(getTranscriptCacheKey(selectedCallId))
        if (cached) {
          const parsed = JSON.parse(cached)
          setTranslatedTranscript(parsed.translation)
        } else {
          setTranslatedTranscript(null)
        }
      } catch (e) {
        console.error('Error loading cached transcript translation:', e)
        setTranslatedTranscript(null)
      }
    } else {
      setTranslatedTranscript(null)
    }
  }, [selectedCallId, getTranscriptCacheKey])

  const handleTranslateTranscript = async (text: string) => {
    if (translatedTranscript) {
      // Reset to original and clear cache
      setTranslatedTranscript(null)
      if (typeof window !== 'undefined' && selectedCallId) {
        localStorage.removeItem(getTranscriptCacheKey(selectedCallId))
      }
      return
    }

    setIsTranslatingTranscript(true)
    try {
      // Use cached translation helper
      const translated = await translateWithCache(text, 'es', 'en')
      // Format with Spanish speaker names
      const formatted = formatTranscriptTranslation(translated)
      setTranslatedTranscript(formatted)

      // Cache the result
      if (typeof window !== 'undefined' && selectedCallId) {
        localStorage.setItem(getTranscriptCacheKey(selectedCallId), JSON.stringify({
          translation: formatted,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslatingTranscript(false)
    }
  }

  useEffect(() => {
    console.log('📞 CallHistorySection: Phone number received:', phoneNumber, 'Lead ID:', currentLeadId)
  }, [phoneNumber, currentLeadId])

  const loadCallHistory = useCallback(async () => {
    try {
      setLoading(true)

      const spId = getContractorAISpId()
      if (!spId || !phoneNumber) {
        console.log('🔍 Missing spId or phoneNumber:', { spId, phoneNumber })
        setCallHistory([])
        setLoading(false)
        return
      }

      // Normalize phone number to E.164 format before API call
      const normalizedPhone = normalizePhoneToE164(phoneNumber)
      console.log('🔍 Loading call history ONLY for phone:', phoneNumber, '-> Normalized:', normalizedPhone, 'SP:', spId)

      // Fetch leads filtered by this specific phone number ONLY (using E.164 format)
      const response = await contractorAI.getLeads({
        sp_id: spId.toString(),
        phone_number: normalizedPhone, // Use normalized E.164 format
        per_page: 1000
      })

      console.log('📞 Call history API response for phone', normalizedPhone, ':', response)

      // Normalize requested phone number to E.164 format
      const normalizedRequestedPhone = normalizePhoneToE164(phoneNumber)

      // Additional safety check: Ensure all returned leads match the requested phone number
      const historyItems: CallHistoryItem[] = ((response as any).leads || [])
        .filter((lead: any) => {
          // Normalize phone numbers to E.164 format for comparison
          const leadPhoneNormalized = normalizePhoneToE164(lead.phone_number || '')
          const matches = leadPhoneNormalized === normalizedRequestedPhone

          if (!matches) {
            console.warn('⚠️ FILTERING OUT lead with mismatched phone:', {
              leadId: lead.id,
              leadPhone: lead.phone_number,
              leadPhoneNormalized,
              requestedPhone: phoneNumber,
              requestedPhoneNormalized: normalizedRequestedPhone,
              matches
            })
          }
          return matches
        })
        .map((lead: any) => {
          console.log('📋 Processing lead for call history:', {
            id: lead.id,
            phone: lead.phone_number,
            requestedPhone: phoneNumber,
            hasTranscript: !!(lead.transcript_text || lead.formatted_transcript_text),
            transcriptLength: (lead.transcript_text || '').length,
            formattedTranscriptLength: (lead.formatted_transcript_text || '').length
          })

          return {
            id: lead.id.toString(),
            created_at: lead.last_contact_date || lead.created_at,
            transcript_text: lead.transcript_text,
            formatted_transcript_text: lead.formatted_transcript_text,
            summary_text: lead.summary_text,
            phone_number: lead.phone_number, // Keep phone number for verification
            is_frontline_ai: !!lead.is_frontline_ai || lead.source === 'FRONTLINE_VOICE' || lead.interaction_type === 'frontline_voice',
            source: lead.source,
          }
        })
        .filter((item: CallHistoryItem) => {
          const hasTranscript = !!(item.transcript_text || item.formatted_transcript_text)
          if (!hasTranscript) {
            console.log('⏭️ Skipping item without transcript:', item.id)
          } else {
            console.log('✅ Including item with transcript:', {
              id: item.id,
              phone: (item as any).phone_number,
              transcriptLength: (item.transcript_text || '').length,
              formattedLength: (item.formatted_transcript_text || '').length
            })
          }
          return hasTranscript
        })
        .sort((a: CallHistoryItem, b: CallHistoryItem) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      console.log('✅ Final call history items for phone', phoneNumber, ':', historyItems.map(item => ({
        id: item.id,
        created_at: item.created_at,
        phone: (item as any).phone_number,
        hasTranscript: !!(item.transcript_text || item.formatted_transcript_text)
      })))

      // Ensure we only have transcripts for the requested phone number
      if (historyItems.length > 0) {
        console.log('🎯 Successfully loaded', historyItems.length, 'transcript(s) for phone:', phoneNumber)
      } else {
        console.log('⚠️ No transcripts found for phone:', phoneNumber)
      }

      setCallHistory(historyItems)

      // Auto-select the current lead if it exists in history
      const currentNumericId = currentLeadId.replace('call-', '')
      if (historyItems.some(item => item.id === currentNumericId)) {
        setSelectedCallId(currentNumericId)
        console.log('🎯 Auto-selected current lead:', currentNumericId)
      } else if (historyItems.length > 0) {
        setSelectedCallId(historyItems[0].id)
        console.log('🎯 Auto-selected first item:', historyItems[0].id)
      }
    } catch (error) {
      console.error('❌ Failed to load call history for phone', phoneNumber, ':', error)
      setCallHistory([])
    } finally {
      setLoading(false)
    }
  }, [phoneNumber, currentLeadId, getContractorAISpId])

  useEffect(() => {
    // Detect phone number change and clear state to prevent transcript mixing
    if (phoneNumber !== lastPhoneNumber) {
      console.log('📞 PHONE NUMBER CHANGED - Clearing transcript data to prevent mixing')
      console.log('  Previous phone:', lastPhoneNumber)
      console.log('  New phone:', phoneNumber)

      // Clear ALL transcript-related state to ensure clean slate
      setCallHistory([])
      setSelectedCallId(null)
      setIsExpanded(true)
      setLastPhoneNumber(phoneNumber)

      console.log('✅ Transcript state cleared for phone number change')
    }

    if (phoneNumber) {
      console.log('🔄 Loading call history for phone:', phoneNumber)
      loadCallHistory()
    } else {
      setLoading(false)
    }
  }, [phoneNumber, loadCallHistory, lastPhoneNumber])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const renderFormattedTranscript = (text: string, isTranslated: boolean = false) => {
    const lines = text.split('\n').filter(line => line.trim())

    // Get Spanish speaker labels
    const getDisplaySpeaker = (speaker: string): string => {
      const speakerLower = speaker.trim().toLowerCase()
      if (speakerLower.includes('contractor') || speakerLower.includes('contratista')) {
        return isTranslated || locale === 'es' ? 'Contratista' : 'Contractor'
      }
      if (speakerLower.includes('frontline') || speakerLower.includes('assistant')) {
        return 'Frontline'
      }
      if (speakerLower.includes('customer') || speakerLower.includes('client') || speakerLower.includes('cliente')) {
        return isTranslated || locale === 'es' ? 'Cliente' : 'Customer'
      }
      return speaker.trim()
    }

    return lines.map((line, index) => {
      const [speaker, ...messageParts] = line.split(':')
      const message = messageParts.join(':').trim()

      if (!message || !speaker) {
        return <div key={index} className="text-xs text-muted-foreground py-1">{line}</div>
      }

      const speakerLower = speaker.trim().toLowerCase()
      const isContractor = speakerLower.includes('contractor') || speakerLower.includes('contratista') || speakerLower.includes('frontline') || speakerLower.includes('assistant')
      const displaySpeaker = getDisplaySpeaker(speaker)

      return (
        <div
          key={index}
          className={`grid gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed md:grid-cols-[7rem_minmax(0,1fr)] ${
            isContractor
              ? 'border-blue-200/70 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20'
              : 'border-border bg-background'
          }`}
        >
          <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider ${
            isContractor ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'
          }`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${
              isContractor
                ? 'bg-[#0879c9] text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              {isContractor ? 'F' : 'C'}
            </span>
            {displaySpeaker}
          </div>
          <p className="min-w-0 text-foreground">{message}</p>
        </div>
      )
    })
  }

  const selectedCall = callHistory.find(item => item.id === selectedCallId)
  const hasTranscript = selectedCall && (selectedCall.transcript_text || selectedCall.formatted_transcript_text)

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading call history...</span>
        </div>
      </div>
    )
  }

  if (callHistory.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No call transcripts available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full border-b border-border px-5 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Call History & Transcripts</span>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {callHistory.length} {callHistory.length === 1 ? 'call' : 'calls'}
          </Badge>
          {callHistory.some(call => call.is_frontline_ai) && (
            <Badge variant="outline" className="flex items-center gap-1 rounded-full border-sky-200 bg-sky-50 text-[10px] text-sky-700">
              <Bot className="h-3 w-3" />
              Frontline
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 px-5 py-5">
          {/* Call History Dropdown */}
          <div>
            <Select
              value={selectedCallId || undefined}
              onValueChange={(value) => setSelectedCallId(value)}
            >
              <SelectTrigger className="w-full rounded-lg bg-background">
                <SelectValue>
                  {selectedCallId ? (() => {
                    const selected = callHistory.find(call => call.id === selectedCallId)
                    return selected ? formatDateTime(selected.created_at).full : 'Select a call'
                  })() : 'Select a call'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {callHistory.map((call) => {
                  const dateTime = formatDateTime(call.created_at)
                  return (
                    <SelectItem key={call.id} value={call.id}>
                      {dateTime.full}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Call Transcript */}
          {selectedCall && hasTranscript && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transcript
                </h4>
                {locale === 'es' && (
                  <button
                    onClick={() => handleTranslateTranscript(
                      selectedCall.formatted_transcript_text || selectedCall.transcript_text || ''
                    )}
                    disabled={isTranslatingTranscript}
                    className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${translatedTranscript
                      ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/30'
                      }`}
                    title={translatedTranscript ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                  >
                    {isTranslatingTranscript ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : translatedTranscript ? (
                      <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Languages className="h-4 w-4 text-white" />
                    )}
                  </button>
                )}
              </div>

              <div className="bg-muted/20 p-3 rounded-xl max-h-96 overflow-y-auto">
                {translatedTranscript ? (
                  <>
                    <div className="space-y-2">
                      {renderFormattedTranscript(translatedTranscript, true)}
                    </div>
                    <p className="text-[10px] mt-3 pt-2 border-t border-muted text-green-600 dark:text-green-400 italic text-center">
                      ✓ {tTranslation('translated')}
                    </p>
                  </>
                ) : selectedCall.formatted_transcript_text ? (
                  <div className="space-y-2">
                    {renderFormattedTranscript(selectedCall.formatted_transcript_text, false)}
                  </div>
                ) : selectedCall.transcript_text ? (
                  <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">
                    {selectedCall.transcript_text}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">No transcript available</p>
                )}
              </div>

              {/* <div className="mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {showRawTranscript ? (
                    <span>📝 Raw transcript from phone conversation with {phoneNumber}</span>
                  ) : selectedCall.formatted_transcript_text ? (
                    <span>✨ AI-formatted conversation thread with {phoneNumber}</span>
                  ) : (
                    <span>📝 Raw transcript from phone conversation with {phoneNumber}</span>
                  )}
                </div>
                <div className="mt-1 text-[10px] opacity-75">
                  Call ID: {selectedCall.id} | Lead Phone: {selectedCall.phone_number || 'N/A'}
                </div>
              </div> */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Transcript Section Component (for sidebar)
interface TranscriptSectionProps {
  transcript: string
  isFormatted?: boolean
}

function TranscriptSection({ transcript, isFormatted = false }: TranscriptSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Function to render formatted transcript as conversation
  const renderFormattedTranscript = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())

    return lines.map((line, index) => {
      const [speaker, ...messageParts] = line.split(':')
      const message = messageParts.join(':').trim()

      if (!message || !speaker) {
        return <div key={index} className="text-xs text-muted-foreground py-1">{line}</div>
      }

      const isContractor = speaker.trim().toLowerCase().includes('contractor')

      return (
        <div key={index} className={`flex mb-3 ${isContractor ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isContractor
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
            }`}>
            <div className="text-xs opacity-70 mb-1 font-medium">
              {speaker.trim()}
            </div>
            <div className="text-sm">
              {message}
            </div>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="border-t bg-background">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isFormatted ? 'Call Conversation' : 'Full Transcript'}
          </span>
          {isFormatted && (
            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
              Formatted
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-muted/30 p-3 rounded-lg max-h-60 overflow-y-auto">
            {isFormatted ? (
              <div className="space-y-2">
                {renderFormattedTranscript(transcript)}
              </div>
            ) : (
              <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">
                {transcript}
              </pre>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {isFormatted ? (
              <span>✨ AI-formatted conversation thread</span>
            ) : (
              <span>📝 Raw transcript from phone conversation</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Transcript Toggle Section Component (for main area)
interface TranscriptToggleSectionProps {
  transcript?: string
  formattedTranscript?: string
  leadId: string
  hasSummary: boolean
  messageCount: number
  onRefresh: () => void
}

function TranscriptToggleSection({
  transcript,
  formattedTranscript,
  leadId,
  hasSummary,
  messageCount,
  onRefresh
}: TranscriptToggleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use formatted transcript if available, fall back to raw transcript
  const displayTranscript = formattedTranscript || transcript
  const isFormatted = !!formattedTranscript

  // Function to render formatted transcript as conversation
  const renderFormattedTranscript = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())

    return lines.map((line, index) => {
      const [speaker, ...messageParts] = line.split(':')
      const message = messageParts.join(':').trim()

      if (!message || !speaker) {
        return <div key={index} className="text-xs text-muted-foreground py-1">{line}</div>
      }

      const isContractor = speaker.trim().toLowerCase().includes('contractor')

      return (
        <div key={index} className={`flex mb-3 ${isContractor ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isContractor
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
            }`}>
            <div className="text-xs opacity-70 mb-1 font-medium">
              {speaker.trim()}
            </div>
            <div className="text-sm">
              {message}
            </div>
          </div>
        </div>
      )
    })
  }

  // If no transcript, show minimal collapsed state only
  if (!displayTranscript) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>Transcript</span>
          <Badge variant="secondary" className="text-xs">
            Not available
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3 flex items-center justify-between hover:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {isFormatted ? 'Call Conversation' : 'Transcript'}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {displayTranscript.length} chars
          </Badge>
          {isFormatted && (
            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
              Formatted
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2">
          <div className="bg-muted/20 p-4 rounded-lg max-h-80 overflow-y-auto">
            {isFormatted ? (
              <div className="space-y-2">
                {renderFormattedTranscript(displayTranscript)}
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                {displayTranscript}
              </pre>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{isFormatted ? '✨ AI-formatted conversation thread' : '📝 Auto-generated from phone conversation'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
