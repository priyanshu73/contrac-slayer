"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Sparkles, Zap, Shield, Clock } from "lucide-react"

export default function BillingPage() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("billing")
  const { user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState<"monthly" | "yearly" | null>(null)
  const [error, setError] = useState("")

  // Redirect to dashboard if user already has access
  useEffect(() => {
    if (!loading && user?.has_access) {
      router.push(`/${locale}/dashboard`)
    }
  }, [user, loading, router, locale])

  // Show loading while checking access
  if (loading || user?.has_access) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setIsLoading(plan)
    setError("")

    try {
      const baseUrl = window.location.origin
      const result = await api.createCheckoutSession({
        plan,
        success_url: `${baseUrl}/${locale}/billing/success`,
        cancel_url: `${baseUrl}/${locale}/billing`,
      })

      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (err: any) {
      setError(err.message || "Failed to start checkout")
      setIsLoading(null)
    }
  }

  const features = [
    t("features.aiQuoteGeneration"),
    t("features.realtimePricing"),
    t("features.unlimitedQuotes"),
    t("features.clientManagement"),
    t("features.leadTracking"),
    t("features.calendarIntegration"),
    t("features.emailNotifications"),
    t("features.mobileFriendly"),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24 md:pb-6">
      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            {t("freeTrial")}
          </div>
          <h1 className="hidden text-3xl md:block md:text-4xl font-bold mb-4">
            {t("pageTitle")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("pageSubtitle")}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {/* Monthly Plan */}
          <Card className="p-6 md:p-8 relative">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{t("monthly")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("monthlyDescription")}
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$139</span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>
            </div>

            <Button 
              className="w-full mb-6" 
              size="lg"
              variant="outline"
              onClick={() => handleSubscribe("monthly")}
              disabled={isLoading !== null}
            >
              {isLoading === "monthly" ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("processing")}
                </span>
              ) : (
                t("startFreeTrial")
              )}
            </Button>

            <ul className="space-y-3">
              {features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly Plan */}
          <Card className="p-6 md:p-8 relative border-primary bg-primary/5">
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                {t("bestValue")}
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h2 className="text-xl font-semibold mb-2">{t("yearly")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("yearlyDescription")}
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("billedAnnually")}
              </p>
            </div>

            <Button 
              className="w-full mb-6" 
              size="lg"
              onClick={() => handleSubscribe("yearly")}
              disabled={isLoading !== null}
            >
              {isLoading === "yearly" ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("processing")}
                </span>
              ) : (
                t("startFreeTrial")
              )}
            </Button>

            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">{t("trustBadges.freeTrial")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("trustBadges.freeTrialDescription")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">{t("trustBadges.cancelAnytime")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("trustBadges.cancelAnytimeDescription")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">{t("trustBadges.securePayments")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("trustBadges.securePaymentsDescription")}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
