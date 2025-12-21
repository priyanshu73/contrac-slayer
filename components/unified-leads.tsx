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
import { useTranslations } from "next-intl"
import { Search, Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Send, AlertCircle } from "lucide-react"

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
  source?: string
}

export function UnifiedLeads() {
  const { user, getContractorAISpId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const t = useTranslations('search')
  const tFilters = useTranslations('filters')
  
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
  }, [leads, activeTab, statusFilter, searchTerm])

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
      
      // Combine and deduplicate by phone number (normalize for comparison)
      const normalizePhone = (phone: string | undefined) => {
        if (!phone) return ''
        return phone.replace(/\D/g, '') // Remove all non-digits
      }
      
      // Deduplicate call leads by normalized phone number
      const seenCallPhones = new Set<string>()
      const uniqueCallLeads = callLeads.filter(lead => {
        const normalized = normalizePhone(lead.phone)
        if (!normalized || seenCallPhones.has(normalized)) {
          return false
        }
        seenCallPhones.add(normalized)
        return true
      })
      
      // Combine and sort
      const combined = [...requestLeads, ...uniqueCallLeads]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setLeads(combined)
      setLoadingCallLeads(false)
    } catch (err: any) {
      console.error('Failed to fetch leads:', err)
      setError(err.message || "Failed to load leads")
      setLoading(false)
      setLoadingCallLeads(false)
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
        priority: lead.priority >= 8 ? 'high' : lead.priority >= 5 ? 'medium' : 'low'
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

      const transformedLeads = ((response as any).leads || []).map((lead: any) => {
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

    // Extract the numeric ID from the lead ID (e.g., "call-123" -> "123")
    const numericId = leadId.replace('call-', '')
    
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
  }, [leadDetailsCache])

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
        } else {
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
      {/* Header */}
      <header className="flex-shrink-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Back to list button on mobile when lead is selected */}
            {selectedLead ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setSelectedLeadId(null)
                  setHasUserClearedSelection(true)
                }}
                className="lg:hidden h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" asChild className="md:hidden h-8 w-8">
                <a href="/">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              </Button>
            )}
            {/* Mobile: Dropdown filter - always visible */}
            <div className="md:hidden">
              <Select value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'requests' | 'calls')}>
                <SelectTrigger className="h-8 w-auto border-none bg-transparent p-0 text-sm font-semibold text-muted-foreground shadow-none focus:ring-0 hover:bg-transparent">
                  <SelectValue>
                    {activeTab === 'all' ? `${tFilters('all')} ${counts.all}` : activeTab === 'requests' ? `Requests ${counts.requests}` : `Calls ${counts.calls}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tFilters('all')} {counts.all}</SelectItem>
                  <SelectItem value="requests">Requests {counts.requests}</SelectItem>
                  <SelectItem value="calls">Calls {counts.calls}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Desktop: Filter buttons - always visible */}
            <div className="hidden md:flex gap-1">
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="text-xs md:text-sm h-8 md:h-9"
              >
                {tFilters('all')} <span className="ml-1 md:ml-2 text-[10px] md:text-xs">{counts.all}</span>
              </Button>
              <Button
                variant={activeTab === 'requests' ? 'default' : 'ghost'}
                size="sm" 
                onClick={() => setActiveTab('requests')}
                className="text-xs md:text-sm h-8 md:h-9"
              >
                Requests <span className="ml-1 md:ml-2 text-[10px] md:text-xs">{counts.requests}</span>
              </Button>
              <Button
                variant={activeTab === 'calls' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('calls')}
                className="text-xs md:text-sm h-8 md:h-9"
              >
                Calls <span className="ml-1 md:ml-2 text-[10px] md:text-xs">{counts.calls}</span>
              </Button>
            </div>
          </div>
          {/* New button - always visible */}
          <Button asChild size="sm" className="h-8 md:h-10">
            <a href="/quote-request/new">New</a>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 md:px-4 py-3 md:py-6 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-6 h-full">
          {/* Left Panel - Leads List */}
          <div className={`lg:col-span-2 ${selectedLead ? 'hidden lg:block' : 'block'} h-full min-h-0`}>
            <Card className="h-full flex flex-col overflow-hidden">
              {/* Search */}
              <div className="p-2 md:p-4 border-b flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchLeads')}
                    className="pl-8 md:pl-10 h-8 md:h-10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 text-center text-destructive flex-shrink-0">
                  <p className="text-sm">{error}</p>
                  <Button onClick={fetchAllLeads} className="mt-2" variant="outline" size="sm">
                    Retry
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
              <Badge 
                variant="outline" 
                className={`text-[10px] md:text-xs px-1.5 md:px-2 ${lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}`}
              >
                {lead.type === 'call' ? '📞 Call' : '📝 Request'}
              </Badge>
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
      <div className="flex-1 flex gap-3 md:gap-6 overflow-hidden min-h-0">
        {lead.type === 'call' ? (
          <>
            {/* Middle - Conversation History (for call leads) */}
            <div className="flex-1 border-r bg-muted/10 hidden lg:flex lg:flex-col min-h-0">
              <div className="p-3 md:p-4 border-b bg-background flex-shrink-0">
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                  Conversation History
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground">Live chat messages</p>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
                <ConversationMessages phoneNumber={lead.phone || ''} />
              </div>
            </div>

            {/* Right Side - Lead Details (for call leads) */}
            <div className="w-80 overflow-y-auto space-y-4 md:space-y-6 p-3 md:p-6 min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                  Contact Information
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {lead.phone && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs md:text-sm flex-1 min-w-0 truncate">{lead.phone}</span>
                      <Button size="sm" variant="outline" asChild className="ml-auto h-7 md:h-9 text-xs md:text-sm px-2 md:px-3 shrink-0">
                        <a href={`tel:${lead.phone}`}>Call</a>
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

              {/* AI Summary */}
              {lead.description && (
                <div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                    AI Summary
                  </h3>
                  <div className="p-2.5 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500">
                    <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{lead.description}</p>
                  </div>
                </div>
              )}

              {/* Lead Transcript Verification Banner */}
              {(lead.transcript_text || lead.formatted_transcript_text) && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 mb-2">
                  <div className="text-xs text-green-700 dark:text-green-400">
                    ✅ <strong>Transcript Isolation Verified:</strong> This lead ({lead.name}, {lead.phone}) has its own transcript data
                    <div className="mt-1 text-[10px] opacity-75">
                      Lead ID: {lead.id} | 
                      Has Formatted: {!!lead.formatted_transcript_text ? 'Yes' : 'No'} | 
                      Has Raw: {!!lead.transcript_text ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              )}



              {/* Call History with Transcripts */}
              <CallHistorySection 
                key={`call-history-${lead.phone}-${lead.id}`} 
                phoneNumber={lead.phone || ''} 
                currentLeadId={lead.id} 
              />

              {/* Mobile Conversation View */}
              <div className="lg:hidden">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Conversation History
                </h3>
                <Card className="max-h-64 overflow-hidden">
                  <ConversationMessages phoneNumber={lead.phone || ''} />
                </Card>
              </div>
            </div>
          </>
        ) : (
          /* Left Side - Lead Details (for request leads) */
          <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 p-3 md:p-6 min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
            {/* Contact Information */}
            <div>
              <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                Contact Information
              </h3>
              <div className="space-y-2 md:space-y-3">
                {lead.phone && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs md:text-sm flex-1 min-w-0 truncate">{lead.phone}</span>
                    <Button size="sm" variant="outline" asChild className="ml-auto h-7 md:h-9 text-xs md:text-sm px-2 md:px-3 shrink-0">
                      <a href={`tel:${lead.phone}`}>Call</a>
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

            {/* Project Description */}
            {lead.description && (
              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide text-muted-foreground">
                  Project Description
                </h3>
                <div className="p-2.5 md:p-4 rounded-lg bg-muted/50">
                  <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{lead.description}</p>
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
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 md:p-6 border-t bg-muted/20 flex-shrink-0">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {lead.phone && (
            <Button variant="default" asChild className="flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={`tel:${lead.phone}`}>
                <Phone className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                Call Customer
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
                View Quote
              </a>
            </Button>
          ) : (
            <Button variant="outline" asChild className="flex-1 h-9 md:h-10 text-xs md:text-sm">
              <a href={
                lead.type === 'request' 
                  ? `/quotes/new?leadId=${lead.id.replace('request-', '')}`
                  : `/quotes/new?callLeadId=${lead.id.replace('call-', '')}`
              }>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Quote
              </a>
            </Button>
          )}
        </div>
        
        {lead.status === 'NEW' && (
          <Button 
            variant="outline"
            onClick={() => {
              console.log('Mark as contacted:', lead.id)
            }}
            className="w-full mt-2 h-10"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark as Contacted
          </Button>
        )}
        
        {lead.type === 'request' && (
          <div className="mt-2 md:mt-3">
            <Button variant="ghost" asChild className="w-full h-8 md:h-10 text-xs md:text-sm">
              <a href={`/leads/${lead.id.replace('request-', '')}`}>
                View Full Details →
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
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (phoneNumber) {
      loadMessages()
    } else {
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
      
      // Normalize phone number for comparison (remove formatting)
      const normalizePhone = (phone: string) => {
        return phone.replace(/\D/g, '') // Remove all non-digits
      }
      
      const normalizedTargetPhone = normalizePhone(phoneNumber)
      
      // Find conversation by matching customer phone number
      const conversation = (conversationsResponse as any).conversations?.find((conv: any) => {
        const customerPhone = conv.customer?.phone_number || ''
        const normalizedCustomerPhone = normalizePhone(customerPhone)
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

  return (
    <div className="space-y-3 p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.sender_type === 'service_provider' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
              msg.sender_type === 'service_provider'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.message_text}</p>
            {msg.translated_text && msg.translated_text !== msg.message_text && (
              <p className={`text-xs mt-2 italic opacity-75 border-t pt-2 ${
                msg.sender_type === 'service_provider' 
                  ? 'text-primary-foreground/70 border-primary-foreground/20' 
                  : 'text-muted-foreground border-border'
              }`}>
                Translation: {msg.translated_text}
              </p>
            )}
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${
                msg.sender_type === 'service_provider' 
                  ? 'text-primary-foreground/70' 
                  : 'text-muted-foreground'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
              {msg.status && msg.sender_type === 'service_provider' && (
                <span className={`text-xs ml-2 ${
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
      ))}
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
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRawTranscript, setShowRawTranscript] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastPhoneNumber, setLastPhoneNumber] = useState<string>('')

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

      console.log('🔍 Loading call history ONLY for phone:', phoneNumber, 'SP:', spId)

      // Fetch leads filtered by this specific phone number ONLY
      const response = await contractorAI.getLeads({
        sp_id: spId.toString(),
        phone_number: phoneNumber, // This ensures we ONLY get leads for this phone number
        per_page: 1000
      })

      console.log('📞 Call history API response for phone', phoneNumber, ':', response)

      // Additional safety check: Ensure all returned leads match the requested phone number
      const historyItems: CallHistoryItem[] = ((response as any).leads || [])
        .filter((lead: any) => {
          // Normalize phone numbers for comparison to handle formatting differences
          const normalizePhone = (phone: string) => phone.replace(/\D/g, '')
          const leadPhoneNormalized = normalizePhone(lead.phone_number || '')
          const requestedPhoneNormalized = normalizePhone(phoneNumber)
          
          const matches = leadPhoneNormalized === requestedPhoneNormalized
          if (!matches) {
            console.warn('⚠️ FILTERING OUT lead with mismatched phone:', {
              leadId: lead.id,
              leadPhone: lead.phone_number,
              leadPhoneNormalized,
              requestedPhone: phoneNumber,
              requestedPhoneNormalized,
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
      setShowRawTranscript(false)
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
          <span className="text-sm font-medium">Call History & Transcripts</span>
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
          {/* Call History List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Select Call
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
              {callHistory.map((call) => {
                const dateTime = formatDateTime(call.created_at)
                const isSelected = selectedCallId === call.id
                const hasFormatted = !!call.formatted_transcript_text
                const hasRaw = !!call.transcript_text
                
                return (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary' 
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{dateTime.full}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {hasFormatted && hasRaw ? 'Formatted + Raw' : hasFormatted ? 'Formatted' : hasRaw ? 'Raw' : 'No transcript'}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-2 h-2 w-2 rounded-full bg-primary shrink-0"></div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Call Transcript */}
          {selectedCall && hasTranscript && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transcript for {phoneNumber}
                </h4>
                {selectedCall.formatted_transcript_text && selectedCall.transcript_text && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={!showRawTranscript ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowRawTranscript(false)}
                      className="h-7 text-xs"
                    >
                      Formatted
                    </Button>
                    <Button
                      variant={showRawTranscript ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowRawTranscript(true)}
                      className="h-7 text-xs"
                    >
                      Raw
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Safety verification banner */}
              {selectedCall.phone_number && selectedCall.phone_number !== phoneNumber && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  ⚠️ WARNING: Transcript phone mismatch! Expected: {phoneNumber}, Got: {selectedCall.phone_number}
                </div>
              )}
              
              <div className="bg-muted/30 p-3 rounded-lg max-h-96 overflow-y-auto">
                {showRawTranscript && selectedCall.transcript_text ? (
                  <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">
                    {selectedCall.transcript_text}
                  </pre>
                ) : selectedCall.formatted_transcript_text ? (
                  <div className="space-y-2">
                    {renderFormattedTranscript(selectedCall.formatted_transcript_text)}
                  </div>
                ) : selectedCall.transcript_text ? (
                  <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">
                    {selectedCall.transcript_text}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">No transcript available</p>
                )}
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
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
              </div>
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
