'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPhoneForDisplay } from '@/lib/utils'
import { Phone, MessageSquare } from 'lucide-react'

export function AIConversationPreview() {
  const t = useTranslations('landing')
  const messages = [
    {
      type: 'call' as const,
      timestamp: '10:23 AM',
      content: t('leadCaptureCallContent'),
      speaker: 'Sarah Johnson',
      phone: '(512) 555-0198',
    },
    {
      type: 'ai-analysis' as const,
      content: t('leadCaptureAnalysis'),
      tags: [t('leadCaptureTagHigh'), t('leadCaptureTagResidential'), t('leadCaptureTagAustin')],
    },
    {
      type: 'text' as const,
      timestamp: '10:25 AM',
      content: t('leadCaptureAiMessage'),
      sender: 'ContractorOps',
      status: t('leadCaptureDelivered'),
    },
    {
      type: 'text' as const,
      timestamp: '10:31 AM',
      content: t('leadCaptureSarahReply'),
      sender: 'Sarah Johnson',
      status: t('leadCaptureReceived'),
    },
  ]
  
  return (
    <Card className="shadow-xl border-2 hover:shadow-2xl transition-shadow bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{t('leadCaptureTitle')}</h3>
          <Badge variant="secondary" className="bg-accent/10 text-accent">{t('leadCaptureLive')}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t('leadCaptureSubtitle')}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            {msg.type === 'call' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{t('leadCaptureIncomingCall')} - {msg.timestamp}</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 border-l-4 border-accent">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{msg.speaker}</p>
                      <p className="text-xs text-muted-foreground">{formatPhoneForDisplay(msg.phone)}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
            
            {msg.type === 'ai-analysis' && (
              <div className="rounded-xl bg-white dark:bg-gray-900/90 shadow-lg border border-gray-200/80 dark:border-gray-700/80 overflow-hidden max-w-[320px]">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('leadCaptureNotificationTitle')}</span>
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{msg.content}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.tags?.map((tag, j) => (
                      <span key={j} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {msg.type === 'text' && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{msg.sender} - {msg.timestamp}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{msg.status}</Badge>
                </div>
                <div className={`rounded-lg p-3 ${
                  msg.sender === 'ContractorOps' 
                    ? 'bg-primary/10 border border-primary/20 ml-4' 
                    : 'bg-muted/50 mr-4'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">{t('leadCaptureAutoResponded')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
