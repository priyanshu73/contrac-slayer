import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, MessageSquare } from 'lucide-react'

export function AIConversationPreview() {
  const messages = [
    {
      type: 'call',
      timestamp: '10:23 AM',
      content: 'Hi, I need some landscaping work done for my backyard. About 500 sq ft of mulch and new edging.',
      speaker: 'Sarah Johnson',
      phone: '(512) 555-0198',
    },
    {
      type: 'ai-analysis',
      content: 'Lead captured: Landscaping project, 500 sq ft mulch + edging',
      tags: ['High Priority', 'Residential', 'Austin Area'],
    },
    {
      type: 'text',
      timestamp: '10:25 AM',
      content: 'Hi Sarah! Thanks for reaching out. I\'d love to help with your backyard project. I can schedule a free estimate this week—how about Thursday at 2 PM?',
      sender: 'ContractPro AI',
      status: 'Delivered',
    },
    {
      type: 'text',
      timestamp: '10:31 AM',
      content: 'Thursday at 2 works perfect! See you then.',
      sender: 'Sarah Johnson',
      status: 'Received',
    },
  ]
  
  return (
    <Card className="shadow-xl border-2 hover:shadow-2xl transition-shadow bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">AI Lead Capture</h3>
          <Badge variant="secondary" className="bg-accent/10 text-accent">Live</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Real-time conversation monitoring</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            {msg.type === 'call' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Incoming Call - {msg.timestamp}</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 border-l-4 border-accent">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{msg.speaker}</p>
                      <p className="text-xs text-muted-foreground">{msg.phone}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
            
            {msg.type === 'ai-analysis' && (
              <div className="rounded-lg bg-primary/5 p-3 border border-primary/20">
                <div className="flex items-start gap-2 mb-2">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">{msg.content}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.tags?.map((tag, j) => (
                        <Badge key={j} variant="secondary" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
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
                  msg.sender === 'ContractPro AI' 
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
          <p className="text-xs text-muted-foreground">AI auto-responded in 2 minutes</p>
        </div>
      </CardContent>
    </Card>
  )
}
