"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { formatPhoneForDisplay, cn } from "@/lib/utils"
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

  // Depend on contractorUuid (primitive) so we only fetch once per profile.
  // Using [user] would re-run when auth sets a new user object reference and cause a second fetch.
  useEffect(() => {
    if (!contractorUuid) {
      setStatsLoading(false)
      return
    }
    fetchStats()
  }, [contractorUuid])

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

  const glassCard =
    "rounded-lg border border-white/30 dark:border-white/10 bg-white/25 dark:bg-white/5 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300"

  /* Unified desktop card layout: flex-col, icon row, primary text, secondary text */
  const desktopCardLayout = "md:flex md:flex-col md:min-h-[7.5rem] md:gap-3 md:p-4"

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {/* Phone Number Card - full width on mobile; 1 of 4 on desktop */}
      <div className="col-span-2 md:col-span-1 min-w-0">
        {phoneLoading ? (
          <Card className={cn("p-3 h-full", desktopCardLayout, glassCard)}>
            <div className="flex items-center gap-3 md:items-start md:justify-between">
              <div className="h-10 w-10 shrink-0 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-shimmer bg-[length:200%_100%]" />
              <div className="flex-1 h-9 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] md:hidden" />
              <div className="h-9 w-9 shrink-0 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
            </div>
            <div className="hidden md:flex md:flex-col md:gap-1">
              <div className="h-7 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
              <div className="h-4 w-28 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
            </div>
          </Card>
        ) : (
          <Card className={cn("p-3 h-full", desktopCardLayout, glassCard)}>
            <div className="flex items-center gap-3 md:items-start md:justify-between">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center justify-center md:hidden">
                <p className="text-xl font-bold tracking-tight truncate max-w-full">
                  {twilioNumber ? formatPhoneForDisplay(twilioNumber) : tPhone('notSet')}
                </p>
                <p className="text-sm text-muted-foreground">{tPhone('subtitle')}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyPhone}
                disabled={!twilioNumber}
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground md:ml-auto"
                title={tQuote('copy')}
              >
                {phoneCopied ? (
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
            </div>
            <div className="hidden md:flex md:flex-col md:gap-1">
              <p className="text-2xl font-bold tracking-tight truncate">
                {twilioNumber ? formatPhoneForDisplay(twilioNumber) : tPhone('notSet')}
              </p>
              <p className="text-sm text-muted-foreground">{tPhone('subtitle')}</p>
            </div>
          </Card>
        )}
      </div>

      {/* Quote Request Form Card - equal width on desktop; hidden on mobile */}
      <Card className={cn("col-span-2 md:col-span-1 hidden md:block p-4 min-w-0 h-full cursor-pointer rounded-lg border border-white/30 dark:border-white/10 bg-sky-50/30 dark:bg-sky-950/15 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 order-3 md:order-2 relative", desktopCardLayout)} onClick={handleCopyLink}>
        <div className="flex flex-col h-full md:gap-3 md:min-h-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
            <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-2xl font-bold tracking-tight text-sky-700 line-clamp-2">{tQuote('title')}</p>
          <p className="text-sm text-muted-foreground">{tQuote('shareWithCustomers')}</p>
          {linkCopied && (
            <svg className="h-5 w-5 text-green-600 shrink-0 absolute top-4 right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </Card>

      {/* Active Jobs Card - equal width in grid */}
      {statsLoading ? (
        <Card className={cn("p-4 min-w-0 h-full order-2 md:order-3", desktopCardLayout, glassCard)}>
          <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-3">
            <div className="h-10 w-10 shrink-0 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-shimmer bg-[length:200%_100%]" />
            <div className="space-y-1 flex-1 min-w-0 md:w-full">
              <div className="h-8 w-12 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] md:h-7" />
              <div className="h-4 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] ml-auto md:ml-0" />
            </div>
          </div>
        </Card>
      ) : (
        <Card className={cn("p-4 min-w-0 h-full order-2 md:order-3", desktopCardLayout, glassCard)}>
          <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums md:leading-tight">{stats?.active_jobs ?? 0}</p>
            <p className="text-sm text-muted-foreground">{t('activeJobs')}</p>
          </div>
        </Card>
      )}

      {/* Revenue Card - equal width in grid */}
      {statsLoading ? (
        <Card className={cn("p-4 min-w-0 h-full order-4", desktopCardLayout, glassCard)}>
          <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-3">
            <div className="h-10 w-10 shrink-0 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-shimmer bg-[length:200%_100%]" />
            <div className="space-y-1 flex-1 min-w-0 md:w-full">
              <div className="h-8 w-16 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] md:h-7" />
              <div className="h-4 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] ml-auto md:ml-0" />
            </div>
          </div>
        </Card>
      ) : (
        <Card className={cn("p-4 min-w-0 h-full order-4", desktopCardLayout, glassCard)}>
          <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums md:leading-tight">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats?.revenue ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">{t('paidQuotes')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

