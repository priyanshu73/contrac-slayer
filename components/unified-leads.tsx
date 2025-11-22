"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api, contractorAI } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { Search, Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Send } from "lucide-react"

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
  
  // Timestamps
  created_at: string
  last_contact_date?: string
  
  // Call-specific data
  conversation_count?: number
  last_message_preview?: string
  transcript_text?: string
  summary_text?: string
  summary_confirmed?: boolean
  appointment_link_sent?: boolean
  media_uploaded?: boolean
  
  // Request-specific data
  attachments?: Array<{ id: number }>
  source?: string
}

export function UnifiedLeads() {
  const { user, getContractorAISpId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<UnifiedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  
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

  // Auto-select first lead if none selected and we have leads
  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0 && !loading) {
      setSelectedLeadId(filteredLeads[0].id)
    }
  }, [selectedLeadId, filteredLeads, loading])

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
      
      const [requestLeads, callLeads] = await Promise.all([
        fetchRequestLeads(),
        fetchCallLeads()
      ])
      
      const combined = [...requestLeads, ...callLeads]
      // Sort by most recent first
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setLeads(combined)
    } catch (err: any) {
      console.error('Failed to fetch leads:', err)
      setError(err.message || "Failed to load leads")
    } finally {
      setLoading(false)
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

  const fetchCallLeads = async (): Promise<UnifiedLead[]> => {
    try {
      const spId = getContractorAISpId()
      if (!spId) return []

      const response = await contractorAI.getLeads({
        sp_id: spId.toString(),
        per_page: 1000
      })

      const transformedLeads = ((response as any).leads || []).map((lead: any) => {
        console.log('🔄 Processing call lead:', {
          id: lead.id,
          name: lead.name,
          transcript_length: lead.transcript_text?.length || 0,
          has_transcript: !!lead.transcript_text,
          summary_length: lead.summary_text?.length || 0
        })
        
        return {
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
          summary_text: lead.summary_text,
          summary_confirmed: lead.summary_confirmed,
          appointment_link_sent: lead.appointment_link_sent,
          media_uploaded: lead.media_uploaded,
          address: lead.location
        }
      })
      
      console.log('✅ Transformed call leads with transcripts:', transformedLeads.filter((lead: UnifiedLead) => lead.transcript_text).length)
      return transformedLeads
    } catch (error) {
      console.error('Failed to fetch call leads:', error)
      return []
    }
  }

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
        return "bg-blue-500/10 text-blue-500"
      case "CONTACTED":
        return "bg-yellow-500/10 text-yellow-600"
      case "QUOTED":
        return "bg-purple-500/10 text-purple-600"
      case "CONVERTED":
        return "bg-green-500/10 text-green-600"
      case "LOST":
        return "bg-red-500/10 text-red-600"
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

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600">Medium</Badge>
      default:
        return null
    }
  }


  const selectedLead = leads.find(lead => lead.id === selectedLeadId)
  
  // Debug selected lead transcript
  useEffect(() => {
    if (selectedLead?.type === 'call') {
      console.log('🎯 Selected call lead transcript info:', {
        leadId: selectedLead.id,
        name: selectedLead.name,
        hasTranscript: !!selectedLead.transcript_text,
        transcriptLength: selectedLead.transcript_text?.length || 0,
        hasSummary: !!selectedLead.summary_text,
        summaryLength: selectedLead.summary_text?.length || 0
      })
    }
  }, [selectedLead])
  
  const counts = getCounts()

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="md:hidden">
                <a href="/">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden min-h-0">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <a href="/">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-medium font-semibold text-muted-foreground">{counts.all} active leads</h2>
            </div>
          </div>
          <Button asChild>
            <a href="/quote-request/new">New</a>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* Left Panel - Leads List */}
          <div className={`lg:col-span-2 ${selectedLead ? 'hidden lg:block' : 'block'} h-full min-h-0`}>
            <Card className="h-full flex flex-col overflow-hidden">
              {/* Tab Navigation */}
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex gap-1 mb-4">
                  <Button
                    variant={activeTab === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('all')}
                    className="flex-1"
                  >
                    All <span className="ml-2 text-xs">{counts.all}</span>
                  </Button>
                  <Button
                    variant={activeTab === 'requests' ? 'default' : 'ghost'}
                    size="sm" 
                    onClick={() => setActiveTab('requests')}
                    className="flex-1"
                  >
                    Requests <span className="ml-2 text-xs">{counts.requests}</span>
                  </Button>
                  <Button
                    variant={activeTab === 'calls' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('calls')}
                    className="flex-1"
                  >
                    Calls <span className="ml-2 text-xs">{counts.calls}</span>
                  </Button>
                </div>

                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'all', label: 'All', count: counts.all },
                      { id: 'NEW', label: 'New', count: counts.new },
                      { id: 'CONTACTED', label: 'Contacted', count: counts.contacted },
                      { id: 'QUOTED', label: 'Quoted', count: counts.quoted },
                      { id: 'CONVERTED', label: 'Converted', count: counts.converted },
                    ].map((filter) => (
                      <Button
                        key={filter.id}
                        variant={statusFilter === filter.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(filter.id)}
                        className="shrink-0 text-xs"
                      >
                        {filter.label}
                        <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
                          {filter.count}
                        </span>
                      </Button>
                    ))}
                  </div>
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
                {filteredLeads.length === 0 && !error ? (
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
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`cursor-pointer border-b border-border p-4 transition-colors hover:bg-secondary ${
                        selectedLeadId === lead.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="text-sm font-semibold">{lead.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{lead.name}</h3>
                            <div className="flex items-center gap-1">
                              {getPriorityBadge(lead.priority)}
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}`}
                              >
                                {lead.type === 'call' ? '📞' : '📝'}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-1 truncate">
                            {lead.project_type || lead.service_type || "General inquiry"}
                          </p>
                          
                          {lead.phone && (
                            <p className="text-xs text-muted-foreground mb-1 truncate">{lead.phone}</p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
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
          <div className={`lg:col-span-3 ${selectedLead ? 'block' : 'hidden lg:block'} h-full min-h-0`}>
            {selectedLead ? (
              <LeadDetailsPanel 
                lead={selectedLead} 
                onClose={() => setSelectedLeadId(null)}
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
        return "bg-blue-500/10 text-blue-500"
      case "CONTACTED":
        return "bg-yellow-500/10 text-yellow-600"
      case "QUOTED":
        return "bg-purple-500/10 text-purple-600"
      case "CONVERTED":
        return "bg-green-500/10 text-green-600"
      case "LOST":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Back button for mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="lg:hidden shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-lg font-semibold">{lead.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold truncate">{lead.name}</h2>
              <Badge 
                variant="outline" 
                className={lead.type === 'call' ? 'text-blue-600' : 'text-purple-600'}
              >
                {lead.type === 'call' ? '📞 Call' : '📝 Request'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {lead.project_type || lead.service_type || "General inquiry"}
            </p>
          </div>
          <Badge className={getStatusColor(lead.status)}>
            {lead.status}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Side - Lead Details */}
        <div className="flex-1 overflow-y-auto space-y-6 p-6 min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Contact Information
            </h3>
            <div className="space-y-3">
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.phone}</span>
                  <Button size="sm" variant="outline" asChild className="ml-auto">
                    <a href={`tel:${lead.phone}`}>Call</a>
                  </Button>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-sm hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatTime(lead.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Project Description */}
          {lead.description && (
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                {lead.type === 'call' ? 'AI Summary' : 'Project Description'}
              </h3>
              <div className={`p-4 rounded-lg ${lead.type === 'call' ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500' : 'bg-muted/50'}`}>
                <p className="text-sm whitespace-pre-wrap">{lead.description}</p>
              </div>
            </div>
          )}

          {/* Call-specific content */}
          {lead.type === 'call' && (
            <>
              {/* Mobile Conversation View */}
              <div className="lg:hidden">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Conversation History
                </h3>
                <Card className="max-h-64 overflow-hidden">
                  <ConversationMessages phoneNumber={lead.phone || ''} />
                </Card>
              </div>

              {/* Mobile Automated Messages */}
              <div className="lg:hidden">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Automated Actions
                </h3>
                <div className="space-y-2">
                  {lead.summary_confirmed ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Summary confirmed
                    </div>
                  ) : (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      ⏳ Summary pending confirmation
                    </div>
                  )}
                  
                  {lead.appointment_link_sent ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Appointment link sent
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      📅 Appointment link not sent
                    </div>
                  )}
                  
                  {lead.media_uploaded ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Media uploaded
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      📎 No media uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Full Transcript */}
              {lead.transcript_text && (
                <div className="lg:hidden">
                  <TranscriptSection transcript={lead.transcript_text} />
                </div>
              )}
            </>
          )}

          {/* Request-specific content */}
          {lead.type === 'request' && (
            <>
              {/* Estimated Value */}
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
            </>
          )}
        </div>

        {/* Right Side - Conversation & Messages (for call leads) */}
        {lead.type === 'call' && (
          <div className="w-80 border-l bg-muted/10 hidden lg:flex lg:flex-col min-h-0">
            {/* Conversation Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b bg-background flex-shrink-0">
                <h3 className="font-semibold text-sm">Conversation History</h3>
                <p className="text-xs text-muted-foreground mt-1">Live chat messages</p>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ maxHeight: '100%' }}>
                <ConversationMessages phoneNumber={lead.phone || ''} />
              </div>
            </div>

            {/* Automated Messages Section */}
            <div className="border-t bg-background flex-shrink-0">
              <div className="p-4">
                <h4 className="font-semibold text-sm mb-2">Automated Actions</h4>
                <div className="space-y-2">
                  {lead.summary_confirmed ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Summary confirmed
                    </div>
                  ) : (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      ⏳ Summary pending confirmation
                    </div>
                  )}
                  
                  {lead.appointment_link_sent ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Appointment link sent
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      📅 Appointment link not sent
                    </div>
                  )}
                  
                  {lead.media_uploaded ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ Media uploaded
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      📎 No media uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full Transcript (Collapsible) */}
            {lead.transcript_text && (
              <TranscriptSection transcript={lead.transcript_text} />
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t bg-muted/20 flex-shrink-0">
        <div className="flex flex-wrap gap-3">
          {lead.phone && (
            <Button variant="default" asChild className="flex-1">
              <a href={`tel:${lead.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call Customer
              </a>
            </Button>
          )}
          <Button variant="outline" asChild className="flex-1">
            <a href={
              lead.type === 'request' 
                ? `/quotes/new?leadId=${lead.id.replace('request-', '')}`
                : `/quotes/new?callLeadId=${lead.id.replace('call-', '')}`
            }>
              Create Quote
            </a>
          </Button>
          {lead.status === 'NEW' && (
            <Button 
              variant="outline"
              onClick={() => {
                // Mark as contacted logic would go here
                console.log('Mark as contacted:', lead.id)
              }}
              className="flex-1"
            >
              Mark Contacted
            </Button>
          )}
        </div>
        
        {lead.type === 'request' && (
          <div className="mt-3">
            <Button variant="ghost" asChild className="w-full">
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
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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

// Transcript Section Component (for sidebar)
interface TranscriptSectionProps {
  transcript: string
}

function TranscriptSection({ transcript }: TranscriptSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-t bg-background">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Full Transcript</span>
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
            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">
              {transcript}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// Transcript Toggle Section Component (for main area)
interface TranscriptToggleSectionProps {
  transcript?: string
  leadId: string
  hasSummary: boolean
  messageCount: number
  onRefresh: () => void
}

function TranscriptToggleSection({ 
  transcript, 
  leadId, 
  hasSummary, 
  messageCount, 
  onRefresh 
}: TranscriptToggleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // If no transcript, show minimal collapsed state only
  if (!transcript) {
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
            Transcript
          </h3>
          <Badge variant="secondary" className="text-xs">
            {transcript.length} chars
          </Badge>
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
            <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
              {transcript}
            </pre>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>Auto-generated from phone conversation</span>
          </div>
        </div>
      )}
    </div>
  )
}
