"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, contractorAI } from "@/lib/api"
import type { Measurements } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations, useLocale } from "next-intl"
import { Phone, MessageSquare, ChevronDown, ChevronUp, Send, Languages, Loader2, RotateCcw, Link2, Sparkles } from "lucide-react"
import { parseApiUtcDate } from "@/lib/frontline-datetime"
import { isFrontlineVoiceLead, normalizePhoneToE164, translateWithCache, formatTranscriptTranslation } from "@/lib/lead-core"
import { intlLocale, type LeadT } from "@/lib/lead-labels"

function extractUrls(text: string, t: LeadT): { cleanText: string; urls: Array<{ href: string; label: string }> } {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const urls: Array<{ href: string; label: string }> = []
  const cleanText = text.replace(urlRegex, (url) => {
    let label = t('unified.link.generic')
    if (/\/quote-request\//i.test(url) || /\/request\//i.test(url)) label = t('unified.link.estimateRequest')
    else if (/\/book\//i.test(url) || /\/booking\//i.test(url)) label = t('unified.link.bookAppointment')
    urls.push({ href: url, label })
    return ''
  }).replace(/\s{2,}/g, ' ').trim()
  return { cleanText, urls }
}

// Conversation Messages Component for Call Leads
interface ConversationMessagesProps {
  phoneNumber: string
}
export function ConversationMessages({ phoneNumber }: ConversationMessagesProps) {
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
        apiMessages.sort((a: any, b: any) => (parseApiUtcDate(a.timestamp)?.getTime() ?? 0) - (parseApiUtcDate(b.timestamp)?.getTime() ?? 0))

        console.log('✅ Loaded', apiMessages.length, 'messages')
        setMessages(apiMessages)
      } else {
        console.log('⚠️ No conversation found for phone:', phoneNumber)
        setMessages([])
      }
    } catch (err: any) {
      console.error('❌ Failed to load messages:', err)
      setError(err.message || tLeads('unified.conv.loadFailed'))
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = parseApiUtcDate(timestamp)
    if (!date) return ""
    return date.toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="px-2 py-3 md:p-4 space-y-3">
        {/* Loading indicator with description */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{tLeads('unified.conv.loading')}</p>
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
        <p className="text-sm">{tLeads('unified.conv.none')}</p>
      </div>
    )
  }

  // Get sender label based on locale and translation state
  const getSenderLabel = (senderType: string): string => {
    if (senderType === 'service_provider') {
      return tLeads('unified.conv.contractor')
    }
    return tLeads('unified.conv.customer')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Translate All Header - only show when locale is 'es' */}
      {locale === 'es' && messages.length > 0 && (
        <div className="px-2 md:px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {allTranslated ? `✓ ${tTranslation('translated')}` : tLeads('unified.conv.messageCount', { count: messages.length })}
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
                  const { cleanText, urls } = extractUrls(displayText, tLeads)
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

export function CallHistorySection({ phoneNumber, currentLeadId }: CallHistorySectionProps) {
  const { getContractorAISpId } = useAuth()
  const locale = useLocale()
  const tTranslation = useTranslations('translation')
  const tLeads = useTranslations('leads')
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
            is_frontline_ai: isFrontlineVoiceLead(lead),
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
          (parseApiUtcDate(b.created_at)?.getTime() ?? 0) - (parseApiUtcDate(a.created_at)?.getTime() ?? 0)
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
    const date = parseApiUtcDate(dateString)
    if (!date) return { date: '', time: '', full: '' }
    return {
      date: date.toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const renderFormattedTranscript = (text: string, isTranslated: boolean = false) => {
    const lines = text.split('\n').filter(line => line.trim())

    // Get Spanish speaker labels
    const getDisplaySpeaker = (speaker: string): string => {
      const speakerLower = speaker.trim().toLowerCase()
      if (speakerLower.includes('contractor') || speakerLower.includes('contratista')) {
        return isTranslated || locale === 'es' ? tLeads('unified.conv.contractor') : 'Contractor'
      }
      if (speakerLower.includes('frontline') || speakerLower.includes('assistant')) {
        return tLeads('unified.conv.frontline')
      }
      if (speakerLower.includes('customer') || speakerLower.includes('client') || speakerLower.includes('cliente')) {
        return isTranslated || locale === 'es' ? tLeads('unified.conv.customer') : 'Customer'
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
          <span className="ml-2 text-sm text-muted-foreground">{tLeads('unified.calls.loading')}</span>
        </div>
      </div>
    )
  }

  if (callHistory.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{tLeads('unified.calls.none')}</p>
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
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{tLeads('callHistoryAndTranscripts')}</span>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {tLeads('unified.calls.count', { count: callHistory.length })}
          </Badge>
          {callHistory.some(call => call.is_frontline_ai) && (
            <Badge variant="outline" className="flex items-center gap-1 rounded-full border-sky-200 bg-sky-50 text-[10px] text-sky-700">
              <Sparkles className="h-3 w-3" />
              {tLeads('unified.source.frontlineVoice')}
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
                    return selected ? formatDateTime(selected.created_at).full : tLeads('unified.calls.selectCall')
                  })() : tLeads('unified.calls.selectCall')}
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
                  {tLeads('unified.calls.transcript')}
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
                  <p className="text-xs text-muted-foreground">{tLeads('unified.calls.noTranscript')}</p>
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
  const tLeads = useTranslations('leads')
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
            {isFormatted ? tLeads('unified.calls.callConversation') : tLeads('unified.calls.fullTranscript')}
          </span>
          {isFormatted && (
            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
              {tLeads('unified.calls.formatted')}
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
              <span>{tLeads('unified.calls.aiFormatted')}</span>
            ) : (
              <span>{tLeads('unified.calls.rawTranscript')}</span>
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
  const tLeads = useTranslations('leads')
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
          <span>{tLeads('unified.calls.transcript')}</span>
          <Badge variant="secondary" className="text-xs">
            {tLeads('unified.calls.notAvailable')}
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
            {isFormatted ? tLeads('unified.calls.callConversation') : tLeads('unified.calls.transcript')}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {tLeads('unified.calls.chars', { count: displayTranscript.length })}
          </Badge>
          {isFormatted && (
            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
              {tLeads('unified.calls.formatted')}
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
            <span>{isFormatted ? tLeads('unified.calls.aiFormatted') : tLeads('unified.calls.autoGenerated')}</span>
          </div>
        </div>
      )}
    </div>
  )
                    }
