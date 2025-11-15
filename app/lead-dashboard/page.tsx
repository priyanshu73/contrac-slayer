"use client"

import { useState, useEffect } from "react"
import LeadInbox from "@/components/lead-inbox"
import ConversationPanel from "@/components/conversation-panel" 
import LeadSummary from "@/components/lead-summary"
import Header from "@/components/header"

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

export default function LeadDashboardPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize dashboard
    setLoading(false)
  }, [])

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header language={language} setLanguage={setLanguage} />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header language={language} setLanguage={setLanguage} />
      
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Lead Inbox - Left Column */}
          <div className="lg:col-span-1">
            <LeadInbox
              selectedLead={selectedLead}
              onSelectLead={handleSelectLead}
              language={language}
            />
          </div>

          {/* Conversation Panel - Middle Column */}
          <div className="lg:col-span-1">
            <ConversationPanel
              lead={selectedLead}
              language={language}
            />
          </div>

          {/* Lead Summary - Right Column */}
          <div className="lg:col-span-1">
            <LeadSummary
              lead={selectedLead}
              language={language}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
