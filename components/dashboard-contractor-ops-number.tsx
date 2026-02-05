"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations, useLocale } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatPhoneForDisplay } from "@/lib/utils"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"

export function DashboardContractorOpsNumber() {
  const { user } = useAuth()
  const t = useTranslations("dashboard.contractorOpsNumber")
  const tQuote = useTranslations("dashboard.quoteRequest")
  const locale = useLocale()
  const { toast } = useToast()
  const { number: twilioNumber, loading } = useContractorOpsNumber()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!twilioNumber) return
    try {
      await navigator.clipboard.writeText(twilioNumber)
      setCopied(true)
      toast({
        title: t("numberCopied"),
        description: t("numberCopiedDesc"),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-16 bg-muted animate-pulse rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-muted-foreground shrink-0" aria-hidden>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{t("title")}</span>
              <span className="mx-1.5">—</span>
              <span>{t("description")}</span>
            </p>
            <p className="text-lg font-semibold tracking-tight truncate tabular-nums">
              {twilioNumber ? formatPhoneForDisplay(twilioNumber) : t("notSet")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {twilioNumber ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tQuote("copied")}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {tQuote("copy")}
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/settings`}>{t("setUp")}</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
