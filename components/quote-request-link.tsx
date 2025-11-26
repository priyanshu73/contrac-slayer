"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export function QuoteRequestLink() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Get contractor ID from profile
  const contractorId = user?.contractor_profile?.id
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const quoteRequestUrl = contractorId ? `${frontendUrl}/quote-request/${contractorId}` : ""

  const handleCopy = async () => {
    if (!quoteRequestUrl) return

    try {
      await navigator.clipboard.writeText(quoteRequestUrl)
      setCopied(true)
      toast({
        title: "Link Copied!",
        description: "Quote request link has been copied to your clipboard.",
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

  if (!contractorId) {
    return null
  }

  return (
    <Card className="p-4 md:p-5 border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/50 to-sky-50/50 w-full sm:w-auto sm:max-w-2xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-800">Quote Request Form</h3>
            <p className="text-xs text-gray-600">Copy link to share with customers</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 min-w-0 rounded-md border border-dashed border-blue-300 bg-white/80 px-3 py-2 text-xs font-mono text-gray-700 break-all sm:break-normal overflow-hidden">
            {quoteRequestUrl}
          </div>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="shrink-0 border-blue-300 hover:bg-blue-50 hover:border-blue-400 sm:w-auto w-full"
            title="Copy link"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-green-600">Copied</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-blue-600">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

