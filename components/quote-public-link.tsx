"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface QuotePublicLinkProps {
  jobId: number
  currentPublicLink?: string
  onLinkGenerated?: (link: string) => void
  contractorHasSigned?: boolean
}

export function QuotePublicLink({ jobId, currentPublicLink, onLinkGenerated, contractorHasSigned = true }: QuotePublicLinkProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [publicLink, setPublicLink] = useState<string | null>(currentPublicLink || null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (currentPublicLink) {
      setPublicLink(currentPublicLink)
    }
  }, [currentPublicLink])

  const generatePublicLink = async () => {
    try {
      setGenerating(true)
      const link = await api.generateQuotePublicLink(jobId)
      setPublicLink(link)
      
      if (onLinkGenerated) {
        onLinkGenerated(link)
      }
      toast({
        title: "Public Link Generated!",
        description: "Quote is now ready to share with your customer.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to generate link",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!publicLink) return

    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${frontendUrl}/quotes/${publicLink}`

    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast({
        title: "Link Copied!",
        description: "Quote link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }

  const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const fullUrl = publicLink ? `${frontendUrl}/quotes/${publicLink}` : ""

  return (
    <Card className="p-4 w-full border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/50 to-sky-50/50">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="font-semibold text-gray-900">Customer Quote Link</h3>
        </div>
        
        {!publicLink ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Generate a public link to share this quote with your customer. They can view and sign the quote without logging in.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button 
                    onClick={generatePublicLink} 
                    disabled={generating || !contractorHasSigned}
                    className="w-full"
                  >
                    {generating ? "Generating..." : "Generate Public Link"}
                  </Button>
                </div>
              </TooltipTrigger>
              {!contractorHasSigned && (
                <TooltipContent>
                  <p>Please sign the quote first before generating a public link.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Share this link with your customer. They can view and sign the quote without logging in.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200 font-mono text-sm break-all">
                {fullUrl}
              </div>
              <Button 
                onClick={handleCopy} 
                variant="outline"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Format: <code className="bg-gray-100 px-1 py-0.5 rounded">{frontendUrl}/quotes/{"{uuid}"}</code>
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}


