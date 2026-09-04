"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Sparkles, Zap, Shield, Clock, Star } from "lucide-react"

export default function BillingPage() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("billing")
  const tLanding = useTranslations("landing")
  const { user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState<"monthly" | "yearly" | null>(null)
  const [error, setError] = useState("")

  const includedInBoth = [
    tLanding("pricingBasic1"),
    tLanding("pricingBasic2"),
    tLanding("pricingBasic3"),
    tLanding("pricingBasic4"),
    tLanding("pricingBasic5"),
    tLanding("pricingWebsite"),
  ]

  const yearlyExclusive = [
    tLanding("pricingPremium6"),
    tLanding("pricingPremium7"),
    tLanding("pricingPremium8"),
    tLanding("pricingPremium9"),
  ]

  useEffect(() => {
    if (!loading && user?.has_access) {
      router.push(`/${locale}/dashboard`)
    }
  }, [user, loading, router, locale])

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

      window.location.href = result.url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout"
      setError(message)
      setIsLoading(null)
    }
  }

  const FeatureList = ({
    items,
    checkClass = "text-primary",
  }: {
    items: string[]
    checkClass?: string
  }) => (
    <ul className="space-y-2.5">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm">
          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${checkClass}`} strokeWidth={2.5} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24 md:pb-6">
      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="text-center mb-8 md:mb-12">
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

        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-start">
          <Card className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{t("monthly")}</h2>
              <p className="text-muted-foreground text-sm">{t("monthlyDescription")}</p>
            </div>

            <div className="mb-6">
              {/* Display only — keep in sync with Stripe STRIPE_MONTHLY_PRICE_ID */}
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$99</span>
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

            <div className="pt-6 border-t">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                {t("includedInBoth")}
              </p>
              <FeatureList items={includedInBoth} />
            </div>
          </Card>

          <Card className="p-6 md:p-8 relative border-primary bg-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                {t("bestValue")}
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h2 className="text-xl font-semibold mb-2">{t("yearly")}</h2>
              <p className="text-muted-foreground text-sm">{t("yearlyDescription")}</p>
            </div>

            <div className="mb-6">
              {/* Display only — keep in sync with Stripe STRIPE_YEARLY_PRICE_ID ($900/yr = $75/mo) */}
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$75</span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t("billedAnnually")}</p>
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

            <div className="space-y-4 pt-6 border-t">
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                  {t("includedInBoth")}
                </p>
                <FeatureList items={includedInBoth} />
              </div>
              <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="h-3 w-3 text-emerald-700" strokeWidth={2.5} />
                  <p className="text-[10px] font-semibold tracking-wide text-emerald-800 uppercase">
                    {t("yearlyExclusive")}
                  </p>
                </div>
                <FeatureList items={yearlyExclusive} checkClass="text-emerald-700" />
              </div>
            </div>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
          {t("trialFooter")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-center mt-10">
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
