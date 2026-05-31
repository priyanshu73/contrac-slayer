"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react"

export default function BillingSuccessPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("billing.success")
  const { user, refreshUser } = useAuth()
  const [isActivating, setIsActivating] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const maxPolls = 30 // Poll for up to 30 seconds

  useEffect(() => {
    // Poll for access status
    const checkAccess = async () => {
      try {
        await refreshUser()
      } catch (err) {
        console.error("Error refreshing user:", err)
      }
    }

    // If user already has access, stop polling
    if (user?.has_access) {
      setIsActivating(false)
      return
    }

    // Poll every second
    if (pollCount < maxPolls) {
      const timer = setTimeout(() => {
        checkAccess()
        setPollCount((c) => c + 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Stop polling after max attempts
      setIsActivating(false)
    }
  }, [user?.has_access, pollCount, refreshUser])

  const handleContinue = () => {
    router.push(`/${locale}/dashboard`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)] p-4">
      <Card className="relative w-full max-w-md overflow-hidden rounded-[28px] border-slate-200/80 bg-white/95 p-7 text-center shadow-[0_24px_90px_rgba(15,23,42,0.10)] ring-1 ring-white sm:p-8">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
        {isActivating && !user?.has_access ? (
          <>
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-950">{t("activating")}</h1>
            <p className="mb-6 text-sm leading-6 text-slate-500">
              {t("activatingDescription")}
            </p>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min((pollCount / maxPolls) * 100, 100)}%` }}
              />
            </div>
          </>
        ) : user?.has_access ? (
          <>
            <div className="mb-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              </div>
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("paymentReceived")}</span>
            </div>
            <h1 className="mb-3 text-3xl font-black tracking-tight text-slate-950">{t("welcomeAboard")}</h1>
            <p className="mx-auto mb-7 max-w-sm text-sm leading-6 text-slate-500">
              {t("subscriptionActive")}
              {user.stripe_subscription_status === "trialing" && (
                <span className="mt-3 block font-semibold text-slate-700">
                  {t("trialStarted")}
                </span>
              )}
            </p>
            <Button onClick={handleContinue} size="lg" className="h-12 w-full rounded-xl bg-slate-950 text-base font-bold text-white shadow-none transition-colors hover:bg-slate-800">
              <span>{t("goToDashboard")}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <CheckCircle2 className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-950">{t("paymentReceived")}</h1>
            <p className="mb-6 text-sm leading-6 text-slate-500">
              {t("paymentReceivedDescription")}
            </p>
            <div className="space-y-3">
              <Button onClick={handleContinue} size="lg" className="w-full">
                {t("goToDashboard")}
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                {t("refreshPage")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
