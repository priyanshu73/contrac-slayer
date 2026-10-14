"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { Search, Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, ChevronDown, AlertCircle, Languages, Loader2, RotateCcw, Menu, Inbox, Filter, ArrowUpDown, Link2, Sparkles, Plus, Eye, FolderOpen, FileText, User as UserIcon } from "lucide-react"
import { PropertyInsightsCard } from "@/components/property-insights-card"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { NewQuoteDialog } from "@/components/quotes/new-quote-dialog"
import { setQuotePrefill } from "@/lib/quote-prefill"
import { callSummaryToDescription, stripMarkdownBold } from "@/lib/call-summary"
import { SaveClientFromLeadDialog, type SaveClientAction } from "@/components/clients/save-client-from-lead-dialog"
import { parseApiUtcDate } from "@/lib/frontline-datetime"
import { formatProjectType, isUsableProjectType } from "@/lib/project-type"
import { ContactSendEmailTrigger } from "@/components/contact-send-email-dialog"
import { isFrontlineVoiceLead, isQuoteRequestLead, normalizeLeadLabel, normalizePhoneToE164, translateWithCache, type LeadSourceCheck } from "@/lib/lead-core"
import { ConversationMessages, CallHistorySection } from "@/components/unified-leads-conversation"
import { buildFooterFacts, buildSummaryTitle, formatLeadAge, getLeadSourceLabelKey, intlLocale, leadStatusLabel, type LeadT } from "@/lib/lead-labels"


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
  consolidation_status?: 'both' | 'call_only' | 'form_only' | string
  contractor_ai_call_lead_id?: number // Reference to consolidated call lead in contractor-ai
  interaction_id?: string
  interaction_type?: 'phone_call' | 'frontline_voice' | string
  is_frontline_ai?: boolean
  has_sms?: boolean // Lead also has an inbound SMS thread (text-first or follow-up texts)
  _needsCallDataLoad?: boolean // Internal flag to load call data for consolidated leads

  // Multiple form submissions for same phone
  quote_requests?: Array<{
    id: number
    project_type?: string
    description?: string
    created_at?: string
    quote_public_url?: string
    converted_to_job_id?: number
  }>

  source?: string
}


function getLeadSourceLabel(lead: LeadSourceCheck, t: LeadT): string {
  return t(getLeadSourceLabelKey(isFrontlineVoiceLead(lead), lead))
}

function getLeadProjectLabel(value?: string | null, fallback?: string | null): string | null {
  const cleanValue = value && isUsableProjectType(value) ? formatProjectType(value) : null
  if (cleanValue) return cleanValue
  const cleanFallback = fallback && isUsableProjectType(fallback) ? formatProjectType(fallback) : null
  if (cleanFallback) return cleanFallback
  return null
}

// Drops a redundant "<Name> called regarding/about …" lead-in since the title already carries who + what.
const cleanNarrative = (text: string): string => {
  const introRe = /^\s*[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]+){0,2}\s+(?:called|phoned|reached out|contacted us|got in touch)\s+(?:regarding|about|concerning|to discuss|to ask about|asking about|to inquire about)\s+/
  const stripped = text.replace(introRe, '').trimStart()
  if (!stripped || stripped === text.trimStart()) return text
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

