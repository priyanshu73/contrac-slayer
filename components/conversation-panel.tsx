'use client'

import { Send, Paperclip, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useRef } from 'react'
import { contractorAI } from '@/lib/api'

interface Message {
  id: string
  sender_type: 'customer' | 'service_provider'
  message_text: string
  translated_text?: string
  timestamp: string
  status: 'sent' | 'delivered' | 'failed' | 'received'
}

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

interface ConversationPanelProps {
  lead: Lead | null
  language: string
}

export default function ConversationPanel({ lead, language }: ConversationPanelProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const title = language === 'en' ? 'Conversation' : 'Conversación'
  const placeholder = language === 'en' ? 'Type your message...' : 'Escribe tu mensaje...'
  const sendingText = language === 'en' ? 'Sending...' : 'Enviando...'

  // Load messages when lead changes - DISABLED FOR NOW
  // useEffect(() => {
  //   if (lead) {
  //     loadMessages(lead.id)
  //   } else {
  //     setMessages([])
  //     setConversationId(null)
  //   }
  // }, [lead])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up polling for real-time message updates - DISABLED FOR NOW
  // useEffect(() => {
  //   if (!conversationId) return

  //   const pollInterval = setInterval(() => {
  //     if (lead) {
  //       loadMessages(lead.id, false) // Don't show loading for polling updates
  //     }
  //   }, 5000) // Poll every 5 seconds for messages

  //   return () => clearInterval(pollInterval)
  // }, [conversationId, lead])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async (leadId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      
      // Get conversation for this lead first
      const conversationsResponse = await contractorAI.getConversations({
        // TODO: Add service provider ID filter when we have auth context
        status: 'active'
      })
      
      // Find conversation for this lead (by matching customer data)
      const conversation = (conversationsResponse as any).conversations?.find((conv: any) => 
        conv.customer?.id.toString() === leadId || conv.customer?.phone_number === lead?.phone_number
      )
      
      if (conversation) {
        setConversationId(conversation.id.toString())
        
        // Load messages for this conversation
        const messagesResponse = await contractorAI.getConversationMessages(conversation.id.toString(), {
          per_page: 50
        })
        
        // Transform API response to component format
        const apiMessages = (messagesResponse as any).messages?.map((msg: any) => ({
          id: msg.id.toString(),
          sender_type: msg.sender_type,
          message_text: msg.message_text,
          translated_text: msg.translated_text,
          timestamp: msg.timestamp,
          status: msg.status
        })) || []
        
        setMessages(apiMessages)
      } else {
        // No conversation found, set empty state
        setMessages([])
        setConversationId(null)
      }
      
    } catch (error) {
      console.error('Failed to load messages from contractor-ai:', error)
      
      // Fallback to mock data if API fails
      const mockMessages: Message[] = [
        {
          id: '1',
          sender_type: 'customer',
          message_text: 'We need a plumber for next Tuesday morning',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          status: 'received'
        },
        {
          id: '2',
          sender_type: 'service_provider',
          message_text: 'I can help with that. What time works best?',
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          status: 'delivered'
        },
        {
          id: '3',
          sender_type: 'customer',
          message_text: 'Between 8 AM and 12 PM would be ideal',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          status: 'received'
        }
      ]

      // Filter messages for this lead (mock behavior)
      const leadMessages = leadId === '1' ? mockMessages : []
      setMessages(leadMessages)
      setConversationId(leadId) // Mock conversation ID
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !conversationId || sending) return

    const messageText = message.trim()
    setMessage('')
    setSending(true)

    try {
      // Optimistic update - add message immediately
      const tempId = `temp-${Date.now()}`
      const tempMessage: Message = {
        id: tempId,
        sender_type: 'service_provider',
        message_text: messageText,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }

      setMessages(prev => [...prev, tempMessage])

      // Send message via contractor-ai API
      const response = await contractorAI.sendMessage(conversationId, messageText)
      
      // Update the temporary message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { 
              ...msg, 
              id: (response as any).id?.toString() || `msg-${Date.now()}`, 
              status: (response as any).status || 'delivered' as const,
              timestamp: (response as any).timestamp || tempMessage.timestamp
            }
          : msg
      ))

    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Update message status to failed
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('temp-') 
          ? { ...msg, status: 'failed' as const }
          : msg
      ))
      
      // TODO: Show error toast
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return '✓'
      case 'delivered':
        return '✓✓'
      case 'failed':
        return '✗'
      default:
        return ''
    }
  }

  if (!lead) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-center">
          <div className="mb-4 mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            {language === 'en' ? 'Select a lead to start chatting' : 'Selecciona un cliente para comenzar'}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'en' 
              ? 'Choose a conversation from the inbox to view and send messages'
              : 'Elige una conversación de la bandeja para ver y enviar mensajes'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {lead.name || `Customer ${lead.phone_number.slice(-4)}`}
            </h2>
            <p className="text-sm text-muted-foreground">{lead.phone_number}</p>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{language === 'en' ? 'No messages yet' : 'No hay mensajes aún'}</p>
            <p className="text-sm mt-1">
              {language === 'en' 
                ? 'Start the conversation by sending a message below'
                : 'Inicia la conversación enviando un mensaje abajo'
              }
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'service_provider' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                  msg.sender_type === 'service_provider'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                {msg.translated_text && (
                  <p className="text-xs mt-1 opacity-75 italic">
                    Translation: {msg.translated_text}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    msg.sender_type === 'service_provider' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTimestamp(msg.timestamp)}
                  </p>
                  {msg.sender_type === 'service_provider' && (
                    <span className={`text-xs ml-2 ${
                      msg.status === 'failed' ? 'text-red-300' : 'text-primary-foreground/70'
                    }`}>
                      {getMessageStatusIcon(msg.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={sending ? sendingText : placeholder}
            className="flex-1"
            disabled={sending}
          />
          <Button 
            onClick={sendMessage}
            size="icon" 
            className="bg-primary hover:bg-primary/90"
            disabled={!message.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {sending && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
            {sendingText}
          </p>
        )}
      </div>
    </div>
  )
}
