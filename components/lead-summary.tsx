'use client'

import { Zap, TrendingUp, Clock, MapPin, User, Phone, Briefcase, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

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

interface LeadSummaryProps {
  lead: Lead | null
  language: string
}

export default function LeadSummary({ lead, language }: LeadSummaryProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  
  if (!lead) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            {language === 'en' ? 'Lead Details' : 'Detalles del Cliente'}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'en' ? 'Select a lead to view details' : 'Selecciona un cliente para ver detalles'}
          </p>
        </div>
      </div>
    )
  }

  const summaryTitle = language === 'en' ? 'Lead Summary' : 'Resumen del Cliente'
  const aiTitle = language === 'en' ? 'Call Summary' : 'Resumen de Llamada'
  const transcriptTitle = language === 'en' ? 'Transcript' : 'Transcripción'
  const detailsTitle = language === 'en' ? 'Details' : 'Detalles'
  const contactTitle = language === 'en' ? 'Contact Information' : 'Información de Contacto'

  // Use actual summary text from call interaction, or generate fallback
  const getDisplaySummary = () => {
    if (lead.summary_text) {
      return lead.summary_text
    }
    
    // Fallback if no summary available
    const priorityText = {
      'urgent': language === 'en' ? 'Urgent priority' : 'Prioridad urgente',
      'high': language === 'en' ? 'High-priority' : 'Alta prioridad', 
      'medium': language === 'en' ? 'Medium-priority' : 'Prioridad media',
      'low': language === 'en' ? 'Low-priority' : 'Baja prioridad'
    }[lead.priority]

    const serviceText = lead.service_type ? 
      `${lead.service_type} ${language === 'en' ? 'request' : 'solicitud'}` :
      (language === 'en' ? 'service request' : 'solicitud de servicio')

    const statusText = {
      'new': language === 'en' ? 'New inquiry' : 'Nueva consulta',
      'active': language === 'en' ? 'Active case' : 'Caso activo',
      'completed': language === 'en' ? 'Completed service' : 'Servicio completado'
    }[lead.status]

    if (language === 'en') {
      return `${priorityText} ${serviceText}. ${statusText} requiring attention.`
    } else {
      return `${serviceText} de ${priorityText.toLowerCase()}. ${statusText} que requiere atención.`
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-700 border-red-200'
      case 'high': return 'bg-orange-500/10 text-orange-700 border-orange-200'
      case 'medium': return 'bg-blue-500/10 text-blue-700 border-blue-200'
      case 'low': return 'bg-gray-500/10 text-gray-700 border-gray-200'
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-green-500/10 text-green-700 border-green-200'
      case 'active': return 'bg-blue-500/10 text-blue-700 border-blue-200'
      case 'completed': return 'bg-gray-500/10 text-gray-700 border-gray-200'
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Call Summary Card */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">{aiTitle}</h3>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed mb-3">
          {getDisplaySummary()}
        </p>
        
        {/* Transcript Toggle */}
        {lead.transcript_text && (
          <div>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-800 transition-colors"
            >
              {showTranscript ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <FileText className="h-3 w-3" />
              {transcriptTitle}
            </button>
            
            {showTranscript && (
              <div className="mt-3 p-3 bg-white/60 rounded border border-blue-200">
                <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">
                  {lead.transcript_text}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Contact Information */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">{contactTitle}</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {lead.name || `Customer ${lead.phone_number.slice(-4)}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{lead.phone_number}</span>
          </div>
          
          {lead.service_type && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{lead.service_type}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Status & Priority */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {language === 'en' ? 'Priority' : 'Prioridad'}
            </span>
          </div>
          <Badge className={getPriorityColor(lead.priority)}>
            {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
          </Badge>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {language === 'en' ? 'Status' : 'Estado'}
            </span>
          </div>
          <Badge className={getStatusColor(lead.status)}>
            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
          </Badge>
        </Card>
      </div>

      {/* Activity Stats */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3">
          {language === 'en' ? 'Activity' : 'Actividad'}
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {language === 'en' ? 'Messages' : 'Mensajes'}
            </span>
            <span className="text-sm font-medium">{lead.conversation_count}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {language === 'en' ? 'Last Contact' : 'Último Contacto'}
            </span>
            <span className="text-sm font-medium">{formatDate(lead.last_contact_date)}</span>
          </div>
        </div>
      </Card>

      {/* Location & Service */}
      {lead.location && (
        <Card className="p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'en' ? 'Location' : 'Ubicación'}
              </p>
              <p className="text-sm font-medium text-foreground">{lead.location}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Last Message Preview */}
      {lead.last_message_preview && (
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-2">
            {language === 'en' ? 'Latest Message' : 'Último Mensaje'}
          </h3>
          <p className="text-sm text-muted-foreground italic">
            "{lead.last_message_preview}"
          </p>
        </Card>
      )}
    </div>
  )
}
