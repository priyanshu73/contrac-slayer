"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTranslations, useLocale } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function QuickActions() {
  const tActions = useTranslations('dashboard.actions')
  const tDashboard = useTranslations('dashboard')
  const tQuoteRequest = useTranslations('dashboard.quoteRequest')
  const locale = useLocale()
  const { user } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  const contractorUuid = user?.contractor_profile?.uuid
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const quoteRequestUrl = contractorUuid ? `${frontendUrl}/quote-request/${contractorUuid}` : ""

  const handleCopy = async () => {
    if (!quoteRequestUrl) return

    try {
      await navigator.clipboard.writeText(quoteRequestUrl)
      setCopied(true)
      toast({
        title: tQuoteRequest('linkCopied'),
        description: tQuoteRequest('linkCopiedDesc'),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: tQuoteRequest('copyFailed'),
        description: tQuoteRequest('copyFailedDesc'),
        variant: "destructive",
      })
    }
  }

  const actions = [
    {
      label: tActions('newLead'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      href: `/${locale}/leads`,
      type: 'link' as const,
    },
    {
      label: tActions('createQuote'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      href: `/${locale}/quotes/new`,
      type: 'link' as const,
    },
    {
      label: tActions('addClient'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
      href: `/${locale}/contacts/new`,
      type: 'link' as const,
    },
    {
      label: tQuoteRequest('title'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      onClick: () => setShowLinkDialog(true),
      type: 'button' as const,
    },
  ]

  return (
    <>
      <Card className="p-6 w-full">
        <h2 className="mb-5 text-lg font-semibold">{tDashboard('quickActions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action) => (
            action.type === 'link' ? (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-3 py-6 px-4 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                asChild
              >
                <Link href={action.href}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </Link>
              </Button>
            ) : (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-3 py-6 px-4 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                onClick={action.onClick}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Button>
            )
          ))}
        </div>
      </Card>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              {tQuoteRequest('title')}
            </DialogTitle>
            <DialogDescription>
              {tQuoteRequest('description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-mono text-gray-700 break-all">
                {quoteRequestUrl}
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="lg"
                className="shrink-0 border-blue-300 hover:bg-blue-50 hover:border-blue-400 sm:w-auto w-full"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">{tQuoteRequest('copied')}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-blue-600">{tQuoteRequest('copy')}</span>
                  </>
                )}
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">💡 Tip:</span> Share this link with potential customers so they can request quotes directly from you!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
