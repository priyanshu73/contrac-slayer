"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"
import { PRICING_FEATURE_KEYS, PRICING_OFFER } from "@/lib/pricing-offer"
import { PricingPromo } from "@/components/pricing-promo"

export function Pricing() {
  const locale = useLocale()
  const t = useTranslations("billing")
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)
  const features = PRICING_FEATURE_KEYS.map((key) => t(`features.${key}`))

  return (
    <section id="pricing" className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <PricingPromo />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t("pricingTitle")}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("pageSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-9 max-w-[960px] mx-auto items-start">
          {(["monthly", "yearly"] as const).map((plan) => {
            const isYearly = plan === "yearly"
            return (
              <Card key={plan} className={`p-10 relative ${isYearly ? "border-primary border-2 bg-primary/5" : ""}`}>
                {isYearly && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-lg">{t("bestValue")}</span>
                  </div>
                )}
                <div className="mb-9 pt-2">
                  <h3 className="text-2xl font-semibold mb-2">{t(plan)}</h3>
                  <p className="text-muted-foreground">{t(isYearly ? "yearlyDescription" : "monthlyDescription")}</p>
                </div>
                <div className="flex items-baseline gap-3 mb-2.5">
                  <span className="text-2xl font-semibold text-muted-foreground line-through decoration-red-500/70 decoration-2">
                    ${isYearly ? PRICING_OFFER.monthly : PRICING_OFFER.regularMonthly}
                  </span>
                  <span className="text-[3.5rem] leading-none font-extrabold tracking-tight">${isYearly ? PRICING_OFFER.yearlyMonthlyEquivalent : PRICING_OFFER.monthly}</span>
                  <span className="text-muted-foreground text-lg">{t("perMonth")}</span>
                </div>
                <p className="mb-2 text-sm font-semibold">{t("launchSaleTerm")}</p>
                <p className="text-sm text-muted-foreground">
                  {isYearly ? t("billedAnnually", { amount: PRICING_OFFER.yearly }) : t("monthlyBillingNote")}
                </p>
                <span className="mt-4 inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {isYearly
                    ? t("yearlySavings", { amount: PRICING_OFFER.yearlySavings, percent: PRICING_OFFER.yearlySavingsPercent })
                    : t("monthlySavings", { amount: PRICING_OFFER.monthlySavings })}
                </span>
                <Button className="w-full my-8" size="lg" variant={isYearly ? "default" : "outline"} asChild>
                  <Link href={signupUrl}>{t("startFreeTrial")}</Link>
                </Button>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">{t("includedInBoth")}</p>
                <ul className="space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
        <p className="mt-14 text-center text-muted-foreground">{t("trialFooter")}</p>
      </div>
    </section>
  )
}