const formatBrowserPhoneTime = (locale: string): string => {
  return new Intl.DateTimeFormat(intlLocale(locale), {
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
  const locale = useLocale()
  const tLeadsRef = useRef(tLeads)
  tLeadsRef.current = tLeads

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
        const isFrontlineVoice = isFrontlineVoiceLead(lead)
        const callInteractionId = lead.interaction_id || lead.contractor_ai_customer_id

        return {
          id: isCallOnly ? `call-${callInteractionId}` : `request-${lead.id}`,
          name: lead.name || (isCallOnly ? tLeadsRef.current('unified.customerLast4', { last4: lead.phone?.slice(-4) ?? '' }) : tLeadsRef.current('unified.unknown')),
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
          contractor_ai_call_lead_id: lead.contractor_ai_customer_id || lead.contractor_ai_call_lead_id,
          converted_to_job_id: lead.converted_to_job_id,
          converted_to_client_id: lead.converted_to_client_id,
          converted_to_project_id: lead.converted_to_project_id,
          quote_public_link: lead.quote_public_link,
          quote_public_url: lead.quote_public_url,
          interaction_id: callInteractionId,
          interaction_type: lead.interaction_type,
          is_frontline_ai: isFrontlineVoice,
          has_sms: lead.has_sms,
          source: lead.source,
          consolidation_status: lead.consolidation_status,
          quote_requests: lead.quote_requests || [],
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
      setError(err.message || tLeadsRef.current('unified.loadFailed'))
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
        name: currentLead?.name || lead.name || tLeadsRef.current('unified.customerLast4', { last4: lead.phone_number?.slice(-4) ?? '' }),
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
    return new Date(Math.max(...timestamps.map(ts => (parseApiUtcDate(ts)?.getTime() ?? 0))))
  }

  const filterLeads = () => {
    let filtered = leads

    // Filter by tab
    if (activeTab === 'requests') {
      filtered = filtered.filter(lead => isQuoteRequestLead(lead))
    } else if (activeTab === 'calls') {
      filtered = filtered.filter(lead => isFrontlineVoiceLead(lead))
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
        getLeadSourceLabel(lead, tLeads).toLowerCase().includes(searchLower) ||
        (isQuoteRequestLead(lead) && 'request'.includes(searchLower)) ||
        (isFrontlineVoiceLead(lead) && 'frontline voice'.includes(searchLower)) ||
        (isUsableProjectType(lead.project_type ?? undefined) && lead.project_type?.toLowerCase().includes(searchLower)) ||
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
      requests: leads.filter(l => isQuoteRequestLead(l)).length,
      calls: leads.filter(l => isFrontlineVoiceLead(l)).length,
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
    const date = parseApiUtcDate(dateString)
    if (!date) return ""
    return formatLeadAge(date, tLeads)
  }

  const getQuoteRequestWarning = (lead: UnifiedLead) => {
    // Show warning if quote request hasn't been sent
    // A quote has been sent if status is QUOTED or if there's a converted_to_job_id
    const hasQuoteBeenSent = lead.status === 'QUOTED' || lead.converted_to_job_id

    if (!hasQuoteBeenSent) {
      return (
        <div title={tLeads('unified.estimateNotSent')}>
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

  const renderLeadRow = (lead: UnifiedLead) => {
    const active = selectedLeadId === lead.id
    const isFrontlineVoice = isFrontlineVoiceLead(lead)
    const hasQuoteRequest = isQuoteRequestLead(lead)
    const sourceLabel = getLeadSourceLabel(lead, tLeads)
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
                : isFrontlineVoice
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
            {lead.phone ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatPhoneForDisplay(lead.phone)}
              </p>
            ) : lead.email ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lead.email}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {lead.status && normalizeLeadLabel(lead.status) !== 'converted' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 ${getStatusColor(lead.status)} border-current/20`}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {leadStatusLabel(lead.status, tLeads)}
                </span>
              )}
              {isFrontlineVoice && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  {tLeads('unified.source.frontlineVoice')}
                </span>
              )}
              {hasQuoteRequest && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 border-border bg-background text-muted-foreground">
                  <FileText className="h-2.5 w-2.5" />
                  {tLeads('unified.source.request')}
                </span>
              )}
              {!isFrontlineVoice && !hasQuoteRequest && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 border-border bg-background text-muted-foreground">
                  <Link2 className="h-2.5 w-2.5" />
                  {sourceLabel}
                </span>
              )}
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
          <p className="mt-4 text-sm font-medium text-blue-600 text-center animate-pulse">{tLeads('unified.loadingRequests')}</p>
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
                      <p className="text-sm font-semibold text-foreground">{tLeads('unified.inbox')}</p>
                      <p className="text-[11px] text-muted-foreground">{tLeads('unified.activeLeads', { count: counts.all })}</p>
                    </div>
                  </div>
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
                          <p className="text-xs text-muted-foreground">{tLeads('unified.loadingCalls')}</p>
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
                      {searchTerm ? tLeads('unified.empty.noMatch') : tLeads('unified.empty.none')}
                    </h3>
                    <p className="text-sm mb-4">
                      {searchTerm ? tLeads('unified.empty.noMatchHint') : tLeads('unified.empty.noneHint')}
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
                  <p className="text-sm text-muted-foreground">{tLeads('unified.loadingDetails')}</p>
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
                  <h3 className="text-lg font-semibold mb-2">{tLeads('unified.selectLead')}</h3>
                  <p className="text-sm">{tLeads('unified.selectLeadHint')}</p>
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
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [quoteClientId, setQuoteClientId] = useState<number | null>(null)
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
    setQuoteDialogOpen(false)
    setQuoteClientId(null)
    setSaveAction(null)
    setSaveClientOpen(false)
    setOpenPortalAfterSave(false)
    setClientPortalToken(null)
    setOpeningClientPortal(false)
  }, [lead.converted_to_client_id, lead.id])

  useEffect(() => {
    const updatePhoneClock = () => setPhoneClock(formatBrowserPhoneTime(locale))
    updatePhoneClock()

    const interval = window.setInterval(updatePhoneClock, 30_000)
    return () => window.clearInterval(interval)
  }, [locale])

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
    const date = parseApiUtcDate(dateString)
    if (!date) return ""
    return formatLeadAge(date, tLeads)
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

  const isFrontlineVoice = isFrontlineVoiceLead(lead)
  const hasQuoteRequest = isQuoteRequestLead(lead)
  const sourceLabel = getLeadSourceLabel(lead, tLeads)
  const isCallOrMessagesLead = lead.type === 'call' || !!(lead as any).contractor_ai_call_lead_id || isFrontlineVoice
  const projectTypeLabel = getLeadProjectLabel(lead.project_type, lead.service_type)
  const quoteHref = lead.converted_to_job_id ? `/quotes/${lead.converted_to_job_id}` : null
  const requestLeadId = lead.id.startsWith('request-') ? Number(lead.id.replace('request-', '')) : null
  // Call-only leads expose the raw call summary as `description`; clean that
  // narration before handing it to the review/refinement dialog. Consolidated
  // quote-request leads keep their separately submitted description.
  const descriptionForPrefill = lead.type === 'call' || lead.is_frontline_ai
    ? callSummaryToDescription(lead.summary_text || lead.description)
    : lead.description || callSummaryToDescription(lead.summary_text)

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
      toast({ title: tLeads('unified.toast.clientSaved') })
      router.push(`/${locale}/clients/${clientId}`)
      return
    }
    if (action === "quote") {
      // Open the context modal (mirrors the project flow) instead of dropping into a
      // blank builder; the dialog hands the reviewed scope off to /quotes/new.
      setQuoteClientId(clientId)
      setQuoteDialogOpen(true)
      return
    }
    setProjectDialogOpen(true)
  }, [locale, router, toast, tLeads])

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
        title: tLeads('unified.toast.saveClientFailed'),
        description: error?.message || tLeads('unified.toast.tryAgain'),
        variant: "destructive",
      })
    } finally {
      setSaveAction(null)
    }
  }, [routeAfterClient, toast, tryRecoverExistingClient, tLeads])

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
        title: tLeads('unified.toast.portalFailed'),
        description: error?.message || tLeads('unified.toast.tryAgain'),
        variant: "destructive",
      })
    } finally {
      setOpeningClientPortal(false)
    }
  }, [launchClientPortal, toast, tryRecoverExistingClient, tLeads])

  const saveClientMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default" className="h-9 w-full rounded-lg px-3 text-sm justify-between" disabled={saveAction !== null}>
          <span className="inline-flex items-center">
            {saveAction ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {tLeads('unified.actions.saveLead')}
          </span>
          <ChevronDown className="h-3.5 w-3.5 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuItem className="items-start py-3 px-3 rounded-md" onSelect={() => void handleSaveClientAction("project")}>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">{tLeads('unified.actions.createProject')}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {tLeads('unified.actions.recommended')}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-3 px-3 rounded-md text-sm font-medium" onSelect={() => void handleSaveClientAction("quote")}>
          {tLeads('createQuote')}
        </DropdownMenuItem>
        <DropdownMenuItem className="py-3 px-3 rounded-md text-sm font-medium" onSelect={() => void handleSaveClientAction("client")}>
          {tLeads('unified.actions.createClient')}
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
        setQuoteClientId(convertedClientId)
        setQuoteDialogOpen(true)
        break
    }
  }

  const convertedMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default" className="h-9 w-full rounded-lg px-3 text-sm justify-between">
          <span className="inline-flex items-center">
            <Eye className="h-3.5 w-3.5 mr-1" />
            {tLeads('unified.actions.view')}
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
          {tLeads('unified.actions.viewClient')}
        </DropdownMenuItem>
        {convertedProjectId ? (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium"
            onSelect={() => handleConvertedAction("view-project")}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            {tLeads('unified.actions.viewProject')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium text-muted-foreground"
            onSelect={() => handleConvertedAction("create-project")}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            {tLeads('unified.actions.createProject')}
          </DropdownMenuItem>
        )}
        {convertedJobId ? (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium"
            onSelect={() => handleConvertedAction("view-quote")}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {tLeads('unified.actions.viewEstimate')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="py-3 px-3 rounded-md text-sm font-medium text-muted-foreground"
            onSelect={() => handleConvertedAction("create-quote")}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {tLeads('createQuote')}
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
              {leadStatusLabel(lead.status, tLeads)}
            </span>
            {isFrontlineVoice && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                <Sparkles className="h-2.5 w-2.5" />
                {tLeads('unified.source.frontlineVoice')}
              </span>
            )}
            {hasQuoteRequest && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 border-border bg-background text-muted-foreground">
                <FileText className="h-2.5 w-2.5" />
                {tLeads('unified.source.request')}
              </span>
            )}
            {!isFrontlineVoice && !hasQuoteRequest && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 border-border bg-background text-muted-foreground">
                <Link2 className="h-2.5 w-2.5" />
                {sourceLabel}
              </span>
            )}
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
              {tLeads('unified.actions.clientPortal')}
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
        {/* Show call lead layout for call leads, legacy-consolidated leads, and Frontline-enriched form leads */}
        {(lead.type === 'call' || (lead.type === 'request' && ((lead as any).contractor_ai_call_lead_id || isFrontlineVoice))) ? (
          <>
            {/* Conversation History - On mobile: only content, full height; minimal gap below header */}
            <div className={`order-1 lg:order-1 flex flex-col min-h-0 overflow-hidden ${isMobile ? 'flex-1 bg-background' : 'flex-shrink-0 lg:w-[350px] xl:w-[370px] bg-muted/20'}`}>
              {/* Phone mockup — SMS thread only */}
              <div className={`flex flex-col items-center justify-center ${isMobile ? 'flex-1 min-h-0 px-0 pt-1 pb-0 overflow-hidden' : 'px-5 py-5 lg:px-6 lg:py-7'}`}>
                <div className="hidden w-full max-w-[300px] pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">
                  {tLeads('unified.liveConversation')}
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
                  {tLeads('unified.smsMirror')}
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
                  title={tLeads('propertyInsights')}
                />
              )}

              {/* AI Summary from contractor-ai (for call leads and consolidated leads) */}
              {lead.summary_text && (() => {
                const SUMMARY_CAP = 360
                const rawSummary = cleanNarrative(stripMarkdownBold(translatedSummary || lead.summary_text))
                const isLong = rawSummary.length > SUMMARY_CAP
                const displaySummary = isLong && !summaryCardExpanded
                  ? rawSummary.slice(0, SUMMARY_CAP).trimEnd() + '…'
                  : rawSummary
                const footerFacts = buildFooterFacts(lead, lead.summary_text, tLeads)
                const summaryTitle = buildSummaryTitle(lead, lead.summary_text, tLeads)
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
                        {tLeads('unified.generatedFromCall')}
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
                    {isLong && (
                      <button
                        onClick={() => setSummaryCardExpanded(v => !v)}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                      >
                        {summaryCardExpanded ? tLeads('unified.showLess') : tLeads('unified.showMore')}
                      </button>
                    )}
                    {footerFacts.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-border pt-4">
                        {footerFacts.map((fact) => (
                          <div key={fact.label} className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{fact.label}</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-foreground break-words">{fact.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {translatedSummary && (
                      <p className="text-[10px] mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                    )}
                  </div>
                )
              })()}

              {/* Quote Request card (for consolidated + Frontline-enriched form leads) */}
              {lead.type === 'request' && ((lead as any).contractor_ai_call_lead_id || isFrontlineVoice) && (lead.description || projectTypeLabel) && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-card overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 dark:bg-amber-900/40 shrink-0">
                        <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-amber-600/80 dark:text-amber-400/80 leading-none mb-1">
                          {tLeads('unified.estimateRequest')}
                        </p>
                        {projectTypeLabel && (
                          <p className="text-[15px] font-semibold tracking-tight text-foreground leading-tight truncate">
                            {projectTypeLabel.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {requestLeadId && (
                      <a
                        href={`/${locale}/leads/${requestLeadId}`}
                        className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 shrink-0"
                      >
                        View full request ↗
                      </a>
                    )}
                  </div>
                  {/* Description */}
                  {lead.description && (
                    <div className="px-5 py-4 flex items-start gap-2">
                      <p className="text-[13px] text-foreground/65 leading-[1.65] whitespace-pre-wrap break-words flex-1 min-w-0">
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
                  )}
                  {translatedDescription && (
                    <p className="text-[10px] px-5 pb-3 -mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                  )}
                </div>
              )}

              {/* Additional quote requests (same phone, multiple form submissions) */}
              {lead.quote_requests && lead.quote_requests.length > 0 && lead.quote_requests.map((qr) => (
                <div key={qr.id} className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-card overflow-hidden shadow-sm opacity-80">
                  <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-50/40 dark:bg-amber-950/15 border-b border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 dark:bg-amber-900/40 shrink-0">
                        <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-amber-600/80 dark:text-amber-400/80 leading-none mb-1">
                          {qr.created_at ? tLeads('unified.previousEstimateRequestDated', { date: parseApiUtcDate(qr.created_at)?.toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' }) ?? '' }) : tLeads('unified.previousEstimateRequest')}
                        </p>
                        {getLeadProjectLabel(qr.project_type) && (
                          <p className="text-sm font-semibold tracking-tight text-foreground leading-tight truncate">
                            {getLeadProjectLabel(qr.project_type)!.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {qr.id && (
                      <a href={`/${locale}/leads/${qr.id}`} className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 shrink-0">
                        View ↗
                      </a>
                    )}
                  </div>
                  {qr.description && (
                    <div className="px-5 py-3">
                      <p className="text-[13px] text-foreground/60 leading-[1.6] whitespace-pre-wrap break-words">
                        {qr.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}

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
                          {item.type === 'dimensions' ? tLeads('unified.measure.dimensions') : item.type === 'square_footage' ? tLeads('unified.measure.area') : tLeads('unified.measure.linear')}
                        </span>

                        <p className="text-xs md:text-sm font-medium mb-1 pr-12">{item.name || tLeads('unified.measure.fallback')}</p>

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
                    ${lead.estimated_value.toLocaleString(intlLocale(locale))}
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
                              <dt className="sr-only">{tLeads('unified.contact.phone')}</dt>
                              <dd className="flex-1 min-w-0 truncate tabular-nums text-foreground">{formatPhoneForDisplay(lead.phone)}</dd>
                              <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs shrink-0">
                                <a href={`tel:${lead.phone}`} aria-label={tCommon('call')}>{tCommon('call')}</a>
                              </Button>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              <dt className="sr-only">{tLeads('unified.contact.email')}</dt>
                              <dd className="min-w-0 truncate">
                                <ContactSendEmailTrigger to={lead.email} recipientName={lead.name}>
                                  {(openEmail) => (
                                    <button type="button" onClick={openEmail} className="text-foreground hover:underline text-left">{lead.email}</button>
                                  )}
                                </ContactSendEmailTrigger>
                              </dd>
                            </div>
                          )}
                          {lead.address ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                              <dt className="sr-only">{tLeads('unified.contact.address')}</dt>
                              <dd className="min-w-0 break-words text-foreground">
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" className="hover:underline">{lead.address}</a>
                              </dd>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              <dd className="text-muted-foreground italic">{tLeads('unified.contact.noAddress')}</dd>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                            <dt className="sr-only">{tLeads('unified.contact.submitted')}</dt>
                            <dd className="text-muted-foreground text-xs">{formatTime(lead.created_at)}</dd>
                          </div>
                        </dl>
                      </div>
                    </Card>
                    {lead.summary_text && (() => {
                      const SUMMARY_CAP = 320
                      const rawSummary = cleanNarrative(stripMarkdownBold(translatedSummary || lead.summary_text))
                      const isLong = rawSummary.length > SUMMARY_CAP
                      const displaySummary = isLong && !summaryCardExpanded
                        ? rawSummary.slice(0, SUMMARY_CAP).trimEnd() + '…'
                        : rawSummary
                      const footerFacts = buildFooterFacts(lead, lead.summary_text, tLeads)
                      const summaryTitle = buildSummaryTitle(lead, lead.summary_text, tLeads)
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
                        {isLong && (
                          <button
                            onClick={() => setSummaryCardExpanded(v => !v)}
                            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                          >
                            {summaryCardExpanded ? tLeads('unified.showLess') : tLeads('unified.showMore')}
                          </button>
                        )}
                        {footerFacts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-3">
                            {footerFacts.map((fact) => (
                              <div key={fact.label} className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{fact.label}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground break-words">{fact.value}</p>
                              </div>
                            ))}
                          </div>
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
                      <dt className="sr-only">{tLeads('unified.contact.phone')}</dt>
                      <dd className="flex-1 min-w-0 truncate tabular-nums text-foreground">{formatPhoneForDisplay(lead.phone)}</dd>
                      <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs shrink-0">
                        <a href={`tel:${lead.phone}`} aria-label={tCommon('call')}>{tCommon('call')}</a>
                      </Button>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <dt className="sr-only">{tLeads('unified.contact.email')}</dt>
                      <dd className="min-w-0 truncate">
                        <ContactSendEmailTrigger to={lead.email} recipientName={lead.name}>
                          {(openEmail) => (
                            <button type="button" onClick={openEmail} className="text-foreground hover:underline text-left">{lead.email}</button>
                          )}
                        </ContactSendEmailTrigger>
                      </dd>
                    </div>
                  )}
                  {lead.address ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                      <dt className="sr-only">{tLeads('unified.contact.address')}</dt>
                      <dd className="min-w-0 break-words text-foreground">
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" className="hover:underline">{lead.address}</a>
                      </dd>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <dd className="text-muted-foreground italic">{tLeads('unified.contact.noAddress')}</dd>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    <dt className="sr-only">{tLeads('unified.contact.submitted')}</dt>
                    <dd className="text-muted-foreground text-xs">{formatTime(lead.created_at)}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Property insights (when normalized address is available) - request-only layout */}
            {(lead as any).address_data?.id && (
              <PropertyInsightsCard
                addressId={(lead as any).address_data.id}
                title={tLeads('propertyInsights')}
              />
            )}

            {/* AI Summary from contractor-ai (for consolidated leads).
                For quote-request leads the summary duplicates the project description below,
                so only show it when the lead also has call data and the text actually differs. */}
            {lead.summary_text && (lead as any).contractor_ai_call_lead_id &&
              lead.summary_text.trim() !== (lead.description || "").trim() && (
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

            {/* Quote Request card — all form leads */}
            {lead.type === 'request' && (lead.description || projectTypeLabel) && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-card overflow-hidden shadow-sm">
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-800/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 dark:bg-amber-900/40 shrink-0">
                      <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-amber-600/80 dark:text-amber-400/80 leading-none mb-1">
                        {tLeads('unified.estimateRequest')}
                      </p>
                      {projectTypeLabel && (
                        <p className="text-[15px] font-semibold tracking-tight text-foreground leading-tight truncate">
                          {projectTypeLabel.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {requestLeadId && (
                    <a
                      href={`/${locale}/leads/${requestLeadId}`}
                      className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 shrink-0"
                    >
                      View full request ↗
                    </a>
                  )}
                </div>
                {lead.description && (
                  <div className="px-5 py-4 flex items-start gap-2">
                    <p className="text-[13px] text-foreground/65 leading-[1.65] whitespace-pre-wrap break-words flex-1 min-w-0">
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
                )}
                {translatedDescription && (
                  <p className="text-[10px] px-5 pb-3 -mt-2 text-muted-foreground italic">{tTranslation('translated')}</p>
                )}
              </div>
            )}

            {/* Additional quote requests from the same phone */}
            {lead.quote_requests && lead.quote_requests.length > 0 && lead.quote_requests.map((qr) => (
              <div key={qr.id} className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-card overflow-hidden shadow-sm opacity-80">
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-50/40 dark:bg-amber-950/15 border-b border-amber-100 dark:border-amber-800/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 dark:bg-amber-900/40 shrink-0">
                      <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-amber-600/80 dark:text-amber-400/80 leading-none mb-1">
                        {qr.created_at ? tLeads('unified.previousEstimateRequestDated', { date: parseApiUtcDate(qr.created_at)?.toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' }) ?? '' }) : tLeads('unified.previousEstimateRequest')}
                      </p>
                      {getLeadProjectLabel(qr.project_type) && (
                        <p className="text-sm font-semibold tracking-tight text-foreground leading-tight truncate">
                          {getLeadProjectLabel(qr.project_type)!.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {qr.id && (
                    <a
                      href={`/${locale}/leads/${qr.id}`}
                      className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 shrink-0"
                    >
                      View ↗
                    </a>
                  )}
                </div>
                {qr.description && (
                  <div className="px-5 py-3">
                    <p className="text-[13px] text-foreground/60 leading-[1.6] whitespace-pre-wrap break-words">
                      {qr.description}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Request-specific content */}
            {lead.estimated_value && (
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  {tLeads('estimatedValue')}
                </h3>
                <div className="text-2xl font-bold text-primary">
                  ${lead.estimated_value.toLocaleString(intlLocale(locale))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {lead.attachments && lead.attachments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  {tLeads('unified.attachments')}
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
        fromLead={(requestLeadId || isCallOrMessagesLead) ? {
          leadId: requestLeadId ?? undefined,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          projectType: projectTypeLabel || (isFrontlineVoice ? undefined : lead.service_type),
          // Quote-request description first; for call leads fall back to the call summary,
          // cleaned so it prefills as a project description rather than a call log.
          description: descriptionForPrefill,
          // Refine both quote-request descriptions and call summaries before they
          // become the saved project objective.
          enhanceOnOpen: !!(lead.description || lead.summary_text),
          estimatedValue: lead.estimated_value,
        } : undefined}
        onProjectCreated={(projectId) => {
          router.push(`/${locale}/projects/${projectId}`)
        }}
      />

      <NewQuoteDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        fromLead={{
          leadId: requestLeadId ?? undefined,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          projectType: projectTypeLabel || (isFrontlineVoice ? undefined : lead.service_type),
          description: descriptionForPrefill,
          measurements: lead.measurements,
          // Refine both quote-request descriptions and call summaries before they
          // become the saved quote description.
          enhanceOnOpen: !!(lead.description || lead.summary_text),
        }}
        onConfirm={(ctx) => {
          if (quoteClientId == null) return
          setQuotePrefill({
            clientId: quoteClientId,
            title: ctx.title,
            description: ctx.description,
            projectType: ctx.projectType,
            measurements: ctx.measurements,
          })
          router.push(`/${locale}/quotes/new?clientId=${quoteClientId}`)
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
              {tLeads('unified.actions.clientPortal')}
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
