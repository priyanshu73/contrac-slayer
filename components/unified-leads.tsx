"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, contractorAI } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations, useLocale } from "next-intl"
import { Search, Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Send, AlertCircle, Languages, Loader2, RotateCcw, Eye } from "lucide-react"
import { TranslatableSection } from "@/components/translate-button"

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
  
  // Project details
  project_type?: string
  service_type?: string
  description?: string
  estimated_value?: number
  
  // Conversion tracking
  converted_to_job_id?: number
  converted_to_client_id?: number
  
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
  
  // Consolidation tracking
  contractor_ai_call_lead_id?: number // Reference to consolidated call lead in contractor-ai
  _needsCallDataLoad?: boolean // Internal flag to load call data for consolidated leads
  
  source?: string
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
      
      // Stage 1: Load request leads first (fast, from ContractorBackend)
      const requestLeads = await fetchRequestLeads()
      setLeads(requestLeads)
      setLoading(false) // Show request leads immediately
      
      // Stage 2: Load call leads in lightweight mode (without transcripts)
      setLoadingCallLeads(true)
      const callLeads = await fetchCallLeads(true) // lightweight = true
      
      // Stage 3: Load conversations to get last_message_at timestamps
      const enrichedLeads = await enrichLeadsWithConversationData([...requestLeads, ...callLeads])
      
      // Combine and deduplicate by phone number (normalize for comparison)
      const normalizePhone = (phone: string | undefined) => {
        if (!phone) return ''
        // Remove all non-digits and handle +1 prefix
        const digits = phone.replace(/\D/g, '')
        // If it starts with 1 and has 11 digits, remove the leading 1
        if (digits.length === 11 && digits.startsWith('1')) {
          return digits.substring(1)
        }
        return digits
      }
      
      // Get phone numbers from consolidated request leads (those with contractor_ai_call_lead_id)
      // Normalize to E.164 format for consistent comparison
      const consolidatedPhoneNumbers = new Set<string>()
      enrichedLeads.forEach(lead => {
        if ((lead as any).contractor_ai_call_lead_id && lead.phone) {
          const normalized = normalizePhoneToE164(lead.phone)
          if (normalized) {
            consolidatedPhoneNumbers.add(normalized)
          }
        }
      })
      
      // Filter out call leads that match consolidated request leads by phone number
      // Also deduplicate call leads by normalized phone number (E.164 format)
      const seenCallPhones = new Set<string>()
      const uniqueCallLeads = enrichedLeads.filter(lead => {
        // Only filter call leads
        if (lead.type !== 'call') return true
        
        const normalized = normalizePhoneToE164(lead.phone)
        if (!normalized) return false
        
        // Skip if this phone number is already consolidated in a request lead
        if (consolidatedPhoneNumbers.has(normalized)) {
          return false
        }
        
        // Skip if we've already seen this phone number in call leads
        if (seenCallPhones.has(normalized)) {
          return false
        }
        
        seenCallPhones.add(normalized)
        return true
      })
      
      // Combine (sorting will be handled by filterLeads)
      const combined = uniqueCallLeads
      
      setLeads(combined)
      setLoadingCallLeads(false)
    } catch (err: any) {
      console.error('Failed to fetch leads:', err)
      setError(err.message || "Failed to load leads")
      setLoading(false)
      setLoadingCallLeads(false)
    }
  }

  // Enrich leads with conversation data (last_message_at timestamps)
  const enrichLeadsWithConversationData = async (leads: UnifiedLead[]): Promise<UnifiedLead[]> => {
    try {
      const spId = getContractorAISpId()
      if (!spId) return leads

      // Fetch all conversations
      const conversationsResponse = await contractorAI.getConversations({
        sp_id: spId.toString(),
        status: 'all' // Get all conversations
      })

      const conversations = (conversationsResponse as any).conversations || []
      
      // Create a map of phone number to last_message_at
      const phoneToLastMessage = new Map<string, string>()
      conversations.forEach((conv: any) => {
        const customerPhone = conv.customer?.phone_number || ''
        if (customerPhone && conv.last_message_at) {
          const normalized = normalizePhoneToE164(customerPhone)
          if (normalized) {
            // Keep the most recent message timestamp if multiple conversations exist
            const existing = phoneToLastMessage.get(normalized)
            if (!existing || new Date(conv.last_message_at) > new Date(existing)) {
              phoneToLastMessage.set(normalized, conv.last_message_at)
            }
          }
        }
      })

      // Enrich leads with last_message_at
      return leads.map(lead => {
        if (lead.phone) {
          const normalized = normalizePhoneToE164(lead.phone)
          const lastMessageAt = phoneToLastMessage.get(normalized)
          if (lastMessageAt) {
            return { ...lead, last_message_at: lastMessageAt }
          }
        }
        return lead
      })
    } catch (error) {
      console.error('Failed to enrich leads with conversation data:', error)
      // Return leads as-is if enrichment fails
      return leads
    }
  }

  const fetchRequestLeads = async (): Promise<UnifiedLead[]> => {
    try {
      // Only fetch if profile exists (should be checked before calling this)
      if (!user?.contractor_profile) {
        return []
      }
      const data = await api.getMyLeads()
      return (data as any[]).map(lead => ({
        id: `request-${lead.id}`,
        name: lead.name,
        type: 'request' as const,
        status: lead.status || 'NEW',
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        project_type: lead.project_type,
        description: lead.description,
        estimated_value: lead.estimated_value,
        converted_to_job_id: lead.converted_to_job_id,
        converted_to_client_id: lead.converted_to_client_id,
        created_at: lead.created_at,
        attachments: lead.attachments,
        source: lead.source,
        priority: lead.priority >= 8 ? 'high' : lead.priority >= 5 ? 'medium' : 'low',
        // Consolidation tracking - if this lead was consolidated with a call lead
        contractor_ai_call_lead_id: lead.contractor_ai_call_lead_id,
        _needsCallDataLoad: !!lead.contractor_ai_call_lead_id // Flag to load call data from contractor-ai
      }))
    } catch (error) {
      // Silently handle errors - profile might not exist yet or other issues
      // Don't log to console to avoid cluttering production logs
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch request leads:', error)
      }
      return []
    }
  }

  const fetchCallLeads = async (lightweight = false): Promise<UnifiedLead[]> => {
    try {
      const spId = getContractorAISpId()
      if (!spId) return []

      const response = await contractorAI.getLeads({
        sp_id: spId.toString(),
        per_page: 1000,
        lightweight: lightweight
      })

      const transformedLeads = ((response as any).leads || [])
        .filter((lead: any) => !lead.is_consolidated) // Hide consolidated call leads
        .map((lead: any) => {
          return {
            id: `call-${lead.id}`,
            name: lead.name || `Customer ${lead.phone_number?.slice(-4)}`,
            type: 'call' as const,
            status: normalizeCallStatus(lead.status),
            priority: lead.priority,
            phone: lead.phone_number,
            service_type: lead.service_type,
            description: lead.summary_text, // May be null in lightweight mode
            created_at: lead.last_contact_date,
            last_contact_date: lead.last_contact_date,
            conversation_count: lead.conversation_count || 0,
            last_message_preview: lead.last_message_preview,
            transcript_text: lead.transcript_text, // Will be null in lightweight mode
            formatted_transcript_text: lead.formatted_transcript_text, // Will be null in lightweight mode
            summary_text: lead.summary_text, // Will be null in lightweight mode
            summary_confirmed: lead.summary_confirmed,
            appointment_link_sent: lead.appointment_link_sent,
            media_uploaded: lead.media_uploaded,
            address: lead.location,
            _needsFullLoad: lightweight && !lead.summary_text // Flag to indicate we need to load full details
          }
        })
      
      return transformedLeads
    } catch (error) {
      console.error('Failed to fetch call leads:', error)
      return []
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
      
      const fullLead: UnifiedLead = {
        id: `call-${lead.id}`,
        name: lead.name || `Customer ${lead.phone_number?.slice(-4)}`,
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
        address: lead.location
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
    <div className="h-screen bg-background flex flex-col overflow-hidden pb-16 md:pb-0">
      <main className="flex-1 container mx-auto px-3 md:px-4 py-3 md:py-6 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-6 h-full">
          {/* Left Panel - Leads List */}
          <div className={`lg:col-span-1 ${selectedLead ? 'hidden lg:block' : 'block'} h-full min-h-0`}>
            <Card className="h-full flex flex-col overflow-hidden">
              {/* Search and Sort */}
              <div className="px-2 py-1.5 md:px-3 md:py-2 border-b flex-shrink-0 space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchLeads')}
                    className="pl-8 h-8 md:h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5">
                  <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'requests' | 'calls')}>
                    <SelectTrigger className="h-8 text-xs md:text-sm flex-1 min-w-0">
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
                    <SelectTrigger className="h-8 text-xs md:text-sm flex-1 min-w-0">
                      <SelectValue className="truncate">
                        {sortBy === 'date-new' ? `📅 ${tFilters('newest')}` :
                         sortBy === 'date-old' ? `📅 ${tFilters('oldest')}` :
                         sortBy === 'name-az' ? '🔤 A-Z' :
                         '🔤 Z-A'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-new">📅 {tFilters('newestFirst')}</SelectItem>
                      <SelectItem value="date-old">📅 {tFilters('oldestFirst')}</SelectItem>
                      <SelectItem value="name-az">🔤 {tFilters('nameAZ')}</SelectItem>
                      <SelectItem value="name-za">🔤 {tFilters('nameZA')}</SelectItem>
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
              <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
                {loadingCallLeads && leads.length > 0 ? (
                  // Show existing leads with skeleton for loading call leads
                  <>
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setSelectedLeadId(lead.id)
                          setHasUserClearedSelection(false)
                        }}
                        className={`cursor-pointer border-b border-border p-2.5 md:p-4 transition-colors hover:bg-secondary ${
                          selectedLeadId === lead.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="text-xs md:text-sm font-semibold">{lead.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                              <h3 className="font-semibold text-xs md:text-sm truncate flex-1 min-w-0">{lead.name}</h3>
                              {getQuoteRequestWarning(lead)}
                              <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] md:text-xs px-1 md:px-2 ${lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}`}
                                >
                                  {lead.type === 'call' ? '📞' : '📝'}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1 truncate">
                              {lead.project_type || lead.service_type || "General inquiry"}
                            </p>
                            
                            {lead.phone && (
                              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1 truncate">{lead.phone}</p>
                            )}
                            
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] md:text-xs rounded-full px-1.5 md:px-2 py-0.5 font-medium ${getStatusColor(lead.status)}`}>
                                {lead.status}
                              </span>
                              <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                                {formatTime(lead.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Skeleton for loading call leads */}
                    <div className="space-y-0">
                      <div className="border-b border-border p-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <p className="text-xs text-muted-foreground">Loading call leads...</p>
                        </div>
                      </div>
                      {[...Array(3)].map((_, i) => (
                        <div key={`skeleton-${i}`} className="border-b border-border p-4 animate-pulse">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted"></div>
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
                  filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        setHasUserClearedSelection(false)
                      }}
                      className={`cursor-pointer border-b border-border p-2.5 md:p-4 transition-colors hover:bg-secondary ${
                        selectedLeadId === lead.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="text-xs md:text-sm font-semibold">{lead.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                            <h3 className="font-semibold text-xs md:text-sm truncate flex-1 min-w-0">{lead.name}</h3>
                            {getQuoteRequestWarning(lead)}
                            <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] md:text-xs px-1 md:px-2 ${lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}`}
                              >
                                {lead.type === 'call' ? '📞' : '📝'}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1 truncate">
                            {lead.project_type || lead.service_type || "General inquiry"}
                          </p>
                          
                          {lead.phone && (
                            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1 truncate">{lead.phone}</p>
                          )}
                          
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] md:text-xs rounded-full px-1.5 md:px-2 py-0.5 font-medium ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                            <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                              {formatTime(lead.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel - Lead Details */}
          <div className={`lg:col-span-3 ${selectedLead || loadingFullLeadDetails ? 'block' : 'hidden lg:block'} h-full min-h-0`}>
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
                onRefresh={fetchAllLeads}
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
  const tLeads = useTranslations('leads')
  const tFilters = useTranslations('filters')
  const tCommon = useTranslations('common')
  const tTranslation = useTranslations('translation')
  const locale = useLocale()
  
  // Translation states for different sections
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null)
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false)
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false)
  
  // Reset translations when lead changes
  useEffect(() => {
    setTranslatedSummary(null)
    setTranslatedDescription(null)
  }, [lead.id])
  
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

  return (
    <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg">
      {/* Header */}
      <div className="p-3 md:p-6 border-b flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Back button for mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="lg:hidden shrink-0 h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-base md:text-lg font-semibold">{lead.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
              <h2 className="text-base md:text-xl font-semibold truncate">{lead.name}</h2>
              {lead.type === 'request' && (lead as any).contractor_ai_call_lead_id ? (
                <Badge 
                  variant="outline" 
                  className="text-[10px] md:text-xs px-1.5 md:px-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                >
                  📞📝 {tLeads('consolidated')}
                </Badge>
              ) : (
                <Badge 
                  variant="outline" 
                  className={`text-[10px] md:text-xs px-1.5 md:px-2 ${lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}`}
                >
                  {lead.type === 'call' ? '📞 Call' : '📝 Request'}
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {lead.project_type || lead.service_type || "General inquiry"}
            </p>
          </div>
          <Badge className={`${getStatusColor(lead.status)} text-[10px] md:text-xs px-2 md:px-3`}>
            {lead.status}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-6 overflow-y-auto lg:overflow-hidden overflow-x-hidden min-h-0 pb-20 lg:pb-0">
        {/* Show call lead layout for both call leads AND consolidated leads (request leads with call data) */}
        {(lead.type === 'call' || (lead.type === 'request' && (lead as any).contractor_ai_call_lead_id)) ? (
          <>
            {/* Lead Details - Shows first on mobile, right side on desktop */}
            <div className="order-1 lg:order-2 w-full lg:w-80 lg:overflow-y-auto overflow-x-hidden space-y-4 md:space-y-6 p-3 md:p-6 min-h-0 lg:min-h-full overscroll-contain lg:max-h-full">
              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                  {tLeads('contactInformation')}
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {lead.phone && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs md:text-sm flex-1 min-w-0 truncate">{lead.phone}</span>
                      <Button size="sm" variant="outline" asChild className="ml-auto h-7 md:h-9 text-xs md:text-sm px-2 md:px-3 shrink-0">
                        <a href={`tel:${lead.phone}`}>{tCommon('call')}</a>
                      </Button>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${lead.email}`} className="text-xs md:text-sm hover:underline truncate">{lead.email}</a>
                    </div>
                  )}
                  {lead.address && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs md:text-sm flex-1 min-w-0 break-words">{lead.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 md:gap-3">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm">{formatTime(lead.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* AI Summary from contractor-ai (for call leads and consolidated leads) */}
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
                        className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${
                          translatedSummary 
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

              {/* Project Description from quote request (for consolidated leads) */}
              {lead.description && lead.type === 'request' && (lead as any).contractor_ai_call_lead_id && (
                <div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className="shrink-0">{tLeads('projectDescription')}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                      {tLeads('fromQuoteRequest')}
                    </Badge>
                    {locale === 'es' && (
                      <button
                        onClick={() => handleTranslate(
                          lead.description!,
                          setTranslatedDescription,
                          setIsTranslatingDescription,
                          !!translatedDescription
                        )}
                        disabled={isTranslatingDescription}
                        className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${
                          translatedDescription 
                            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/30'
                        }`}
                        title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                      >
                        {isTranslatingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : translatedDescription ? (
                          <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Languages className="h-4 w-4 text-white" />
                        )}
                      </button>
                    )}
                  </h3>
                  <div className="p-2.5 md:p-4 rounded-lg bg-muted/30 border">
                    <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                      {translatedDescription || lead.description}
                    </p>
                    {translatedDescription && (
                      <p className="text-[10px] mt-2 text-purple-600 dark:text-purple-400 italic">
                        {tTranslation('translated')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Project Description for call-only leads (fallback) */}
              {lead.description && lead.type === 'call' && !lead.summary_text && (
                <div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className="shrink-0">{tLeads('projectDescription')}</span>
                    {locale === 'es' && (
                      <button
                        onClick={() => handleTranslate(
                          lead.description!,
                          setTranslatedDescription,
                          setIsTranslatingDescription,
                          !!translatedDescription
                        )}
                        disabled={isTranslatingDescription}
                        className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${
                          translatedDescription 
                            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/30'
                        }`}
                        title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                      >
                        {isTranslatingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : translatedDescription ? (
                          <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Languages className="h-4 w-4 text-white" />
                        )}
                      </button>
                    )}
                  </h3>
                  <div className="p-2.5 md:p-4 rounded-lg bg-muted/30 border">
                    <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                      {translatedDescription || lead.description}
                    </p>
                    {translatedDescription && (
                      <p className="text-[10px] mt-2 text-muted-foreground italic">
                        {tTranslation('translated')}
                      </p>
                    )}
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

              {/* Call History Section (for call leads and consolidated leads) */}
              <CallHistorySection phoneNumber={normalizePhoneToE164(lead.phone)} currentLeadId={String(lead.id)} />

              {/* Action Buttons */}
              <div className="pt-2 md:pt-4 border-t space-y-2 md:space-y-3">
                <Button className="w-full h-10 md:h-12 text-sm md:text-base" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    {tLeads('callCustomer')}
                  </a>
                </Button>
                <Button variant="outline" className="w-full h-9 md:h-11 text-xs md:text-sm" asChild>
                  <a href={`/quotes/new?leadId=${lead.id}`}>
                    <Eye className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                    {tFilters('quoted')}
                  </a>
                </Button>
              </div>
            </div>

            {/* Conversation History - Shows second on mobile, middle on desktop */}
            <div className="order-2 lg:order-1 flex-1 border-t lg:border-t-0 lg:border-r bg-muted/10 flex flex-col min-h-0">
              <div className="p-3 md:p-4 border-b bg-background flex-shrink-0">
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                  {tLeads('conversationHistory')}
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground">{tLeads('liveChatMessages')}</p>
              </div>
              
              <div className="flex-1 lg:overflow-y-auto min-h-[300px] lg:min-h-0 lg:max-h-full overscroll-contain">
                <ConversationMessages phoneNumber={normalizePhoneToE164(lead.phone)} />
              </div>
            </div>
          </>
        ) : (
          /* Left Side - Lead Details (for request leads) */
          <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 p-3 md:p-6 min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
            {/* Contact Information */}
            <div>
              <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                {tLeads('contactInformation')}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {lead.phone && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm flex-1 min-w-0 truncate">{lead.phone}</span>
                    <Button size="sm" variant="outline" asChild className="ml-auto h-7 md:h-9 text-xs md:text-sm px-2 md:px-3 shrink-0">
                      <a href={`tel:${lead.phone}`}>{tCommon('call')}</a>
                    </Button>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-xs md:text-sm hover:underline truncate">{lead.email}</a>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm flex-1 min-w-0 break-words">{lead.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 md:gap-3">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs md:text-sm">{formatTime(lead.created_at)}</span>
                </div>
              </div>
            </div>

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
                      className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${
                        translatedSummary 
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

            {/* Project Description from quote request */}
            {lead.description && (
              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="shrink-0">{tLeads('projectDescription')}</span>
                  {lead.type === 'request' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                      {tLeads('fromQuoteRequest')}
                    </Badge>
                  )}
                  {locale === 'es' && (
                    <button
                      onClick={() => handleTranslate(
                        lead.description!,
                        setTranslatedDescription,
                        setIsTranslatingDescription,
                        !!translatedDescription
                      )}
                      disabled={isTranslatingDescription}
                      className={`ml-auto p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md shrink-0 ${
                        translatedDescription 
                          ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/30'
                      }`}
                      title={translatedDescription ? tTranslation('showOriginal') : tTranslation('translateToSpanish')}
                    >
                      {isTranslatingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : translatedDescription ? (
                        <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Languages className="h-4 w-4 text-white" />
                      )}
                    </button>
                  )}
                </h3>
                <div className="p-2.5 md:p-4 rounded-lg bg-muted/50">
                  <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                    {translatedDescription || lead.description}
                  </p>
                  {translatedDescription && (
                    <p className="text-[10px] mt-2 text-purple-600 dark:text-purple-400 italic">
                      {tTranslation('translated')}
                    </p>
                  )}
                </div>
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

            {/* Call History with Transcripts (for consolidated leads) */}
            {(lead as any).contractor_ai_call_lead_id && lead.phone && (
              <>
                <CallHistorySection 
                  key={`call-history-consolidated-${lead.phone}-${lead.id}`} 
                  phoneNumber={normalizePhoneToE164(lead.phone)} 
                  currentLeadId={lead.id} 
                />

                {/* Mobile Conversation View (for consolidated leads) */}
                <div className="lg:hidden">
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                    {tLeads('conversationHistory')}
                  </h3>
                  <Card className="max-h-64 overflow-hidden">
                    <ConversationMessages phoneNumber={normalizePhoneToE164(lead.phone)} />
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 md:p-6 border-t bg-muted/20 flex-shrink-0">
        <div className="flex gap-2 md:gap-3">
          {lead.phone && (
            <Button variant="default" asChild className="flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={`tel:${lead.phone}`}>
                <Phone className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                {tLeads('callCustomer')}
              </a>
            </Button>
          )}
          {/* Check if lead has been quoted and has a valid job ID */}
          {(lead.status === 'QUOTED' || lead.converted_to_job_id) && lead.converted_to_job_id ? (
            <Button variant="outline" asChild className="flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={`/quotes/${lead.converted_to_job_id}`}>
                <svg className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {tFilters('quoted')}
              </a>
            </Button>
          ) : (
            <Button variant="outline" asChild className="flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={
                lead.type === 'request' 
                  ? `/quotes/new?leadId=${lead.id.replace('request-', '')}`
                  : `/quotes/new?callLeadId=${lead.id.replace('call-', '')}${lead.phone ? `&phone=${encodeURIComponent(lead.phone)}` : ''}`
              }>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tLeads('createQuote')}
              </a>
            </Button>
          )}
          {lead.status === 'NEW' && (
            <Button 
              variant="outline"
              onClick={() => {
                console.log('Mark as contacted:', lead.id)
              }}
              className="flex-1 h-9 md:h-10 text-xs md:text-sm"
            >
              <svg className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {tLeads('markAsContacted')}
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
      <div className="p-4 space-y-3">
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
      <div className="p-4 text-center text-destructive text-sm">
        {error}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
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
        <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {allTranslated ? `✓ ${tTranslation('translated')}` : `${messages.length} mensajes`}
          </span>
          <button
            onClick={handleTranslateAll}
            disabled={isTranslatingAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
              allTranslated 
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
      
      {/* Messages List */}
      <div className="flex-1 space-y-3 p-4 overflow-y-auto">
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
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isServiceProvider
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {/* Sender Label */}
                <div className={`text-[10px] mb-1 font-medium ${
                  isServiceProvider 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}>
                  {getSenderLabel(msg.sender_type)}
                </div>
                
                {/* Message Text */}
                <p className="text-sm whitespace-pre-wrap">{displayText}</p>
                
                {/* Timestamp and Status */}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <p className={`text-[10px] ${
                    isServiceProvider 
                      ? 'text-primary-foreground/60' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                  <div className="flex items-center gap-1">
                    {isTranslated && (
                      <span className={`text-[10px] italic ${
                        isServiceProvider 
                          ? 'text-primary-foreground/50' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        ✓ {locale === 'es' ? 'traducido' : 'translated'}
                      </span>
                    )}
                    {msg.status && isServiceProvider && (
                      <span className={`text-[10px] ${
                        msg.status === 'delivered' ? 'text-primary-foreground/70' :
                        msg.status === 'failed' ? 'text-red-300' :
                        'text-primary-foreground/50'
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
}

function CallHistorySection({ phoneNumber, currentLeadId }: CallHistorySectionProps) {
  const { getContractorAISpId } = useAuth()
  const locale = useLocale()
  const tTranslation = useTranslations('translation')
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
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
            phone_number: lead.phone_number // Keep phone number for verification
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
      setIsExpanded(false)
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
      const isContractor = speakerLower.includes('contractor') || speakerLower.includes('contratista')
      const displaySpeaker = getDisplaySpeaker(speaker)
      
      return (
        <div key={index} className={`flex mb-3 ${isContractor ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isContractor 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-foreground'
          }`}>
            <div className={`text-[10px] mb-1 font-medium ${
              isContractor ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {displaySpeaker}
            </div>
            <div className="text-sm">
              {message}
            </div>
          </div>
        </div>
      )
    })
  }

  const selectedCall = callHistory.find(item => item.id === selectedCallId)
  const hasTranscript = selectedCall && (selectedCall.transcript_text || selectedCall.formatted_transcript_text)

  if (loading) {
    return (
      <div className="border-t bg-background">
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading call history...</span>
        </div>
      </div>
    )
  }

  if (callHistory.length === 0) {
    return (
      <div className="border-t bg-background">
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No call transcripts available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t bg-background">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Call History & Transcripts</span>
          <Badge variant="secondary" className="text-xs">
            {callHistory.length} {callHistory.length === 1 ? 'call' : 'calls'}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Call History Dropdown */}
          <div>
            <Select
              value={selectedCallId || undefined}
              onValueChange={(value) => setSelectedCallId(value)}
            >
              <SelectTrigger className="w-full">
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
                    className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                      translatedTranscript 
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
              
              <div className="bg-muted/30 p-3 rounded-lg max-h-96 overflow-y-auto">
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
          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isContractor 
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
          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isContractor 
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
