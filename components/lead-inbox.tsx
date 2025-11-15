'use client'

import { Search, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { contractorAI } from '@/lib/api'

interface Lead {
  id: string
  name: string
  phone_number: string
  status: 'new' | 'active' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  service_type?: string
  location?: string
  summary_text?: string
  transcript_text?: string
  last_message_preview?: string
  last_contact_date: string
  conversation_count: number
  service_provider_name?: string
  summary_confirmed?: boolean
  appointment_link_sent?: boolean
  media_uploaded?: boolean
}

interface LeadInboxProps {
  selectedLead: Lead | null
  onSelectLead: (lead: Lead) => void
  language: string
}

export default function LeadInbox({ selectedLead, onSelectLead, language }: LeadInboxProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const title = language === 'en' ? 'Lead Inbox' : 'Bandeja de Entrada'
  const searchPlaceholder = language === 'en' ? 'Search leads...' : 'Buscar clientes...'

  // Load leads from contractor-ai API
  useEffect(() => {
    loadLeads()
    
    // Polling disabled for now
    // const pollInterval = setInterval(loadLeads, 30000) // Poll every 30 seconds
    // return () => clearInterval(pollInterval)
  }, [statusFilter])

  const loadLeads = async () => {
    try {
      console.log('🔄 LeadInbox: Starting to load leads...')
      setLoading(true)
      
      // Call contractor-ai API for leads
      console.log('🔄 LeadInbox: Calling contractorAI.getLeads with params:', {
        status: statusFilter === 'all' ? undefined : statusFilter,
        per_page: 1000
      })
      
      const response = await contractorAI.getLeads({
        status: statusFilter === 'all' ? undefined : statusFilter,
        per_page: 1000  // Request more rows to get all leads
      })
      
      console.log('✅ LeadInbox: Got response from contractor-ai:', response)
      
      // Transform API response to component format
      const apiLeads = (response as any).leads?.map((lead: any) => ({
        id: lead.id.toString(),
        name: lead.name || `Customer ${lead.phone_number?.slice(-4)}`,
        phone_number: lead.phone_number,
        status: lead.status,
        priority: lead.priority,
        service_type: lead.service_type,
        location: lead.location,
        summary_text: lead.summary_text,
        transcript_text: lead.transcript_text,
        last_message_preview: lead.last_message_preview,
        last_contact_date: lead.last_contact_date,
        conversation_count: lead.conversation_count || 0,
        service_provider_name: lead.service_provider_name,
        summary_confirmed: lead.summary_confirmed,
        appointment_link_sent: lead.appointment_link_sent,
        media_uploaded: lead.media_uploaded
      })) || []
      
      console.log('🔄 LeadInbox: Transformed leads:', apiLeads)
      setLeads(apiLeads)
      
    } catch (error) {
      console.error('❌ LeadInbox: Failed to load leads from contractor-ai:', error)
      
      // Show empty state if API fails
      setLeads([])
    } finally {
      setLoading(false)
      console.log('🔄 LeadInbox: Finished loading leads')
    }
  }

  const getStatusIcon = (status: Lead['status'], priority: Lead['priority']) => {
    if (status === 'new') {
      return priority === 'urgent' || priority === 'high' ? 
        <Zap className="h-4 w-4 text-red-500" /> : 
        <AlertCircle className="h-4 w-4 text-accent" />
    }
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`
    }
  }

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase()
    return (
      lead.name?.toLowerCase().includes(searchLower) ||
      lead.phone_number.includes(searchTerm) ||
      lead.service_type?.toLowerCase().includes(searchLower) ||
      lead.location?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <div className="text-sm text-muted-foreground">
            {filteredLeads.length} leads
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'new', 'active', 'completed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p>{language === 'en' ? 'Loading leads...' : 'Cargando clientes...'}</p>
              </div>
            ) : searchTerm ? (
              'No leads match your search'
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p>{language === 'en' ? 'No call interactions found' : 'No se encontraron interacciones'}</p>
                <p className="text-xs">{language === 'en' ? 'Leads will appear here when customers call' : 'Los clientes aparecerán aquí cuando llamen'}</p>
              </div>
            )}
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={`cursor-pointer border-b border-border p-4 transition-colors hover:bg-secondary ${
                selectedLead?.id === lead.id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getStatusIcon(lead.status, lead.priority)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-semibold truncate ${
                      lead.status === 'new' ? 'text-accent' : 'text-foreground'
                    }`}>
                      {lead.name || `Customer ${lead.phone_number.slice(-4)}`}
                    </h3>
                    <div className="flex items-center gap-1">
                      {lead.priority === 'urgent' && (
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      )}
                      {lead.priority === 'high' && (
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-1">
                    {lead.service_type} • {lead.conversation_count} messages
                  </p>
                  
                  {lead.last_message_preview && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {lead.last_message_preview}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {getTimestamp(lead.last_contact_date)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
