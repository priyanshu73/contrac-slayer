"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { formatPhoneForDisplay } from "@/lib/utils"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"

interface Stats {
  active_jobs: number  // Sum of Accepted + Job In Progress
  revenue: number  // Sum of accepted_total_amount for jobs with status PAID
}

export function StatsCardsReal() {
  const { user } = useAuth()
  const t = useTranslations('dashboard.stats')
  const tPhone = useTranslations('dashboard.contractorOpsNumber')
  const tQuote = useTranslations('dashboard.quoteRequest')
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const { number: twilioNumber, loading: phoneLoading } = useContractorOpsNumber()
  const [phoneCopied, setPhoneCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const contractorUuid = user?.contractor_profile?.uuid
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const quoteRequestUrl = contractorUuid ? `${frontendUrl}/quote-request/${contractorUuid}` : ""

  useEffect(() => {
    // Only fetch stats if user has a contractor profile
    // This prevents errors when user hasn't created profile yet
    if (user?.contractor_profile) {
      fetchStats()
    } else {
      setStatsLoading(false)
    }
  }, [user])

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      // Use dedicated stats endpoint for efficient aggregated data
      const statsData = await api.getJobStats()
      setStats({
        active_jobs: statsData.active_jobs,
        revenue: statsData.total_revenue,
      })
    } catch (error) {
      // Silently handle errors - profile might not exist yet or other issues
      // Don't log to console to avoid cluttering production logs
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to fetch stats:", error)
      }
    } finally {
      setStatsLoading(false)
    }
  }

  const handleCopyPhone = async () => {
    if (!twilioNumber) return
    try {
      await navigator.clipboard.writeText(twilioNumber)
      setPhoneCopied(true)
      toast({
        title: tPhone("numberCopied"),
        description: tPhone("numberCopiedDesc"),
      })
      setTimeout(() => setPhoneCopied(false), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = async () => {
    if (!quoteRequestUrl) return
    try {
      await navigator.clipboard.writeText(quoteRequestUrl)
      setLinkCopied(true)
      toast({
        title: tQuote('linkCopied'),
        description: tQuote('linkCopiedDesc'),
      })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast({
        title: tQuote('copyFailed'),
        description: tQuote('copyFailedDesc'),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Phone Number Card */}
      {phoneLoading ? (
        <Card className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-24 animate-shimmer bg-[length:200%_100%]" />
              <div className="h-5 w-5 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
            </div>
            <div className="h-9 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-32 animate-shimmer bg-[length:200%_100%]" />
            <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-20 animate-shimmer bg-[length:200%_100%]" />
          </div>
        </Card>
      ) : (
        <Card className="p-5 hover:shadow-lg transition-all duration-300">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPhone}
                disabled={!twilioNumber}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {phoneCopied ? (
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {tQuote('copy')}
              </Button>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {twilioNumber ? formatPhoneForDisplay(twilioNumber) : tPhone('notSet')}
            </p>
            <p className="text-sm text-muted-foreground">{tPhone('subtitle')}</p>
          </div>
        </Card>
      )}

      {/* Quote Request Form Card - No loading, always instant */}
      <Card className="p-5 hover:shadow-lg transition-all duration-300 border-sky-200 bg-sky-50/30 cursor-pointer" onClick={handleCopyLink}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            {linkCopied && (
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <p className="text-lg font-semibold text-sky-700">{tQuote('title')}</p>
          <p className="text-sm text-muted-foreground">{tQuote('shareWithCustomers')}</p>
        </div>
      </Card>

      {/* Active Jobs Card */}
      {statsLoading ? (
        <Card className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-24 animate-shimmer bg-[length:200%_100%]" />
            </div>
            <div className="h-9 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-16 animate-shimmer bg-[length:200%_100%]" />
            <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-32 animate-shimmer bg-[length:200%_100%]" />
          </div>
        </Card>
      ) : (
        <Card className="p-5 hover:shadow-lg transition-all duration-300">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stats?.active_jobs ?? 0}</p>
            <p className="text-sm text-muted-foreground">
              {t('activeJobs')} <span className="text-xs">({t('acceptedAndInProgress')})</span>
            </p>
          </div>
        </Card>
      )}

      {/* Revenue Card */}
      {statsLoading ? (
        <Card className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-24 animate-shimmer bg-[length:200%_100%]" />
            </div>
            <div className="h-9 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-20 animate-shimmer bg-[length:200%_100%]" />
            <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-32 animate-shimmer bg-[length:200%_100%]" />
          </div>
        </Card>
      ) : (
        <Card className="p-5 hover:shadow-lg transition-all duration-300">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-emerald-600">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats?.revenue ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">{t('paidQuotes')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

